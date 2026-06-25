// services/sync/products/pricing-scheme-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getPricingSchemes } from "../data/pricing-schemes";
import { ProductPriceType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { syncProduct } from "./product.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class PricingSchemeSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize || 50; // Deep payloads; 50 balancing stability & roundtrips
    
    // Caches preserved across multiple pagination batches to maximize execution speed
    const verifiedCurrencyIds = new Set<string>();
    const verifiedProductIds = new Set<string>();

    let after: string | undefined = undefined;
    let totalProcessed = 0;
    
    console.log("Starting hyper-optimized batched pricing scheme sync...");

    while (true) {
      // 1. Fetch the paginated batch
      const batch = await getPricingSchemes(BATCH_SIZE, after);
      if (!batch || batch.length === 0) break;

      // 2. Wrap the chunk operations in a discrete database transaction block
      try {
        await prisma.$transaction(async (tx) => {
          /**
           * STEP A: Sync Currencies & Pricing Schemes for this Batch
           */
          for (const scheme of batch) {
            // Dynamic Currency Upsert utilizing nested payload fields
            if (scheme.currencyId && !verifiedCurrencyIds.has(scheme.currencyId)) {
              const curData = scheme.currency;
              
              await tx.currency.upsert({
                where: { inflowId: scheme.currencyId },
                create: {
                  inflowId: scheme.currencyId,
                  name: curData?.name || "Unknown Currency",
                  isoCode: curData?.isoCode || "USD",
                  symbol: curData?.symbol || "$",
                  decimalPlaces: curData?.decimalPlaces ?? 2,
                  decimalSeparator: curData?.decimalSeparator || ".",
                  thousandsSeparator: curData?.thousandsSeparator || ",",
                  isSymbolFirst: curData?.isSymbolFirst ?? true,
                  negativeType: curData?.negativeType || "leading",
                  // timestamp: curData?.timestamp || scheme.timestamp,
                },
                update: {
                  name: curData?.name || "Unknown Currency",
                  isoCode: curData?.isoCode || "USD",
                  symbol: curData?.symbol || "$",
                  decimalPlaces: curData?.decimalPlaces ?? 2,
                  decimalSeparator: curData?.decimalSeparator || ".",
                  thousandsSeparator: curData?.thousandsSeparator || ",",
                  isSymbolFirst: curData?.isSymbolFirst ?? true,
                  negativeType: curData?.negativeType || "leading",
                  // timestamp: curData?.timestamp || scheme.timestamp,
                },
              });
              verifiedCurrencyIds.add(scheme.currencyId);
            }

            // Core Pricing Scheme configuration mapping
            await tx.pricingScheme.upsert({
              where: { inflowId: scheme.pricingSchemeId },
              create: {
                inflowId: scheme.pricingSchemeId,
                currencyId: scheme.currencyId,
                name: scheme.name,
                isActive: scheme.isActive,
                isDefault: scheme.isDefault,
                isTaxInclusive: scheme.isTaxInclusive,
                // timestamp: scheme.timestamp,
              },
              update: {
                currencyId: scheme.currencyId,
                name: scheme.name,
                isActive: scheme.isActive,
                isDefault: scheme.isDefault,
                isTaxInclusive: scheme.isTaxInclusive,
                // timestamp: scheme.timestamp,
              },
            });
          }

          /**
           * STEP B: Sync Product Prices (Handling missing product records smoothly)
           */
          for (const scheme of batch) {
            const prices = scheme.productPrices ?? [];

            for (const price of prices) {
              // Self-healing check for the parent Product relation
              if (price.productId && !verifiedProductIds.has(price.productId)) {
                const prodData = price.product;

                if (prodData) {
                  const productExists = await tx.product.findUnique({
                    where: { inflowId: price.productId },
                    select: { inflowId: true },
                  });

                  if (!productExists) {
                    // Upsert/stub the product record to support foreign key reference assignments
                    await syncProduct(tx, prodData);
                    
                    verifiedProductIds.add(price.productId);
                  } else {
                    verifiedProductIds.add(price.productId);
                  }
                  
                } else {
                  console.warn(`Skipping price ${price.productPriceId} because nested product tree is absent.`);
                  continue;
                }
              }

              // Persist the actual targeted product price
              await tx.productPrice.upsert({
                where: { inflowId: price.productPriceId },
                create: {
                  inflowId: price.productPriceId,
                  pricingSchemeId: price.pricingSchemeId,
                  productId: price.productId,
                  priceType: this.mapPriceType(price.priceType),
                  unitPrice: price.unitPrice ? new Prisma.Decimal(price.unitPrice) : null,
                  fixedMarkup: price.fixedMarkup ? new Prisma.Decimal(price.fixedMarkup) : null,
                  // timestamp: price.timestamp,
                },
                update: {
                  pricingSchemeId: price.pricingSchemeId,
                  productId: price.productId,
                  priceType: this.mapPriceType(price.priceType),
                  unitPrice: price.unitPrice ? new Prisma.Decimal(price.unitPrice) : null,
                  fixedMarkup: price.fixedMarkup ? new Prisma.Decimal(price.fixedMarkup) : null,
                  // timestamp: price.timestamp,
                },
              });
            }
          }
        }, {
          timeout: 40000 // Extended window per batch block execution
        });
      } catch (transactionError) {
        console.error(`Transaction failed for pricing batch ending with ID ${after}:`, transactionError);
      }

      // 3. Move pagination variables forward
      after = batch[batch.length - 1].pricingSchemeId;
      totalProcessed += batch.length;
      
      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }
    }

    return {
      pricingSchemesProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }

  private mapPriceType(value: string): ProductPriceType {
    const cleanValue = value?.toLowerCase().trim() || "";
    if (cleanValue.includes("markup")) return ProductPriceType.markup;
    if (cleanValue.includes("margin")) return ProductPriceType.margin;
    return ProductPriceType.fixedPrice;
  }
}
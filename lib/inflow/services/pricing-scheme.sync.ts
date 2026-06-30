import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { ProductPriceType } from "@/generated/prisma/enums";
import { syncProduct } from "./product.sync";
import { InflowPricingScheme } from "../types";

type SyncContext = {
  verifiedCurrencyIds: Set<string>;
  verifiedProductIds: Set<string>;
};

/**
 * Maps incoming string price types to Prisma schema enums
 */
function mapPriceType(value: string): ProductPriceType {
  const cleanValue = value?.toLowerCase().trim() || "";
  if (cleanValue.includes("markup")) return ProductPriceType.markup;
  if (cleanValue.includes("margin")) return ProductPriceType.margin;
  return ProductPriceType.fixedPrice;
}

/**
 * Synchronizes a single pricing scheme record and all its nested attributes.
 * Expects to run inside an existing Prisma transaction context.
 */
export async function syncPricingScheme(
  tx: Prisma.TransactionClient,
  scheme: InflowPricingScheme,
  context: SyncContext = { verifiedCurrencyIds: new Set(), verifiedProductIds: new Set() }
) {
  const { verifiedCurrencyIds, verifiedProductIds } = context;

  /**
   * STEP 1: Sync Currency
   */
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
      },
    });
    
    verifiedCurrencyIds.add(scheme.currencyId);
  }

  /**
   * STEP 2: Sync Core Pricing Scheme
   */
  await tx.pricingScheme.upsert({
    where: { inflowId: scheme.pricingSchemeId },
    create: {
      inflowId: scheme.pricingSchemeId,
      currencyId: scheme.currencyId,
      name: scheme.name,
      isActive: scheme.isActive,
      isDefault: scheme.isDefault,
      isTaxInclusive: scheme.isTaxInclusive,
    },
    update: {
      currencyId: scheme.currencyId,
      name: scheme.name,
      isActive: scheme.isActive,
      isDefault: scheme.isDefault,
      isTaxInclusive: scheme.isTaxInclusive,
    },
  });

  /**
   * STEP 3: Sync Product Prices (with dynamic product recovery)
   */
  const prices = scheme.productPrices ?? [];

  for (const price of prices) {
    if (price.productId && !verifiedProductIds.has(price.productId)) {
      const prodData = price.product;

      if (prodData) {
        const productExists = await tx.product.findUnique({
          where: { inflowId: price.productId },
          select: { inflowId: true },
        });

        if (!productExists) {
          // Stub or sync the product record via imported sub-sync module
          await syncProduct(tx, prodData);
        }
        verifiedProductIds.add(price.productId);
      } else {
        console.warn(`Skipping price ${price.productPriceId} because nested product tree is absent.`);
        continue;
      }
    }

    // Persist the targeted pricing point
    await tx.productPrice.upsert({
      where: { inflowId: price.productPriceId },
      create: {
        inflowId: price.productPriceId,
        pricingSchemeId: price.pricingSchemeId,
        productId: price.productId,
        priceType: mapPriceType(price.priceType),
        unitPrice: price.unitPrice ? new Prisma.Decimal(price.unitPrice) : null,
        fixedMarkup: price.fixedMarkup ? new Prisma.Decimal(price.fixedMarkup) : null,
      },
      update: {
        pricingSchemeId: price.pricingSchemeId,
        productId: price.productId,
        priceType: mapPriceType(price.priceType),
        unitPrice: price.unitPrice ? new Prisma.Decimal(price.unitPrice) : null,
        fixedMarkup: price.fixedMarkup ? new Prisma.Decimal(price.fixedMarkup) : null,
      },
    });
  }
}
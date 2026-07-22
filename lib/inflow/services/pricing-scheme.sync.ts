import { Prisma } from "@/generated/prisma/client";
import { InflowPricingScheme } from "../types";
import { ensureCurrencyShell } from "./ensure.service";

type SyncContext = {
  verifiedCurrencyIds: Set<string>;
};

/**
 * Synchronizes a single pricing scheme record and all its nested attributes.
 * Expects to run inside an existing Prisma transaction context.
 */
export async function syncPricingScheme(
  tx: Prisma.TransactionClient,
  scheme: InflowPricingScheme,
  context: SyncContext = { verifiedCurrencyIds: new Set() }
) {
  const { verifiedCurrencyIds } = context;

  /**
   * STEP 1: Sync Currency
   */
  if (scheme.currencyId && !verifiedCurrencyIds.has(scheme.currencyId)) {
    await ensureCurrencyShell(tx, scheme.currency);
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
}

 /**
   * STEP 3: Sync Product Prices (with dynamic product recovery)
   */
  // const prices = scheme.productPrices ?? [];

  // for (const price of prices) {
  //   if (price.productId && !verifiedProductIds.has(price.productId)) {
  //     const prodData = price.product;

  //     if (prodData) {
  //       const productExists = await tx.product.findUnique({
  //         where: { inflowId: price.productId },
  //         select: { inflowId: true },
  //       });

  //       if (!productExists) {
  //         // Stub or sync the product record via imported sub-sync module
  //         await syncProduct(tx, prodData);
  //       }
  //       verifiedProductIds.add(price.productId);
  //     } else {
  //       console.warn(`Skipping price ${price.productPriceId} because nested product tree is absent.`);
  //       continue;
  //     }
  //   }

  //   // Persist the targeted pricing point
  //   await tx.productPrice.upsert({
  //     where: { inflowId: price.productPriceId },
  //     create: {
  //       inflowId: price.productPriceId,
  //       pricingSchemeId: price.pricingSchemeId,
  //       productId: price.productId,
  //       priceType: mapPriceType(price.priceType),
  //       unitPrice: price.unitPrice ? new Prisma.Decimal(price.unitPrice) : null,
  //       fixedMarkup: price.fixedMarkup ? new Prisma.Decimal(price.fixedMarkup) : null,
  //     },
  //     update: {
  //       pricingSchemeId: price.pricingSchemeId,
  //       productId: price.productId,
  //       priceType: mapPriceType(price.priceType),
  //       unitPrice: price.unitPrice ? new Prisma.Decimal(price.unitPrice) : null,
  //       fixedMarkup: price.fixedMarkup ? new Prisma.Decimal(price.fixedMarkup) : null,
  //     },
  //   });
  // }
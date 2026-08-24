// services/sync/products/vendor.sync.ts
import { Prisma } from "@/generated/prisma/client";
import { InflowAttachment } from "../types";

type Tx = Prisma.TransactionClient;

export type VendorSyncCaches = {
  verifiedPaymentTermsIds: Set<string>;
  verifiedCurrencyIds: Set<string>;
  verifiedTaxingSchemeIds: Set<string>;
  verifiedTeamMemberIds?: Set<string>;
  verifiedCategoryIds?: Set<string>;
  verifiedVendorIds?: Set<string>;
  verifiedProductIds?: Set<string>;
};

export interface InflowVendorItem {
  vendorItemId: string;
  cost: string | number | null;
  leadTimeDays: number | null;
  lineNum: number | null;
  productId: string;
  timestamp?: string;
  vendorId?: string;
  vendorItemCode: string | null;
}

export type InflowVendor = {
  inflowId: string;
  businessPartnerId: string;
  defaultCarrier: string | null;
  defaultPaymentMethod: string | null;
  discount: number | string | Prisma.Decimal | null;
  isTaxInclusivePricing: boolean;
  taxingSchemeId: string | null;
  defaultPaymentTermsId: string | null;
  defaultAddressId: string | null;
  lastModifiedById: string | null;
  currencyId: string | null;
  leadTimeDays: number | null;
  dues: Array<{
    inflowId: string;
    currencyId: string;
    amountCurrent: number | string | Prisma.Decimal;
    amount1To30: number | string | Prisma.Decimal;
    amount31To60: number | string | Prisma.Decimal;
    amount61Plus: number | string | Prisma.Decimal;
  }>;
  balances: Array<{
    inflowId: string;
    currencyId: string;
    balance: number | string | Prisma.Decimal;
  }>;
  credits: Array<{
    inflowId: string;
    currencyId: string;
    credit: number | string | Prisma.Decimal;
  }>;
  vendorItems?: InflowVendorItem[];
  attachments?: InflowAttachment[];
};

// Helper: Safely convert numeric values to Prisma.Decimal
const toDecimal = (val: string | number | null | undefined): Prisma.Decimal | null => {
  if (val === null || val === undefined || val === "") return null;
  return new Prisma.Decimal(val.toString());
};

/**
 * Syncs a single vendor payload into the local database using an ongoing Prisma transaction.
 */
export async function syncVendor(
  tx: Tx,
  vendor: InflowVendor,
  caches: VendorSyncCaches
) {
  // Initialize optional cache sets if omitted
  const verifiedProducts = (caches.verifiedProductIds ??= new Set<string>());

  /**
   * STEP 4: Child Vendor Ledger Profile Upsert
   */
  const vendorPayload = {
    currencyId: vendor.currencyId,
    defaultAddressId: vendor.defaultAddressId,
    defaultCarrier: vendor.defaultCarrier,
    defaultPaymentMethod: vendor.defaultPaymentMethod,
    defaultPaymentTermsId: vendor.defaultPaymentTermsId,
    discount: vendor.discount !== null && vendor.discount !== undefined
      ? new Prisma.Decimal(vendor.discount.toString())
      : null,
    isTaxInclusivePricing: vendor.isTaxInclusivePricing ?? false,
    leadTimeDays: vendor.leadTimeDays,
    taxingSchemeId: vendor.taxingSchemeId,
    lastModifiedById: vendor.lastModifiedById,
  };

  const syncedVendor = await tx.vendor.upsert({
    where: { inflowId: vendor.inflowId },
    create: {
      ...vendorPayload,
      inflowId: vendor.inflowId,
      businessPartnerId: vendor.businessPartnerId,
    },
    update: vendorPayload,
  });

  /**
   * STEP 5: Child Vendor Items Sync
   */
  if (vendor.vendorItems !== undefined) {
    await tx.vendorItem.deleteMany({ where: { vendorId: vendor.inflowId } });

    if (vendor.vendorItems?.length) {
      const validItemsToCreate = [];

      for (const item of vendor.vendorItems) {
        if (!item.vendorItemId) continue;

        let validProductId: string | null = null;

        if (item.productId) {
          if (verifiedProducts.has(item.productId)) {
            validProductId = item.productId;
          } else {
            const localProduct = await tx.product.findUnique({
              where: { inflowId: item.productId },
              select: { inflowId: true },
            });

            if (localProduct) {
              validProductId = localProduct.inflowId;
              verifiedProducts.add(localProduct.inflowId);
            }
          }
        }

        if (!validProductId) {
          console.warn(
            `[Sync Notification] Skipping vendor item "${item.vendorItemId}" because productId could not be resolved.`
          );
          continue;
        }

        validItemsToCreate.push({
          inflowId: item.vendorItemId,
          vendorId: vendor.inflowId,
          productId: validProductId,
          vendorSku: item.vendorItemCode,
          unitCost: toDecimal(item.cost),
          lineNum: item.lineNum || null,
          leadTimeDays: item.leadTimeDays || null,
        });
      }

      if (validItemsToCreate.length > 0) {
        await tx.vendorItem.createMany({
          data: validItemsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  /**
   * STEP 6: Financial Collections Sync
   */
  await tx.vendorDue.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
  if (vendor.dues?.length) {
    await tx.vendorDue.createMany({
      data: vendor.dues
        .filter((due) => due.currencyId)
        .map((due) => ({
          inflowId: due.inflowId,
          vendorId: vendor.inflowId,
          currencyId: due.currencyId,
          amountCurrent: new Prisma.Decimal(due.amountCurrent.toString()),
          amount1To30: new Prisma.Decimal(due.amount1To30.toString()),
          amount31To60: new Prisma.Decimal(due.amount31To60.toString()),
          amount61Plus: new Prisma.Decimal(due.amount61Plus.toString()),
        })),
    });
  }

  await tx.vendorBalance.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
  if (vendor.balances?.length) {
    await tx.vendorBalance.createMany({
      data: vendor.balances.map((bal) => ({
        inflowId: bal.inflowId,
        vendorId: vendor.inflowId,
        currencyId: bal.currencyId,
        balance: new Prisma.Decimal(bal.balance.toString()),
      })),
    });
  }

  await tx.vendorCredit.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
  if (vendor.credits?.length) {
    await tx.vendorCredit.createMany({
      data: vendor.credits.map((cred) => ({
        inflowId: cred.inflowId,
        vendorId: vendor.inflowId,
        currencyId: cred.currencyId,
        credit: new Prisma.Decimal(cred.credit.toString()),
      })),
    });
  }

  /**
   * STEP 7: Vendor Attachments Sync
   */
  await tx.vendorAttachment.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
  if (vendor.attachments?.length) {
    await tx.vendorAttachment.createMany({
      data: vendor.attachments.map((att: any) => ({
        inflowId: att.inflowId || att.vendorAttachmentId,
        vendorId: vendor.inflowId,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize,
        contentType: att.contentType,
      })),
    });
  }

  return syncedVendor;
}
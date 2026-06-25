// services/sync/products/vendor-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getVendors } from "../data/vendors";
import { ensurePaymentTermsShell } from "./helpers";
import { Prisma } from "@/generated/prisma/client";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class VendorSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    // Cross-batch tracking caches for FKEY safeguards
    const verifiedPaymentTermsIds = new Set<string>();
    const verifiedCurrencyIds = new Set<string>();

    console.log("Starting batched vendor sync matching shared BusinessPartner entity models...");

    while (true) {
      const vendors = await getVendors(BATCH_SIZE, after);

      if (!vendors || vendors.length === 0) {
        break;
      }

      await prisma.$transaction(
        async (tx) => {
          for (const vendor of vendors) {
            const cleanEmail = vendor.email?.trim().toLowerCase();

            /**
             * STEP 1: Inline Foreign Key Safety Check (Payment Terms & Currency)
             */
            if (vendor.defaultPaymentTermsId && !verifiedPaymentTermsIds.has(vendor.defaultPaymentTermsId)) {
              await ensurePaymentTermsShell(tx, {
                inflowId: vendor.defaultPaymentTermsId,
                name: `Terms Placeholder (${vendor.defaultPaymentTermsId.slice(0, 5)})`,
              });
              verifiedPaymentTermsIds.add(vendor.defaultPaymentTermsId);
            }

            if (vendor.currencyId && !verifiedCurrencyIds.has(vendor.currencyId)) {
              // Self-healing Currency stub if inline currency object isn't present
              await tx.currency.upsert({
                where: { inflowId: vendor.currencyId },
                create: {
                  inflowId: vendor.currencyId,
                  name: vendor.currency?.name || vendor.currency?.isoCode || "Fallback Currency",
                  isoCode: vendor.currency?.isoCode || "USD",
                  symbol: vendor.currency?.symbol || "$",
                },
                update: {},
              });
              verifiedCurrencyIds.add(vendor.currencyId);
            }

            /**
             * STEP 2: Upsert Parent BusinessPartner Profile row
             * Links uniquely back to this context via the tracked Customer/Vendor layout
             */
            const existingVendorWithPartner = await tx.vendor.findUnique({
              where: { inflowId: vendor.vendorId },
              select: { businessPartnerId: true },
            });

            const partner = await tx.businessPartner.upsert({
              where: {
                id: existingVendorWithPartner?.businessPartnerId ?? "NEVER_MATCH_GUID",
              },
              create: {
                name: vendor.name,
                contactName: vendor.contactName,
                email: cleanEmail,
                phone: vendor.phone,
                fax: vendor.fax,
                website: vendor.website,
                remarks: vendor.remarks,
                isActive: vendor.isActive ?? true,
              },
              update: {
                name: vendor.name,
                contactName: vendor.contactName,
                email: cleanEmail,
                phone: vendor.phone,
                fax: vendor.fax,
                website: vendor.website,
                remarks: vendor.remarks,
                isActive: vendor.isActive ?? true,
              },
            });

            /**
             * STEP 3: Business Partner Addresses Synced
             */
            if (vendor.addresses?.length) {
              for (const addr of vendor.addresses) {
                if (!addr.vendorAddressId) continue;
                await tx.businessPartnerAddress.upsert({
                  where: { inflowId: addr.vendorAddressId },
                  create: {
                    inflowId: addr.vendorAddressId,
                    businessPartnerId: partner.id,
                    name: addr.name || "Main Address",
                    address1: addr.address?.address1,
                    address2: addr.address?.address2,
                    city: addr.address?.city,
                    state: addr.address?.state,
                    country: addr.address?.country,
                    postalCode: addr.address?.postalCode,
                    remarks: addr.address?.remarks,
                    addressType: addr.address?.addressType,
                    // timestamp: addr.timestamp,
                  },
                  update: {
                    name: addr.name,
                    address1: addr.address?.address1,
                    address2: addr.address?.address2,
                    city: addr.address?.city,
                    state: addr.address?.state,
                    country: addr.address?.country,
                    postalCode: addr.address?.postalCode,
                    remarks: addr.address?.remarks,
                    addressType: addr.address?.addressType,
                    // timestamp: addr.timestamp,
                  },
                });
              }
            }

            /**
             * STEP 4: Child Vendor Ledger Profile Upsert
             */
            const syncedVendor = await tx.vendor.upsert({
              where: { inflowId: vendor.vendorId },
              create: {
                inflowId: vendor.vendorId,
                businessPartnerId: partner.id,
                currencyId: vendor.currencyId,
                defaultAddressId: vendor.defaultAddressId,
                defaultCarrier: vendor.defaultCarrier,
                defaultPaymentMethod: vendor.defaultPaymentMethod,
                defaultPaymentTermsId: vendor.defaultPaymentTermsId,
                discount: vendor.discount ? new Prisma.Decimal(vendor.discount) : null,
                isTaxInclusivePricing: vendor.isTaxInclusivePricing ?? false,
                leadTimeDays: vendor.leadTimeDays,
                taxingSchemeId: vendor.taxingSchemeId,
                lastModifiedById: vendor.lastModifiedById,
                lastModifiedDttm: vendor.lastModifiedDttm ? new Date(vendor.lastModifiedDttm) : null,
                // timestamp: vendor.timestamp,
              },
              update: {
                currencyId: vendor.currencyId,
                defaultAddressId: vendor.defaultAddressId,
                defaultCarrier: vendor.defaultCarrier,
                defaultPaymentMethod: vendor.defaultPaymentMethod,
                defaultPaymentTermsId: vendor.defaultPaymentTermsId,
                discount: vendor.discount ? new Prisma.Decimal(vendor.discount) : null,
                isTaxInclusivePricing: vendor.isTaxInclusivePricing ?? false,
                leadTimeDays: vendor.leadTimeDays,
                taxingSchemeId: vendor.taxingSchemeId,
                lastModifiedById: vendor.lastModifiedById,
                lastModifiedDttm: vendor.lastModifiedDttm ? new Date(vendor.lastModifiedDttm) : null,
                // timestamp: vendor.timestamp,
              },
            });

            /**
             * STEP 5: Child Vendor Items Sync (Mapping codes safely to schema fields)
             */
            if (vendor.vendorItems?.length) {
              for (const item of vendor.vendorItems) {
                if (!item.vendorItemId) continue;
                await tx.vendorItem.upsert({
                  where: { inflowId: item.vendorItemId },
                  create: {
                    inflowId: item.vendorItemId,
                    vendorId: vendor.vendorId,
                    productId: item.productId,
                    vendorSku: item.vendorItemCode, // incoming payload code maps to vendorSku
                    unitCost: item.cost ? new Prisma.Decimal(item.cost) : null, // incoming cost maps to unitCost
                    // timestamp: item.timestamp,
                  },
                  update: {
                    vendorSku: item.vendorItemCode,
                    unitCost: item.cost ? new Prisma.Decimal(item.cost) : null,
                    // timestamp: item.timestamp,
                  },
                });
              }
            }

            /**
             * STEP 6: Ledger Data Financial Collections (Dues, Balances, Credits)
             */
            await tx.vendorDue.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
            if (vendor.dues?.length) {
              await tx.vendorDue.createMany({
                data: vendor.dues.filter((due) => due.currencyId).map((due) => ({
                  inflowId: due.vendorDueId,
                  vendorId: vendor.vendorId,
                  currencyId: due.currencyId,
                  amountCurrent: new Prisma.Decimal(due.amountCurrent || 0),
                  amount1To30: new Prisma.Decimal(due.amount1To30 || 0),
                  amount31To60: new Prisma.Decimal(due.amount31To60 || 0),
                  amount61Plus: new Prisma.Decimal(due.amount61Plus || 0),
                })),
              });
            }

            await tx.vendorBalance.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
            if (vendor.balances?.length) {
              await tx.vendorBalance.createMany({
                data: vendor.balances.map((bal) => ({
                  inflowId: bal.vendorBalanceId,
                  vendorId: vendor.vendorId,
                  currencyId: bal.currencyId,
                  balance: new Prisma.Decimal(bal.balance || 0),
                })),
              });
            }

            await tx.vendorCredit.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
            if (vendor.credits?.length) {
              await tx.vendorCredit.createMany({
                data: vendor.credits.map((cred) => ({
                  inflowId: cred.vendorCreditId,
                  vendorId: vendor.vendorId,
                  currencyId: cred.currencyId,
                  credit: new Prisma.Decimal(cred.credit || 0),
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
                  inflowId: att.inflowId,
                  vendorId: vendor.vendorId,
                  fileName: att.fileName,
                  fileUrl: att.fileUrl,
                  fileSize: att.fileSize,
                  contentType: att.contentType,
                //   timestamp: att.timestamp,
                })),
              });
            }

            totalProcessed++;
          }
        },
        { timeout: 90000 }
      );

      after = vendors[vendors.length - 1].vendorId;
      if (options?.onProgress) await options.onProgress(totalProcessed);
      if (vendors.length < BATCH_SIZE) break;
    }

    return { vendorsProcessed: totalProcessed, syncedAt: new Date().toISOString() };
  }
}
// services/sync/products/vendor.sync.ts
import { Prisma } from "@/generated/prisma/client";
import { ensurePaymentTermsShell } from "./helpers";
import { InflowVendor } from "../types";

type Tx = Prisma.TransactionClient;

/**
 * Syncs a single vendor payload into the local database using an ongoing Prisma transaction.
 */
export async function syncVendor(
  tx: Tx,
  vendor: InflowVendor,
  caches: { verifiedPaymentTermsIds: Set<string>; verifiedCurrencyIds: Set<string> }
) {
  const cleanEmail = vendor.email?.trim().toLowerCase();

  /**
   * STEP 1: Inline Foreign Key Safety Check (Payment Terms & Currency)
   */
  if (vendor.defaultPaymentTermsId && !caches.verifiedPaymentTermsIds.has(vendor.defaultPaymentTermsId)) {
    await ensurePaymentTermsShell(tx, {
      inflowId: vendor.defaultPaymentTermsId,
      name: `Terms Placeholder (${vendor.defaultPaymentTermsId.slice(0, 5)})`,
    });
    caches.verifiedPaymentTermsIds.add(vendor.defaultPaymentTermsId);
  }

  if (vendor.currencyId && !caches.verifiedCurrencyIds.has(vendor.currencyId)) {
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
    caches.verifiedCurrencyIds.add(vendor.currencyId);
  }

  /**
   * STEP 2: Upsert Parent BusinessPartner Profile row
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
   * STEP 3: Business Partner Addresses Synced (Optimized for performance)
   */
  if (vendor.addresses?.length) {
    // Drop legacy entries to prevent orphaned or deleted sub-properties
    const addressesWithIds = vendor.addresses.filter((a) => a.vendorAddressId);
    if (addressesWithIds.length) {
      await tx.businessPartnerAddress.deleteMany({
        where: { businessPartnerId: partner.id }
      });
      
      await tx.businessPartnerAddress.createMany({
        data: addressesWithIds.map((addr) => ({
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
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * STEP 3.5: 🛡️ SELF-HEALING FOREIGN KEY GUARD: TeamMember (lastModifiedById)
   */
  let validLastModifiedById: string | null = null;
  if (vendor.lastModifiedById) {
    const localMember = await tx.teamMember.findUnique({
      where: { inflowId: vendor.lastModifiedById },
      select: { inflowId: true }
    });
    
    if (localMember) {
      validLastModifiedById = localMember.inflowId;
    } else {
      console.warn(
        `[Sync Notification] TeamMember with inflowId "${vendor.lastModifiedById}" not synced yet. Setting vendor.lastModifiedById to null to avoid constraint errors.`
      );
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
      lastModifiedById: validLastModifiedById, // 🟢 NOW USING THE SAFE GUARDED ID
      lastModifiedDttm: vendor.lastModifiedDttm ? new Date(vendor.lastModifiedDttm) : null,
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
      lastModifiedById: validLastModifiedById, // 🟢 NOW USING THE SAFE GUARDED ID
      lastModifiedDttm: vendor.lastModifiedDttm ? new Date(vendor.lastModifiedDttm) : null,
    },
  });

  /**
   * STEP 5: Child Vendor Items Sync
   */
  if (vendor.vendorItems !== undefined) {
    await tx.vendorItem.deleteMany({ where: { vendorId: vendor.vendorId } });
    if (vendor.vendorItems?.length) {
      await tx.vendorItem.createMany({
        data: vendor.vendorItems.filter(item => item.vendorItemId).map((item) => ({
          inflowId: item.vendorItemId,
          vendorId: vendor.vendorId,
          productId: item.productId,
          vendorSku: item.vendorItemCode,
          unitCost: item.cost ? new Prisma.Decimal(item.cost) : null,
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * STEP 6: Ledger Data Financial Collections
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
        inflowId: att.inflowId || att.vendorAttachmentId,
        vendorId: vendor.vendorId,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize,
        contentType: att.contentType,
      })),
    });
  }

  return syncedVendor;
}
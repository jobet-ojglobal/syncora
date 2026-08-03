// services/sync/purchase/purchase-order.sync.ts
import { Prisma, PurchaseOrderPaymentStatus, PurchaseOrderInventoryStatus} from "@/generated/prisma/client";
import { InflowPurchaseOrder } from "../types";
import { getVendor } from "../data/vendors";
import { syncVendor } from "./vendor.sync";
import { PurchaseOrderMapper } from "./purchase-order-mappers";
import {
  ensureCurrencyShell,
  ensureLocationShell,
  ensurePaymentTermsShell,
  ensureTaxingSchemeShell,
  ensureVendorShell,
} from "./ensure.service";
import { syncTeamMember } from "./team-member.sync";
import { toJsonInput } from "./helpers";

type Tx = Prisma.TransactionClient;

export type PurchaseOrderSyncCaches = {
  verifiedVendorIds?: Set<string>;
  verifiedLocationIds?: Set<string>;
  verifiedTeamMemberIds?: Set<string>;
  verifiedProductIds?: Set<string>;
  verifiedPaymentTermsIds?: Set<string>;
  verifiedCurrencyIds?: Set<string>;
  verifiedTaxingSchemeIds?: Set<string>;
};

// Helper: Safely convert numeric or string values to Prisma.Decimal
const toDecimal = (val: string | number | null | undefined): Prisma.Decimal | null => {
  if (val === null || val === undefined || val === "") return null;
  return new Prisma.Decimal(val);
};


/**
 * Normalizes incoming lower/mixed-case payment status strings to Prisma PurchaseOrderPaymentStatus enum values.
 */
export function toPaymentStatus(status: string | null | undefined): PurchaseOrderPaymentStatus {
  if (!status) return PurchaseOrderPaymentStatus.OWING;
  
  const normalized = status.toUpperCase().trim();
  
  // Check if the exact uppercase string exists in the Prisma Enum
  if (Object.values(PurchaseOrderPaymentStatus).includes(normalized as PurchaseOrderPaymentStatus)) {
    return normalized as PurchaseOrderPaymentStatus;
  }

  // Handle common edge-case aliases if the API format varies
  if (normalized === "DUE") return PurchaseOrderPaymentStatus.OWING;

  // Default fallback
  return PurchaseOrderPaymentStatus.OWING; 
}

/**
 * Normalizes incoming lower/mixed-case inventory status strings to Prisma PurchaseOrderInventoryStatus enum values.
 */
export function toInventoryStatus(status: string | null | undefined): PurchaseOrderInventoryStatus {
  if (!status) return PurchaseOrderInventoryStatus.UNFULFILLED;

  const normalized = status.toUpperCase().trim();
  
  // Check if the exact uppercase string exists in the Prisma Enum
  if (Object.values(PurchaseOrderInventoryStatus).includes(normalized as PurchaseOrderInventoryStatus)) {
    return normalized as PurchaseOrderInventoryStatus;
  }

  // Default fallback
  return PurchaseOrderInventoryStatus.UNFULFILLED; 
}

/**
 * Syncs a single purchase order record along with all its respective child dependencies 
 * using an isolated, active transaction pointer instance.
 */
export async function syncPurchaseOrder(
  tx: Tx,
  order: InflowPurchaseOrder,
  caches: PurchaseOrderSyncCaches
) {
  // Initialize optional cache sets if omitted
  const verifiedVendors = (caches.verifiedVendorIds ??= new Set<string>());
  const verifiedLocations = (caches.verifiedLocationIds ??= new Set<string>());
  const verifiedTeamMembers = (caches.verifiedTeamMemberIds ??= new Set<string>());
  const verifiedProducts = (caches.verifiedProductIds ??= new Set<string>());
  const verifiedPaymentTerms = (caches.verifiedPaymentTermsIds ??= new Set<string>());
  const verifiedCurrencies = (caches.verifiedCurrencyIds ??= new Set<string>());
  const verifiedTaxingSchemes = (caches.verifiedTaxingSchemeIds ??= new Set<string>());

  /**
   * STEP 1: 🛡️ JIT Self-Healing Foreign Key Guard: Vendor
   */
  let validVendorId: string | null = null;
  if (order.vendorId) {
    if (verifiedVendors.has(order.vendorId)) {
      validVendorId = order.vendorId;
    } else {
      const localPaymentTerm = await tx.paymentTerm.findUnique({
        where: { inflowId: order.vendorId },
        select: { inflowId: true }
      });
      
      if (localPaymentTerm) {
        validVendorId = localPaymentTerm.inflowId;
        verifiedVendors.add(localPaymentTerm.inflowId);
      } else if (order.vendor) {
        console.warn(
          `[Sync Notification] Vendor id "${order.vendorId}" missing locally. Syncing JIT...`
        );
        const newVendor = await ensureVendorShell(tx, order.vendor);
        if (newVendor?.inflowId) {
          validVendorId = newVendor.inflowId;
          verifiedVendors.add(newVendor.inflowId);
        }
      }
    }
  }
  
  // let validVendorId: string | null = null;
  // if (order.vendorId) {
  //   if (verifiedVendors.has(order.vendorId)) {
  //     validVendorId = order.vendorId;
  //   } else {
  //     const localVendor = await tx.vendor.findUnique({
  //       where: { inflowId: order.vendorId },
  //       select: { inflowId: true },
  //     });

  //     if (localVendor) {
  //       validVendorId = localVendor.inflowId;
  //       verifiedVendors.add(localVendor.inflowId);
  //     } else {
  //       try {
  //         console.warn(
  //           `[JIT Sync] Vendor "${order.vendorId}" missing for PO ${order.orderNumber}. Recovering...`
  //         );
  //         const cloudVendor = await getVendor(order.vendorId);

  //         if (cloudVendor) {
  //           const vendorCaches = {
  //             verifiedPaymentTermsIds: verifiedPaymentTerms,
  //             verifiedCurrencyIds: verifiedCurrencies,
  //             verifiedTaxingSchemeIds: verifiedTaxingSchemes,
  //             verifiedTeamMemberIds: verifiedTeamMembers,
  //           };
  //           await syncVendor(tx, cloudVendor, vendorCaches);
  //           validVendorId = order.vendorId;
  //           verifiedVendors.add(order.vendorId);
  //           console.log(`[JIT Sync] Successfully recovered vendor "${order.vendorId}".`);
  //         } else {
  //           console.warn(
  //             `[Sync Skipped] Skipping PO ${order.orderNumber}: Vendor "${order.vendorId}" missing from cloud API source.`
  //           );
  //           return null;
  //         }
  //       } catch (err) {
  //         console.error(
  //           `[JIT Sync Error] Failed to auto-heal vendor "${order.vendorId}" for PO ${order.orderNumber}:`,
  //           err
  //         );
  //         return null;
  //       }
  //     }
  //   }
  // }

  /**
   * STEP 2: Auxiliary Foreign Keys Resolution (Location, Terms, Currency, Tax Scheme)
   */

  // 2a. Location
  let validLocationId: string | null = null;
  if (order.locationId) {
    if (verifiedLocations.has(order.locationId)) {
      validLocationId = order.locationId;
    } else {
      const localLocation = await tx.location.findUnique({
        where: { inflowId: order.locationId },
        select: { inflowId: true },
      });

      if (localLocation) {
        validLocationId = localLocation.inflowId;
        verifiedLocations.add(localLocation.inflowId);
      } else if (order.location) {
        console.warn(`[Sync Notification] Location "${order.locationId}" missing locally. Syncing JIT...`);
        const newLocation = await ensureLocationShell(tx, order.location);
        if (newLocation?.inflowId) {
          validLocationId = newLocation.inflowId;
          verifiedLocations.add(newLocation.inflowId);
        }
      }
    }
  }

  // 2b. Payment Terms
  let validPaymentTermsId: string | null = null;
  if (order.paymentTermsId) {
    if (verifiedPaymentTerms.has(order.paymentTermsId)) {
      validPaymentTermsId = order.paymentTermsId;
    } else {
      const localTerms = await tx.paymentTerm.findUnique({
        where: { inflowId: order.paymentTermsId },
        select: { inflowId: true },
      });

      if (localTerms) {
        validPaymentTermsId = localTerms.inflowId;
        verifiedPaymentTerms.add(localTerms.inflowId);
      } else if (order.paymentTerms) {
        console.warn(`[Sync Notification] Payment Terms "${order.paymentTermsId}" missing locally. Syncing JIT...`);
        const newTerms = await ensurePaymentTermsShell(tx, order.paymentTerms);
        if (newTerms?.inflowId) {
          validPaymentTermsId = newTerms.inflowId;
          verifiedPaymentTerms.add(newTerms.inflowId);
        }
      }
    }
  }

  // 2c. Currency
  let validCurrencyId: string | null = null;
  if (order.currencyId) {
    if (verifiedCurrencies.has(order.currencyId)) {
      validCurrencyId = order.currencyId;
    } else {
      const localCurrency = await tx.currency.findUnique({
        where: { inflowId: order.currencyId },
        select: { inflowId: true },
      });

      if (localCurrency) {
        validCurrencyId = localCurrency.inflowId;
        verifiedCurrencies.add(localCurrency.inflowId);
      } else if (order.currency) {
        console.warn(`[Sync Notification] Currency "${order.currencyId}" missing locally. Syncing JIT...`);
        const newCurrency = await ensureCurrencyShell(tx, order.currency);
        if (newCurrency?.inflowId) {
          validCurrencyId = newCurrency.inflowId;
          verifiedCurrencies.add(newCurrency.inflowId);
        }
      }
    }
  }

  // 2d. Taxing Scheme
  let validTaxingSchemeId: string | null = null;
  if (order.taxingSchemeId) {
    if (verifiedTaxingSchemes.has(order.taxingSchemeId)) {
      validTaxingSchemeId = order.taxingSchemeId;
    } else {
      const localTaxingScheme = await tx.taxingScheme.findUnique({
        where: { inflowId: order.taxingSchemeId },
        select: { inflowId: true },
      });

      if (localTaxingScheme) {
        validTaxingSchemeId = localTaxingScheme.inflowId;
        verifiedTaxingSchemes.add(localTaxingScheme.inflowId);
      } else if (order.taxingScheme) {
        console.warn(`[Sync Notification] Taxing Scheme "${order.taxingSchemeId}" missing locally. Syncing JIT...`);
        const newTaxing = await ensureTaxingSchemeShell(tx, order.taxingScheme);
        if (newTaxing?.inflowId) {
          validTaxingSchemeId = newTaxing.inflowId;
          verifiedTaxingSchemes.add(newTaxing.inflowId);
        }
      }
    }
  }

  /**
   * STEP 3: Team Member Foreign Keys Safety Checks
   */
  const resolveTeamMemberId = async (memberId?: string | null, rawMember?: any) => {
    if (!memberId) return null;
    if (verifiedTeamMembers.has(memberId)) return memberId;

    const localMember = await tx.teamMember.findUnique({
      where: { inflowId: memberId },
      select: { inflowId: true },
    });

    if (localMember) {
      verifiedTeamMembers.add(localMember.inflowId);
      return localMember.inflowId;
    }

    if (rawMember) {
      console.warn(`[Sync Notification] Team Member "${memberId}" missing locally. Syncing JIT...`);
      const syncedMember = await syncTeamMember(tx, rawMember);
      if (syncedMember?.inflowId) {
        verifiedTeamMembers.add(syncedMember.inflowId);
        return syncedMember.inflowId;
      }
    }

    return null;
  };

  const validAssignedToId = await resolveTeamMemberId(
    order.assignedToTeamMemberId,
    order.assignedToTeamMember
  );
  const validApproverId = await resolveTeamMemberId(
    order.approverTeamMemberId,
    order.approverTeamMember
  );
  const validLastModifiedById = await resolveTeamMemberId(
    order.lastModifiedById,
    order.lastModifiedBy
  );

  /**
   * STEP 4: Payload Construction & Parent Purchase Order Upsert
   */
  const poPayload = {
    orderNumber: order.orderNumber,
    vendorOrderNumber: order.vendorOrderNumber || null,
    subTotal: toDecimal(order.subTotal) ?? new Prisma.Decimal(0),
    total: toDecimal(order.total) ?? new Prisma.Decimal(0),
    amountPaid: toDecimal(order.amountPaid) ?? new Prisma.Decimal(0),
    balance: toDecimal(order.balance) ?? new Prisma.Decimal(0),
    freight: toDecimal(order.freight) ?? new Prisma.Decimal(0),
    returnFee: toDecimal(order.returnFee) ?? new Prisma.Decimal(0),
    returnExtra: toDecimal(order.returnExtra) ?? new Prisma.Decimal(0),
    exchangeRate: toDecimal(order.exchangeRate) ?? new Prisma.Decimal(1.0),
    exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
    paymentStatus: toPaymentStatus(order.paymentStatus),
    inventoryStatus: toInventoryStatus(order.inventoryStatus),
    isCancelled: order.isCancelled ?? false,
    isCompleted: order.isCompleted ?? false,
    isQuote: order.isQuote ?? false,
    isTaxInclusive: order.isTaxInclusive ?? false,
    showShipping: order.showShipping ?? true,
    carrier: order.carrier || null,
    orderDate: order.orderDate ? new Date(order.orderDate) : null,
    dueDate: order.dueDate ? new Date(order.dueDate) : null,
    requestShipDate: order.requestShipDate ? new Date(order.requestShipDate) : null,
    contactName: order.contactName || null,
    email: order.email || null,
    phone: order.phone || null,
    orderRemarks: order.orderRemarks || null,
    receiveRemarks: order.receiveRemarks || null,
    returnRemarks: order.returnRemarks || null,
    unstockRemarks: order.unstockRemarks || null,
    shipToCompanyName: order.shipToCompanyName || null,
    
    shipToAddress: toJsonInput(order.shipToAddress),
    vendorAddress: toJsonInput(order.vendorAddress),
    customFields: toJsonInput(order.customFields),
    nonVendorCosts: toJsonInput(order.nonVendorCosts),

    vendorId: validVendorId!,
    locationId: validLocationId,
    assignedToTeamMemberId: validAssignedToId,
    approverTeamMemberId: validApproverId,
    lastModifiedById: validLastModifiedById,
    currencyId: validCurrencyId,
    paymentTermsId: validPaymentTermsId,
    taxingSchemeId: validTaxingSchemeId,
    calculateTax2OnTax1: order.calculateTax2OnTax1 ?? false,
    tax1: toDecimal(order.tax1) ?? new Prisma.Decimal(0),
    tax1Name: order.tax1Name || null,
    tax1OnShipping: order.tax1OnShipping ?? false,
    tax1Rate: toDecimal(order.tax1Rate) ?? new Prisma.Decimal(0),
    tax2: toDecimal(order.tax2) ?? new Prisma.Decimal(0),
    tax2Name: order.tax2Name || null,
    tax2OnShipping: order.tax2OnShipping ?? false,
    tax2Rate: toDecimal(order.tax2Rate) ?? new Prisma.Decimal(0),
  };

  const syncedPO = await tx.purchaseOrder.upsert({
    where: { inflowId: order.purchaseOrderId },
    update: poPayload,
    create: {
      ...poPayload,
      id: order.purchaseOrderId,
      inflowId: order.purchaseOrderId,
    },
  });

  /**
   * STEP 5: Clear Stale Child Dependent Rows
   */
  await Promise.all([
    tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
    tx.purchaseOrderReceiveLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
    tx.purchaseOrderUnstockLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
    tx.purchaseOrderPaymentLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
    tx.purchaseOrderAttachment.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
  ]);

  /**
   * STEP 6: Re-insert Child Arrays via PurchaseOrderMapper Integration
   */
  const lines = PurchaseOrderMapper.mapLines(order?.lines || [], order.purchaseOrderId, verifiedProducts);
  if (lines?.length) await tx.purchaseOrderLine.createMany({ data: lines });

  const receiveLines = PurchaseOrderMapper.mapReceiveLines(order?.receiveLines || [], order.purchaseOrderId, verifiedProducts);
  if (receiveLines?.length) await tx.purchaseOrderReceiveLine.createMany({ data: receiveLines });

  const unstockLines = PurchaseOrderMapper.mapUnstockLines(order?.unstockLines || [], order.purchaseOrderId, verifiedProducts);
  if (unstockLines?.length) await tx.purchaseOrderUnstockLine.createMany({ data: unstockLines });

  const paymentLines = PurchaseOrderMapper.mapPaymentLines(order?.paymentLines || [], order.purchaseOrderId);
  if (paymentLines?.length) await tx.purchaseOrderPaymentLine.createMany({ data: paymentLines });

  const attachments = PurchaseOrderMapper.mapAttachments(order?.attachments || [], order.purchaseOrderId);
  if (attachments?.length) await tx.purchaseOrderAttachment.createMany({ data: attachments });

  return syncedPO;
}


//  approverTeamMember?: InflowTeamMember | null;
//   assignedToTeamMember?: InflowTeamMember | null;
//   attachments?: InflowAttachment[];
//   currency?: InflowCurrency;
//   lastModifiedBy?: InflowTeamMember | null;
//   lines?: InflowPurchaseOrderLine[];
//   location?: InflowLocation;
//   paymentLines?: InflowPurchasePaymentLine[];
//   paymentTerms?: InflowPaymentTerms;
//   receiveLines?: InflowPurchaseReceiveLine[];
//   taxingScheme?: InflowTaxingScheme;
//   unstockLines?: InflowPurchaseUnstockLine[];
//   vendor?: InflowVendor | null;


// // services/sync/purchase/purchase-order.sync.ts

// import { Prisma } from "@/generated/prisma/client";
// import { PurchaseOrderMapper } from "./purchase-order-mappers";
// import { getVendor } from "../data/vendors";
// import { syncVendor } from "./vendor.sync";
// import { InflowPurchaseOrder } from "../types";


// export interface PurchaseOrderSyncValidationSets {
//   validLocations: Set<string>;
//   validTeamMembers: Set<string>;
//   validProducts: Set<string>;
// }

// /**
//  * Syncs a single purchase order record along with all its respective child dependencies 
//  * using an isolated, active transaction pointer instance.
//  */
// export async function syncPurchaseOrder(
//   tx: any,
//   order: InflowPurchaseOrder,
//   validationSets: PurchaseOrderSyncValidationSets
// ) {
//   const { validLocations, validTeamMembers, validProducts } = validationSets;

//   // 1. 🛡️ JIT Self-Healing Layer for missing Vendors
//   const vendorExists = await tx.vendor.findUnique({
//     where: { inflowId: order.vendorId },
//     select: { id: true },
//   });

//   if (!vendorExists) {
//     try {
//       console.log(`[JIT Sync] Vendor "${order.vendorId}" missing for PO ${order.orderNumber}. Recovering...`);
//       const cloudVendor = await getVendor(order.vendorId);
      
//       if (cloudVendor) {
//         // Fallback structures required by your vendor sync logic if applicable
//         const vendorCaches = {
//           verifiedPaymentTermsIds: new Set<string>(), verifiedCurrencyIds: new Set<string>()
//         };
//         await syncVendor(tx, cloudVendor, vendorCaches);
//         console.log(`[JIT Sync] Successfully recovered vendor "${order.vendorId}".`);
//       } else {
//         console.warn(`[Sync Skipped] Skipping PO ${order.orderNumber}: Vendor "${order.vendorId}" missing from cloud API source.`);
//         return null;
//       }
//     } catch (err) {
//       console.error(`[JIT Sync Error] Failed to auto-heal vendor "${order.vendorId}" for PO ${order.orderNumber}:`, err);
//       return null;
//     }
//   }

//   // 2. Clean structural operational relationship fields
//   const cleanLocationId = order.locationId && validLocations.has(order.locationId) ? order.locationId : null;
//   const cleanAssignedId = order.assignedToTeamMemberId && validTeamMembers.has(order.assignedToTeamMemberId) ? order.assignedToTeamMemberId : null;
//   const cleanApproverId = order.approverTeamMemberId && validTeamMembers.has(order.approverTeamMemberId) ? order.approverTeamMemberId : null;

//   // 3. Upsert Parent Record
//   await tx.purchaseOrder.upsert({
//     where: { inflowId: order.purchaseOrderId },
//     update: {
//       orderNumber: order.orderNumber,
//       vendorOrderNumber: order.vendorOrderNumber || null,
//       subTotal: new Prisma.Decimal(order.subTotal || 0),
//       total: new Prisma.Decimal(order.total || 0),
//       amountPaid: new Prisma.Decimal(order.amountPaid || 0),
//       balance: new Prisma.Decimal(order.balance || 0),
//       freight: new Prisma.Decimal(order.freight || 0),
//       returnFee: new Prisma.Decimal(order.returnFee || 0),
//       returnExtra: new Prisma.Decimal(order.returnExtra || 0),
//       exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
//       exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
//       paymentStatus: order.paymentStatus,
//       inventoryStatus: order.inventoryStatus,
//       isCancelled: order.isCancelled ?? false,
//       isCompleted: order.isCompleted ?? false,
//       isQuote: order.isQuote ?? false,
//       isTaxInclusive: order.isTaxInclusive ?? false,
//       showShipping: order.showShipping ?? true,
//       carrier: order.carrier || null,
//       orderDate: order.orderDate ? new Date(order.orderDate) : null,
//       dueDate: order.dueDate ? new Date(order.dueDate) : null,
//       requestShipDate: order.requestShipDate ? new Date(order.requestShipDate) : null,
//       contactName: order.contactName || null,
//       email: order.email || null,
//       phone: order.phone || null,
//       orderRemarks: order.orderRemarks || null,
//       receiveRemarks: order.receiveRemarks || null,
//       returnRemarks: order.returnRemarks || null,
//       unstockRemarks: order.unstockRemarks || null,
//       shipToCompanyName: order.shipToCompanyName || null,
//       shipToAddress: order.shipToAddress || Prisma.DbNull,
//       vendorAddress: order.vendorAddress || Prisma.DbNull,
//       customFields: order.customFields || Prisma.DbNull,
//       nonVendorCosts: order.nonVendorCosts || Prisma.DbNull,
//       vendorId: order.vendorId,
//       locationId: cleanLocationId,
//       assignedToTeamMemberId: cleanAssignedId,
//       approverTeamMemberId: cleanApproverId,
//       lastModifiedById: order.lastModifiedById || null,
//       currencyId: order.currencyId || null,
//       paymentTermsId: order.paymentTermsId || null,
//       taxingSchemeId: order.taxingSchemeId || null,
//       calculateTax2OnTax1: order.calculateTax2OnTax1 ?? false,
//       tax1: new Prisma.Decimal(order.tax1 || 0),
//       tax1Name: order.tax1Name || null,
//       tax1OnShipping: order.tax1OnShipping ?? false,
//       tax1Rate: new Prisma.Decimal(order.tax1Rate || 0),
//       tax2: new Prisma.Decimal(order.tax2 || 0),
//       tax2Name: order.tax2Name || null,
//       tax2OnShipping: order.tax2OnShipping ?? false,
//       tax2Rate: new Prisma.Decimal(order.tax2Rate || 0),
//     },
//     create: {
//       id: order.purchaseOrderId,
//       inflowId: order.purchaseOrderId,
//       orderNumber: order.orderNumber,
//       vendorOrderNumber: order.vendorOrderNumber || null,
//       subTotal: new Prisma.Decimal(order.subTotal || 0),
//       total: new Prisma.Decimal(order.total || 0),
//       amountPaid: new Prisma.Decimal(order.amountPaid || 0),
//       balance: new Prisma.Decimal(order.balance || 0),
//       freight: new Prisma.Decimal(order.freight || 0),
//       returnFee: new Prisma.Decimal(order.returnFee || 0),
//       returnExtra: new Prisma.Decimal(order.returnExtra || 0),
//       exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
//       exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
//       paymentStatus: order.paymentStatus,
//       inventoryStatus: order.inventoryStatus,
//       isCancelled: order.isCancelled ?? false,
//       isCompleted: order.isCompleted ?? false,
//       isQuote: order.isQuote ?? false,
//       isTaxInclusive: order.isTaxInclusive ?? false,
//       showShipping: order.showShipping ?? true,
//       carrier: order.carrier || null,
//       orderDate: order.orderDate ? new Date(order.orderDate) : null,
//       dueDate: order.dueDate ? new Date(order.dueDate) : null,
//       requestShipDate: order.requestShipDate ? new Date(order.requestShipDate) : null,
//       contactName: order.contactName || null,
//       email: order.email || null,
//       phone: order.phone || null,
//       orderRemarks: order.orderRemarks || null,
//       receiveRemarks: order.receiveRemarks || null,
//       returnRemarks: order.returnRemarks || null,
//       unstockRemarks: order.unstockRemarks || null,
//       shipToCompanyName: order.shipToCompanyName || null,
//       shipToAddress: order.shipToAddress || Prisma.DbNull,
//       vendorAddress: order.vendorAddress || Prisma.DbNull,
//       customFields: order.customFields || Prisma.DbNull,
//       nonVendorCosts: order.nonVendorCosts || Prisma.DbNull,
//       vendorId: order.vendorId,
//       locationId: cleanLocationId,
//       assignedToTeamMemberId: cleanAssignedId,
//       approverTeamMemberId: cleanApproverId,
//       lastModifiedById: order.lastModifiedById || null,
//       currencyId: order.currencyId || null,
//       paymentTermsId: order.paymentTermsId || null,
//       taxingSchemeId: order.taxingSchemeId || null,
//       calculateTax2OnTax1: order.calculateTax2OnTax1 ?? false,
//       tax1: new Prisma.Decimal(order.tax1 || 0),
//       tax1Name: order.tax1Name || null,
//       tax1OnShipping: order.tax1OnShipping ?? false,
//       tax1Rate: new Prisma.Decimal(order.tax1Rate || 0),
//       tax2: new Prisma.Decimal(order.tax2 || 0),
//       tax2Name: order.tax2Name || null,
//       tax2OnShipping: order.tax2OnShipping ?? false,
//       tax2Rate: new Prisma.Decimal(order.tax2Rate || 0),
//     },
//   });

//   // 4. Wipe stale child dependent rows
//   await Promise.all([
//     tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
//     tx.purchaseOrderReceiveLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
//     tx.purchaseOrderUnstockLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
//     tx.purchaseOrderPaymentLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
//     tx.purchaseOrderAttachment.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
//   ]);

//   // 5. Re-insert child arrays using Mapper tracking instances
//   const lines = PurchaseOrderMapper.mapLines(order.lines, order.purchaseOrderId, validProducts);
//   if (lines.length) await tx.purchaseOrderLine.createMany({ data: lines });

//   const receiveLines = PurchaseOrderMapper.mapReceiveLines(order.receiveLines, order.purchaseOrderId, validProducts);
//   if (receiveLines.length) await tx.purchaseOrderReceiveLine.createMany({ data: receiveLines });

//   const unstockLines = PurchaseOrderMapper.mapUnstockLines(order.unstockLines, order.purchaseOrderId, validProducts);
//   if (unstockLines.length) await tx.purchaseOrderUnstockLine.createMany({ data: unstockLines });

//   const paymentLines = PurchaseOrderMapper.mapPaymentLines(order.paymentLines, order.purchaseOrderId);
//   if (paymentLines.length) await tx.purchaseOrderPaymentLine.createMany({ data: paymentLines });

//   const attachments = PurchaseOrderMapper.mapAttachments(order.attachments, order.purchaseOrderId);
//   if (attachments.length) await tx.purchaseOrderAttachment.createMany({ data: attachments });
// }
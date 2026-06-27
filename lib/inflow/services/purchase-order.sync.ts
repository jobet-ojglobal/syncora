// services/sync/purchase/purchase-order.sync.ts

import { Prisma } from "@/generated/prisma/client";
import { PurchaseOrderMapper } from "./purchase-order-mappers";
import { getVendor } from "../data/vendors";
import { syncVendor } from "./vendor.sync";
import { InflowPurchaseOrder } from "../types";

export interface PurchaseOrderSyncValidationSets {
  validLocations: Set<string>;
  validTeamMembers: Set<string>;
  validProducts: Set<string>;
}

/**
 * Syncs a single purchase order record along with all its respective child dependencies 
 * using an isolated, active transaction pointer instance.
 */
export async function syncPurchaseOrder(
  tx: any,
  order: InflowPurchaseOrder,
  validationSets: PurchaseOrderSyncValidationSets
) {
  const { validLocations, validTeamMembers, validProducts } = validationSets;

  // 1. 🛡️ JIT Self-Healing Layer for missing Vendors
  const vendorExists = await tx.vendor.findUnique({
    where: { inflowId: order.vendorId },
    select: { id: true },
  });

  if (!vendorExists) {
    try {
      console.log(`[JIT Sync] Vendor "${order.vendorId}" missing for PO ${order.orderNumber}. Recovering...`);
      const cloudVendor = await getVendor(order.vendorId);
      
      if (cloudVendor) {
        // Fallback structures required by your vendor sync logic if applicable
        const vendorCaches = {
          verifiedPaymentTermsIds: new Set<string>(), verifiedCurrencyIds: new Set<string>()
        };
        await syncVendor(tx, cloudVendor, vendorCaches);
        console.log(`[JIT Sync] Successfully recovered vendor "${order.vendorId}".`);
      } else {
        console.warn(`[Sync Skipped] Skipping PO ${order.orderNumber}: Vendor "${order.vendorId}" missing from cloud API source.`);
        return null;
      }
    } catch (err) {
      console.error(`[JIT Sync Error] Failed to auto-heal vendor "${order.vendorId}" for PO ${order.orderNumber}:`, err);
      return null;
    }
  }

  // 2. Clean structural operational relationship fields
  const cleanLocationId = order.locationId && validLocations.has(order.locationId) ? order.locationId : null;
  const cleanAssignedId = order.assignedToTeamMemberId && validTeamMembers.has(order.assignedToTeamMemberId) ? order.assignedToTeamMemberId : null;
  const cleanApproverId = order.approverTeamMemberId && validTeamMembers.has(order.approverTeamMemberId) ? order.approverTeamMemberId : null;

  // 3. Upsert Parent Record
  await tx.purchaseOrder.upsert({
    where: { inflowId: order.purchaseOrderId },
    update: {
      orderNumber: order.orderNumber,
      vendorOrderNumber: order.vendorOrderNumber || null,
      subTotal: new Prisma.Decimal(order.subTotal || 0),
      total: new Prisma.Decimal(order.total || 0),
      amountPaid: new Prisma.Decimal(order.amountPaid || 0),
      balance: new Prisma.Decimal(order.balance || 0),
      freight: new Prisma.Decimal(order.freight || 0),
      returnFee: new Prisma.Decimal(order.returnFee || 0),
      returnExtra: new Prisma.Decimal(order.returnExtra || 0),
      exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
      exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
      paymentStatus: order.paymentStatus,
      inventoryStatus: order.inventoryStatus,
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
      timestamp: order.timestamp,
      shipToAddress: order.shipToAddress || Prisma.DbNull,
      vendorAddress: order.vendorAddress || Prisma.DbNull,
      customFields: order.customFields || Prisma.DbNull,
      nonVendorCosts: order.nonVendorCosts || Prisma.DbNull,
      vendorId: order.vendorId,
      locationId: cleanLocationId,
      assignedToTeamMemberId: cleanAssignedId,
      approverTeamMemberId: cleanApproverId,
      lastModifiedById: order.lastModifiedById || null,
      currencyId: order.currencyId || null,
      paymentTermsId: order.paymentTermsId || null,
      taxingSchemeId: order.taxingSchemeId || null,
      calculateTax2OnTax1: order.calculateTax2OnTax1 ?? false,
      tax1: new Prisma.Decimal(order.tax1 || 0),
      tax1Name: order.tax1Name || null,
      tax1OnShipping: order.tax1OnShipping ?? false,
      tax1Rate: new Prisma.Decimal(order.tax1Rate || 0),
      tax2: new Prisma.Decimal(order.tax2 || 0),
      tax2Name: order.tax2Name || null,
      tax2OnShipping: order.tax2OnShipping ?? false,
      tax2Rate: new Prisma.Decimal(order.tax2Rate || 0),
    },
    create: {
      id: order.purchaseOrderId,
      inflowId: order.purchaseOrderId,
      orderNumber: order.orderNumber,
      vendorOrderNumber: order.vendorOrderNumber || null,
      subTotal: new Prisma.Decimal(order.subTotal || 0),
      total: new Prisma.Decimal(order.total || 0),
      amountPaid: new Prisma.Decimal(order.amountPaid || 0),
      balance: new Prisma.Decimal(order.balance || 0),
      freight: new Prisma.Decimal(order.freight || 0),
      returnFee: new Prisma.Decimal(order.returnFee || 0),
      returnExtra: new Prisma.Decimal(order.returnExtra || 0),
      exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
      exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
      paymentStatus: order.paymentStatus,
      inventoryStatus: order.inventoryStatus,
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
      timestamp: order.timestamp,
      shipToAddress: order.shipToAddress || Prisma.DbNull,
      vendorAddress: order.vendorAddress || Prisma.DbNull,
      customFields: order.customFields || Prisma.DbNull,
      nonVendorCosts: order.nonVendorCosts || Prisma.DbNull,
      vendorId: order.vendorId,
      locationId: cleanLocationId,
      assignedToTeamMemberId: cleanAssignedId,
      approverTeamMemberId: cleanApproverId,
      lastModifiedById: order.lastModifiedById || null,
      currencyId: order.currencyId || null,
      paymentTermsId: order.paymentTermsId || null,
      taxingSchemeId: order.taxingSchemeId || null,
      calculateTax2OnTax1: order.calculateTax2OnTax1 ?? false,
      tax1: new Prisma.Decimal(order.tax1 || 0),
      tax1Name: order.tax1Name || null,
      tax1OnShipping: order.tax1OnShipping ?? false,
      tax1Rate: new Prisma.Decimal(order.tax1Rate || 0),
      tax2: new Prisma.Decimal(order.tax2 || 0),
      tax2Name: order.tax2Name || null,
      tax2OnShipping: order.tax2OnShipping ?? false,
      tax2Rate: new Prisma.Decimal(order.tax2Rate || 0),
    },
  });

  // 4. Wipe stale child dependent rows
  await Promise.all([
    tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
    tx.purchaseOrderReceiveLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
    tx.purchaseOrderUnstockLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
    tx.purchaseOrderPaymentLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
    tx.purchaseOrderAttachment.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
  ]);

  // 5. Re-insert child arrays using Mapper tracking instances
  const lines = PurchaseOrderMapper.mapLines(order.lines, order.purchaseOrderId, validProducts);
  if (lines.length) await tx.purchaseOrderLine.createMany({ data: lines });

  const receiveLines = PurchaseOrderMapper.mapReceiveLines(order.receiveLines, order.purchaseOrderId, validProducts);
  if (receiveLines.length) await tx.purchaseOrderReceiveLine.createMany({ data: receiveLines });

  const unstockLines = PurchaseOrderMapper.mapUnstockLines(order.unstockLines, order.purchaseOrderId, validProducts);
  if (unstockLines.length) await tx.purchaseOrderUnstockLine.createMany({ data: unstockLines });

  const paymentLines = PurchaseOrderMapper.mapPaymentLines(order.paymentLines, order.purchaseOrderId);
  if (paymentLines.length) await tx.purchaseOrderPaymentLine.createMany({ data: paymentLines });

  const attachments = PurchaseOrderMapper.mapAttachments(order.attachments, order.purchaseOrderId);
  if (attachments.length) await tx.purchaseOrderAttachment.createMany({ data: attachments });
}
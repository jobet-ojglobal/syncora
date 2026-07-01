// services/sync/purchase/purchase-order-mappers.ts
import { Prisma } from "@/generated/prisma/client";

/**
 * Filter out child array records referencing structural products missing from the database.
 */
function filterValidItems<T extends { productId?: string }>(
  items: T[] | undefined,
  validProductIds: Set<string>
): T[] {
  return (items || []).filter((item) => !item.productId || validProductIds.has(item.productId));
}

export const PurchaseOrderMapper = {
  mapLines(lines: any[], purchaseOrderId: string, validProducts: Set<string>) {
    const seenLineIds = new Set<string>();

    return filterValidItems(lines, validProducts)
      .filter((l) => {
        // Guard: If the upstream API sent duplicate line IDs in a single order payload
        if (seenLineIds.has(l.purchaseOrderLineId)) return false;
        seenLineIds.add(l.purchaseOrderLineId);
        return true;
      }).map((l) => ({
      purchaseOrderLineId: l.purchaseOrderLineId,
      purchaseOrderId,
      productId: l.productId,
      vendorItemCode: l.vendorItemCode || null,
      description: l.description || null,
      unitPrice: new Prisma.Decimal(l.unitPrice || 0),
      subTotal: new Prisma.Decimal(l.subTotal || 0),
      discount: l.discount || Prisma.DbNull,
      serviceCompleted: l.serviceCompleted ?? false,
      returnDate: l.returnDate ? new Date(l.returnDate) : null,
      quantity: l.quantity || Prisma.DbNull,
      productHeight: l.productHeight ? new Prisma.Decimal(l.productHeight) : null,
      productLength: l.productLength ? new Prisma.Decimal(l.productLength) : null,
      productWidth: l.productWidth ? new Prisma.Decimal(l.productWidth) : null,
      productWeight: l.productWeight ? new Prisma.Decimal(l.productWeight) : null,
      tax1Rate: new Prisma.Decimal(l.tax1Rate || 0),
      tax2Rate: new Prisma.Decimal(l.tax2Rate || 0),
      taxCodeId: l.taxCodeId || null,
    }));
  },

  mapReceiveLines(receiveLines: any[], purchaseOrderId: string, validProducts: Set<string>) {
    return filterValidItems(receiveLines, validProducts).map((l) => ({
      purchaseOrderReceiveLineId: l.purchaseOrderReceiveLineId,
      purchaseOrderId,
      productId: l.productId,
      locationId: l.locationId || null,
      sublocation: l.sublocation || null,
      receiveDate: l.receiveDate ? new Date(l.receiveDate) : null,
      description: l.description || null,
      vendorItemCode: l.vendorItemCode || null,
      quantity: l.quantity || Prisma.DbNull,
      productHeight: l.productHeight ? new Prisma.Decimal(l.productHeight) : null,
      productLength: l.productLength ? new Prisma.Decimal(l.productLength) : null,
      productWidth: l.productWidth ? new Prisma.Decimal(l.productWidth) : null,
      productWeight: l.productWeight ? new Prisma.Decimal(l.productWeight) : null,
    }));
  },

  mapUnstockLines(unstockLines: any[], purchaseOrderId: string, validProducts: Set<string>) {
    return filterValidItems(unstockLines, validProducts).map((l) => ({
      purchaseOrderUnstockLineId: l.purchaseOrderUnstockLineId,
      purchaseOrderId,
      productId: l.productId,
      locationId: l.locationId || null,
      sublocation: l.sublocation || null,
      unstockDate: l.unstockDate ? new Date(l.unstockDate) : null,
      description: l.description || null,
      vendorItemCode: l.vendorItemCode || null,
      quantity: l.quantity || Prisma.DbNull,
    }));
  },

  mapPaymentLines(paymentLines: any[], purchaseOrderId: string) {
    return (paymentLines || []).map((l) => ({
      purchaseOrderPaymentHistoryLineId: l.purchaseOrderPaymentHistoryLineId || crypto.randomUUID(),
      purchaseOrderId,
      amount: new Prisma.Decimal(l.amount || 0),
      datePaid: l.datePaid ? new Date(l.datePaid) : null,
      paymentMethod: l.paymentMethod || null,
      paymentType: l.paymentType || null,
      referenceNumber: l.referenceNumber || null,
      remarks: l.remarks || null,
    }));
  },

  mapAttachments(attachments: any[], purchaseOrderId: string) {
    return (attachments || []).map((l) => ({
      attachmentId: l.attachmentId || crypto.randomUUID(),
      purchaseOrderId,
      attachmentUrl: l.attachmentUrl,
      fileName: l.fileName,
      fileSize: l.fileSize || Prisma.DbNull,
      lastModDttm: l.lastModDttm ? new Date(l.lastModDttm) : null,
      lastModifiedById: l.lastModifiedById || null,
    }));
  },
};
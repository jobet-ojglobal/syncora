// services/sync/sales/sales-order-mappers.ts
import { Prisma } from "@/generated/prisma/client";

/**
 * Filter out array elements whose item IDs do not exist in our system 
 * to prevent foreign key errors.
 */
function filterValidItems<T extends { productId?: string }>(
  items: T[] | undefined, 
  validProductIds: Set<string>
): T[] {
  return (items || []).filter((item) => !item.productId || validProductIds.has(item.productId));
}

export const SalesOrderMapper = {
  mapLines(lines: any[], salesOrderId: string, validProducts: Set<string>) {
    const seenLineIds = new Set<string>();

    return filterValidItems(lines, validProducts)
      .filter((l) => {
        // Guard: If the upstream API sent duplicate line IDs in a single order payload
        if (seenLineIds.has(l.salesOrderLineId)) return false;
        seenLineIds.add(l.salesOrderLineId);
        return true;
      })
      .map((l) => ({
        salesOrderLineId: l.salesOrderLineId,
        salesOrderId,
        productId: l.productId,
        unitPrice: new Prisma.Decimal(l.unitPrice || 0),
        subTotal: new Prisma.Decimal(l.subTotal || 0),
        discount: l.discount || Prisma.DbNull,
        isDiscarded: l.isDiscarded ?? false,
        serviceCompleted: l.serviceCompleted || null,
        returnDate: l.returnDate ? new Date(l.returnDate) : null,
        quantity: l.quantity || Prisma.DbNull,
        tax1Rate: new Prisma.Decimal(l.tax1Rate || 0),
        tax2Rate: new Prisma.Decimal(l.tax2Rate || 0),
        taxCodeId: l.taxCodeId || null,
      }));
  },

  mapPackLines(packLines: any[], salesOrderId: string, validProducts: Set<string>) {
    return filterValidItems(packLines, validProducts).map((l) => ({
      salesOrderPackLineId: l.salesOrderPackLineId,
      salesOrderId,
      productId: l.productId,
      containerNumber: l.containerNumber || null,
      description: l.description || null,
      quantity: l.quantity || Prisma.DbNull,
    }));
  },

  mapPickLines(pickLines: any[], salesOrderId: string, validProducts: Set<string>) {
    return filterValidItems(pickLines, validProducts).map((l) => ({
      salesOrderPickLineId: l.salesOrderPickLineId,
      salesOrderId,
      productId: l.productId,
      lineNum: l.lineNum !== undefined ? String(l.lineNum) : null,
      locationId: l.locationId || null,
      sublocation: l.sublocation || null,
      pickDate: l.pickDate ? new Date(l.pickDate) : null,
      description: l.description || null,
      quantity: l.quantity || Prisma.DbNull,
    }));
  },

  mapAllocationLines(allocLines: any[], salesOrderId: string, validProducts: Set<string>) {
    return filterValidItems(allocLines, validProducts).map((l) => ({
      salesOrderPickAllocationLineId: l.salesOrderPickAllocationLineId,
      salesOrderId,
      productId: l.productId,
      lineNum: l.lineNum !== undefined ? String(l.lineNum) : null,
      locationId: l.locationId || null,
      sublocation: l.sublocation || null,
      quantity: l.quantity || Prisma.DbNull,
    }));
  },

  mapAllocationFailures(failures: any[], salesOrderId: string, validProducts: Set<string>) {
    return filterValidItems(failures, validProducts).map((l) => ({
      salesOrderPickAllocationFailureId: l.salesOrderPickAllocationFailureId,
      salesOrderId,
      productId: l.productId,
      lineNum: l.lineNum !== undefined ? String(l.lineNum) : null,
      hasExpiredLotsInStock: l.hasExpiredLotsInStock ?? false,
      quantity: l.quantity || Prisma.DbNull,
    }));
  },

  mapRestockLines(restockLines: any[], salesOrderId: string, validProducts: Set<string>) {
    return filterValidItems(restockLines, validProducts).map((l) => ({
      salesOrderRestockLineId: l.salesOrderRestockLineId,
      salesOrderId,
      productId: l.productId,
      description: l.description || null,
      locationId: l.locationId || null,
      sublocation: l.sublocation || null,
      restockDate: l.restockDate ? new Date(l.restockDate) : null,
      quantity: l.quantity || Prisma.DbNull,
    }));
  },

  mapShipLines(shipLines: any[], salesOrderId: string) {
    return (shipLines || []).map((l) => ({
      salesOrderShipLineId: l.salesOrderShipLineId,
      salesOrderId,
      carrier: l.carrier || null,
      trackingNumber: l.trackingNumber || null,
      shippedDate: l.shippedDate ? new Date(l.shippedDate) : null,
      easyPostShipmentId: l.easyPostShipmentId || null,
      easyPostShipmentStatus: l.easyPostShipmentStatus || null,
      easyPostConfirmationEmailAddress: l.easyPostConfirmationEmailAddress || null,
      containers: l.containers ? l.containers : Prisma.DbNull,
    }));
  },

  mapPaymentLines(paymentLines: any[], salesOrderId: string) {
    return (paymentLines || []).map((l) => ({
      salesOrderPaymentHistoryLineId: l.salesOrderPaymentHistoryLineId,
      salesOrderId,
      lineNum: typeof l.lineNum === "string" ? parseInt(l.lineNum, 10) : l.lineNum || 0,
      amount: new Prisma.Decimal(l.amount || 0),
      datePaid: l.datePaid ? new Date(l.datePaid) : null,
      paymentMethod: l.paymentMethod || null,
      paymentType: l.paymentType || null,
      referenceNumber: l.referenceNumber || null,
      remarks: l.remarks || null,
    }));
  },
};
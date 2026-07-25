// services/sync/purchase/purchase-order-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getPurchaseOrders } from "../data/purchase-orders";
import { syncPurchaseOrder, PurchaseOrderSyncCaches } from "./purchase-order.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class PurchaseOrderSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 50;
    let after: string | undefined;
    let totalProcessed = 0;

    // Cross-batch tracking caches passed down to single items safely
    const caches: PurchaseOrderSyncCaches = {
      verifiedVendorIds: new Set<string>(),
      verifiedLocationIds: new Set<string>(),
      verifiedTeamMemberIds: new Set<string>(),
      verifiedProductIds: new Set<string>(),
      verifiedPaymentTermsIds: new Set<string>(),
      verifiedCurrencyIds: new Set<string>(),
      verifiedTaxingSchemeIds: new Set<string>(),
    };

    console.log("Starting modular batched purchase order sync operation...");

    while (true) {
      const response = await getPurchaseOrders(BATCH_SIZE, after);
      const orders = Array.isArray(response) ? response : (response as any)?.data || [];

      if (!orders || orders.length === 0) break;

      await prisma.$transaction(
        async (tx) => {
          for (const order of orders) {
            await syncPurchaseOrder(tx, order, caches);
            totalProcessed++;
          }
        },
        { timeout: 90000 }
      );

      after = orders[orders.length - 1].purchaseOrderId;
      if (options?.onProgress) await options.onProgress(totalProcessed);
      if (orders.length < BATCH_SIZE) break;
    }

    return {
      totalPurchaseOrdersScanned: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}


// // services/sync/purchase/purchase-order-sync.service.ts

// import { prisma } from "@/lib/prisma";
// import { getPurchaseOrders } from "../data/purchase-orders";
// import { syncPurchaseOrder } from "./purchase-order.sync";

// type SyncOptions = {
//   onProgress?: (processedCount: number) => Promise<void>;
//   batchSize?: number;
// };

// export class PurchaseOrderSyncService {
//   async sync(options?: SyncOptions) {
//     const BATCH_SIZE = options?.batchSize ?? 50;
//     let after: string | undefined;
//     let totalProcessed = 0;

//     console.log("Starting Master Purchase Order dependency-validated graph sync...");

//     while (true) {
//       const response = await getPurchaseOrders(BATCH_SIZE, after);
//       const orders = Array.isArray(response) ? response : (response as any)?.data || [];

//       if (!orders || orders.length === 0) break;

//       // Collect external IDs to batch check integrity
//       const vendorIds = new Set<string>();
//       const locationIds = new Set<string>();
//       const teamMemberIds = new Set<string>();
//       const productIds = new Set<string>();

//       for (const order of orders) {
//         if (order.vendorId) vendorIds.add(order.vendorId);
//         if (order.locationId) locationIds.add(order.locationId);
//         if (order.assignedToTeamMemberId) teamMemberIds.add(order.assignedToTeamMemberId);
//         if (order.approverTeamMemberId) teamMemberIds.add(order.approverTeamMemberId);
//         if (order.lastModifiedById) teamMemberIds.add(order.lastModifiedById);

//         order.lines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.receiveLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.unstockLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//       }

//       // Query verification references in parallel blocks across the whole batch
//       const [dbVendors, dbLocations, dbTeam, dbProducts] = await Promise.all([
//         prisma.vendor.findMany({ where: { inflowId: { in: Array.from(vendorIds) } }, select: { inflowId: true } }),
//         prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
//         prisma.teamMember.findMany({ where: { inflowId: { in: Array.from(teamMemberIds) } }, select: { inflowId: true } }),
//         prisma.product.findMany({ where: { inflowId: { in: Array.from(productIds) } }, select: { inflowId: true } }),
//       ]);

//       // Set configurations (Vendors are bypassed intentionally to go through the JIT self-healing layer)
//       const validationSets = {
//         validLocations: new Set(dbLocations.map((l) => l.inflowId)),
//         validTeamMembers: new Set(dbTeam.map((tm) => tm.inflowId)),
//         validProducts: new Set(dbProducts.map((p) => p.inflowId)),
//       };

//       // Wrap item execution inside a long-running batch transaction wrapper
//       await prisma.$transaction(
//         async (tx) => {
//           for (const order of orders) {
//             await syncPurchaseOrder(tx, order, validationSets);
//           }
//         },
//         { timeout: 90000 } // Expanded to 90s to easily absorb recursive auto-healing vendor logic
//       );

//       totalProcessed += orders.length;
//       after = orders[orders.length - 1].purchaseOrderId;

//       if (options?.onProgress) {
//         await options.onProgress(totalProcessed);
//       }

//       if (orders.length < BATCH_SIZE) break;
//     }

//     return {
//       totalPurchaseOrdersScanned: totalProcessed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }

// // services/sync/purchase/purchase-order-sync.service.ts
// import { prisma } from "@/lib/prisma";
// import { getPurchaseOrders } from "../data/purchase-orders";
// import { PurchaseOrderMapper } from "./purchase-order-mappers";
// import { Prisma } from "@/generated/prisma/client";

// type SyncOptions = {
//   onProgress?: (processedCount: number) => Promise<void>;
//   batchSize?: number;
// };

// export class PurchaseOrderSyncService {
//   async sync(options?: SyncOptions) {
//     const BATCH_SIZE = options?.batchSize ?? 50;
//     let after: string | undefined;
//     let totalProcessed = 0;

//     console.log("Starting Master Purchase Order dependency-validated graph sync...");

//     while (true) {
//       const response = await getPurchaseOrders(BATCH_SIZE, after);
//       const orders = Array.isArray(response) ? response : (response as any)?.data || [];

//       if (!orders || orders.length === 0) break;

//       // Collect external IDs to batch check integrity
//       const vendorIds = new Set<string>();
//       const locationIds = new Set<string>();
//       const teamMemberIds = new Set<string>();
//       const productIds = new Set<string>();

//       for (const order of orders) {
//         if (order.vendorId) vendorIds.add(order.vendorId);
//         if (order.locationId) locationIds.add(order.locationId);
//         if (order.assignedToTeamMemberId) teamMemberIds.add(order.assignedToTeamMemberId);
//         if (order.approverTeamMemberId) teamMemberIds.add(order.approverTeamMemberId);
//         if (order.lastModifiedById) teamMemberIds.add(order.lastModifiedById);

//         order.lines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.receiveLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.unstockLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//       }

//       // Query verification references in parallel blocks
//       const [dbVendors, dbLocations, dbTeam, dbProducts] = await Promise.all([
//         prisma.vendor.findMany({ where: { inflowId: { in: Array.from(vendorIds) } }, select: { inflowId: true } }),
//         prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
//         prisma.teamMember.findMany({ where: { inflowId: { in: Array.from(teamMemberIds) } }, select: { inflowId: true } }),
//         prisma.product.findMany({ where: { inflowId: { in: Array.from(productIds) } }, select: { inflowId: true } }),
//       ]);

//       const validVendors = new Set(dbVendors.map((v) => v.inflowId));
//       const validLocations = new Set(dbLocations.map((l) => l.inflowId));
//       const validTeamMembers = new Set(dbTeam.map((tm) => tm.inflowId));
//       const validProducts = new Set(dbProducts.map((p) => p.inflowId));

//       for (const order of orders) {
//         // Vendor relation is required non-nullable in schema
//         if (!validVendors.has(order.vendorId)) {
//           console.warn(`Skipping PO ${order.orderNumber}: Parent Vendor ${order.vendorId} missing from database.`);
//           continue;
//         }

//         const cleanLocationId = order.locationId && validLocations.has(order.locationId) ? order.locationId : null;
//         const cleanAssignedId = order.assignedToTeamMemberId && validTeamMembers.has(order.assignedToTeamMemberId) ? order.assignedToTeamMemberId : null;
//         const cleanApproverId = order.approverTeamMemberId && validTeamMembers.has(order.approverTeamMemberId) ? order.approverTeamMemberId : null;

//         await prisma.$transaction(async (tx) => {
//           // A. Upsert parent Purchase Order record
//           await tx.purchaseOrder.upsert({
//             where: { inflowId: order.purchaseOrderId },
//             update: {
//               orderNumber: order.orderNumber,
//               vendorOrderNumber: order.vendorOrderNumber || null,
//               subTotal: new Prisma.Decimal(order.subTotal || 0),
//               total: new Prisma.Decimal(order.total || 0),
//               amountPaid: new Prisma.Decimal(order.amountPaid || 0),
//               balance: new Prisma.Decimal(order.balance || 0),
//               freight: new Prisma.Decimal(order.freight || 0),
//               returnFee: new Prisma.Decimal(order.returnFee || 0),
//               returnExtra: new Prisma.Decimal(order.returnExtra || 0),
//               exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
//               exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
//               paymentStatus: order.paymentStatus,
//               inventoryStatus: order.inventoryStatus,
//               isCancelled: order.isCancelled ?? false,
//               isCompleted: order.isCompleted ?? false,
//               isQuote: order.isQuote ?? false,
//               isTaxInclusive: order.isTaxInclusive ?? false,
//               showShipping: order.showShipping ?? true,
//               carrier: order.carrier || null,
//               orderDate: order.orderDate ? new Date(order.orderDate) : null,
//               dueDate: order.dueDate ? new Date(order.dueDate) : null,
//               requestShipDate: order.requestShipDate ? new Date(order.requestShipDate) : null,
//               contactName: order.contactName || null,
//               email: order.email || null,
//               phone: order.phone || null,
//               orderRemarks: order.orderRemarks || null,
//               receiveRemarks: order.receiveRemarks || null,
//               returnRemarks: order.returnRemarks || null,
//               unstockRemarks: order.unstockRemarks || null,
//               shipToCompanyName: order.shipToCompanyName || null,
//               timestamp: order.timestamp,
//               shipToAddress: order.shipToAddress || Prisma.DbNull,
//               vendorAddress: order.vendorAddress || Prisma.DbNull,
//               customFields: order.customFields || Prisma.DbNull,
//               nonVendorCosts: order.nonVendorCosts || Prisma.DbNull,
//               vendorId: order.vendorId,
//               locationId: cleanLocationId,
//               assignedToTeamMemberId: cleanAssignedId,
//               approverTeamMemberId: cleanApproverId,
//               lastModifiedById: order.lastModifiedById || null,
//               currencyId: order.currencyId || null,
//               paymentTermsId: order.paymentTermsId || null,
//               taxingSchemeId: order.taxingSchemeId || null,
//               calculateTax2OnTax1: order.calculateTax2OnTax1 ?? false,
//               tax1: new Prisma.Decimal(order.tax1 || 0),
//               tax1Name: order.tax1Name || null,
//               tax1OnShipping: order.tax1OnShipping ?? false,
//               tax1Rate: new Prisma.Decimal(order.tax1Rate || 0),
//               tax2: new Prisma.Decimal(order.tax2 || 0),
//               tax2Name: order.tax2Name || null,
//               tax2OnShipping: order.tax2OnShipping ?? false,
//               tax2Rate: new Prisma.Decimal(order.tax2Rate || 0),
//             },
//             create: {
//               id: order.purchaseOrderId,
//               inflowId: order.purchaseOrderId,
//               orderNumber: order.orderNumber,
//               vendorOrderNumber: order.vendorOrderNumber || null,
//               subTotal: new Prisma.Decimal(order.subTotal || 0),
//               total: new Prisma.Decimal(order.total || 0),
//               amountPaid: new Prisma.Decimal(order.amountPaid || 0),
//               balance: new Prisma.Decimal(order.balance || 0),
//               freight: new Prisma.Decimal(order.freight || 0),
//               returnFee: new Prisma.Decimal(order.returnFee || 0),
//               returnExtra: new Prisma.Decimal(order.returnExtra || 0),
//               exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
//               exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
//               paymentStatus: order.paymentStatus,
//               inventoryStatus: order.inventoryStatus,
//               isCancelled: order.isCancelled ?? false,
//               isCompleted: order.isCompleted ?? false,
//               isQuote: order.isQuote ?? false,
//               isTaxInclusive: order.isTaxInclusive ?? false,
//               showShipping: order.showShipping ?? true,
//               carrier: order.carrier || null,
//               orderDate: order.orderDate ? new Date(order.orderDate) : null,
//               dueDate: order.dueDate ? new Date(order.dueDate) : null,
//               requestShipDate: order.requestShipDate ? new Date(order.requestShipDate) : null,
//               contactName: order.contactName || null,
//               email: order.email || null,
//               phone: order.phone || null,
//               orderRemarks: order.orderRemarks || null,
//               receiveRemarks: order.receiveRemarks || null,
//               returnRemarks: order.returnRemarks || null,
//               unstockRemarks: order.unstockRemarks || null,
//               shipToCompanyName: order.shipToCompanyName || null,
//               timestamp: order.timestamp,
//               shipToAddress: order.shipToAddress || Prisma.DbNull,
//               vendorAddress: order.vendorAddress || Prisma.DbNull,
//               customFields: order.customFields || Prisma.DbNull,
//               nonVendorCosts: order.nonVendorCosts || Prisma.DbNull,
//               vendorId: order.vendorId,
//               locationId: cleanLocationId,
//               assignedToTeamMemberId: cleanAssignedId,
//               approverTeamMemberId: cleanApproverId,
//               lastModifiedById: order.lastModifiedById || null,
//               currencyId: order.currencyId || null,
//               paymentTermsId: order.paymentTermsId || null,
//               taxingSchemeId: order.taxingSchemeId || null,
//               calculateTax2OnTax1: order.calculateTax2OnTax1 ?? false,
//               tax1: new Prisma.Decimal(order.tax1 || 0),
//               tax1Name: order.tax1Name || null,
//               tax1OnShipping: order.tax1OnShipping ?? false,
//               tax1Rate: new Prisma.Decimal(order.tax1Rate || 0),
//               tax2: new Prisma.Decimal(order.tax2 || 0),
//               tax2Name: order.tax2Name || null,
//               tax2OnShipping: order.tax2OnShipping ?? false,
//               tax2Rate: new Prisma.Decimal(order.tax2Rate || 0),
//             },
//           });

//           // B. Wipe stale child dependent rows
//           await Promise.all([
//             tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
//             tx.purchaseOrderReceiveLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
//             tx.purchaseOrderUnstockLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
//             tx.purchaseOrderPaymentLine.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
//             tx.purchaseOrderAttachment.deleteMany({ where: { purchaseOrderId: order.purchaseOrderId } }),
//           ]);

//           // C. Re-insert isolated child tracking arrays utilizing the helper mappers
//           const lines = PurchaseOrderMapper.mapLines(order.lines, order.purchaseOrderId, validProducts);
//           if (lines.length) await tx.purchaseOrderLine.createMany({ data: lines });

//           const receiveLines = PurchaseOrderMapper.mapReceiveLines(order.receiveLines, order.purchaseOrderId, validProducts);
//           if (receiveLines.length) await tx.purchaseOrderReceiveLine.createMany({ data: receiveLines });

//           const unstockLines = PurchaseOrderMapper.mapUnstockLines(order.unstockLines, order.purchaseOrderId, validProducts);
//           if (unstockLines.length) await tx.purchaseOrderUnstockLine.createMany({ data: unstockLines });

//           const paymentLines = PurchaseOrderMapper.mapPaymentLines(order.paymentLines, order.purchaseOrderId);
//           if (paymentLines.length) await tx.purchaseOrderPaymentLine.createMany({ data: paymentLines });

//           const attachments = PurchaseOrderMapper.mapAttachments(order.attachments, order.purchaseOrderId);
//           if (attachments.length) await tx.purchaseOrderAttachment.createMany({ data: attachments });
          
//         }, { timeout: 30000 });
//       }

//       totalProcessed += orders.length;
//       after = orders[orders.length - 1].purchaseOrderId;

//       if (options?.onProgress) {
//         await options.onProgress(totalProcessed);
//       }

//       if (orders.length < BATCH_SIZE) break;
//     }

//     return {
//       totalPurchaseOrdersScanned: totalProcessed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }
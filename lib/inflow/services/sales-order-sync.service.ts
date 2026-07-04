// services/sync/sales/sales-order-sync.service.ts

import { prisma } from "@/lib/prisma";
import { getSalesOrders } from "../data/sales-orders";
import { syncSalesOrder } from "./sales-order.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class SalesOrderSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 50;
    let after: string | undefined;
    let totalProcessed = 0;

    console.log("Starting master Sales Order multi-relation graph sync...");

    while (true) {
      const response = await getSalesOrders(BATCH_SIZE, after);
      const orders = Array.isArray(response) ? response : (response as any)?.data || [];

      if (!orders || orders.length === 0) break;

      // Gather cross-references for batch validation mapping
      const customerIds = new Set<string>();
      const locationIds = new Set<string>();
      const paymentTermsIds = new Set<string>();
      const teamMemberIds = new Set<string>();
      const productIds = new Set<string>();

      for (const order of orders) {
        if (order.customerId) customerIds.add(order.customerId);
        if (order.locationId) locationIds.add(order.locationId);
        if (order.paymentTermsId) paymentTermsIds.add(order.paymentTermsId);
        if (order.assignedToTeamMemberId) teamMemberIds.add(order.assignedToTeamMemberId);
        if (order.confirmerTeamMemberId) teamMemberIds.add(order.confirmerTeamMemberId);
        if (order.salesRepTeamMemberId) teamMemberIds.add(order.salesRepTeamMemberId);

        order.lines?.forEach((l: any) => l.productId && productIds.add(l.productId));
        order.packLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
        order.pickLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
        order.pickAllocationLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
        order.pickAllocationFailures?.forEach((l: any) => l.productId && productIds.add(l.productId));
        order.restockLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
      }

      // Check validation references in parallel across the batch
      const [dbCustomers, dbLocations, dbTerms, dbTeam, dbProducts] = await Promise.all([
        prisma.customer.findMany({ where: { inflowId: { in: Array.from(customerIds) } }, select: { inflowId: true } }),
        prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
        prisma.paymentTerm.findMany({ where: { inflowId: { in: Array.from(paymentTermsIds) } }, select: { inflowId: true } }),
        prisma.teamMember.findMany({ where: { inflowId: { in: Array.from(teamMemberIds) } }, select: { inflowId: true } }),
        prisma.product.findMany({ where: { inflowId: { in: Array.from(productIds) } }, select: { inflowId: true } }),
      ]);

      // Customers lookup continues to bypass initial skip via the functional module's JIT recovery layer
      const validationSets = {
        validLocations: new Set(dbLocations.map((l) => l.inflowId)),
        validTerms: new Set(dbTerms.map((t) => t.inflowId)),
        validTeamMembers: new Set(dbTeam.map((tm) => tm.inflowId)),
        validProducts: new Set(dbProducts.map((p) => p.inflowId)),
      };

      // Wrap item execution inside sequential database transactional execution blocks
      await prisma.$transaction(
        async (tx) => {
          for (const order of orders) {
            await syncSalesOrder(tx, order, validationSets);
          }
        },
        { timeout: 90000 } // Expanded to 90s to comfortably handle child deletions and inline createMany writes
      );

      totalProcessed += orders.length;
      after = orders[orders.length - 1].salesOrderId;

      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }

      if (orders.length < BATCH_SIZE) break;
    }

    return {
      totalSalesOrdersScanned: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}


// // services/sync/sales/sales-order-sync.service.ts
// import { prisma } from "@/lib/prisma";
// import { getSalesOrders } from "../data/sales-orders";
// import { SalesOrderMapper } from "./sales-order-mappers";
// import { Prisma } from "@/generated/prisma/client";

// type SyncOptions = {
//   onProgress?: (processedCount: number) => Promise<void>;
//   batchSize?: number;
// };

// export class SalesOrderSyncService {
//   async sync(options?: SyncOptions) {
//     const BATCH_SIZE = options?.batchSize ?? 50;
//     let after: string | undefined;
//     let totalProcessed = 0;

//     console.log("Starting master Sales Order multi-relation graph sync...");

//     while (true) {
//       const response = await getSalesOrders(BATCH_SIZE, after);
//       const orders = Array.isArray(response) ? response : (response as any)?.data || [];

//       if (!orders || orders.length === 0) break;

//       // Gather cross-references
//       const customerIds = new Set<string>();
//       const locationIds = new Set<string>();
//       const paymentTermsIds = new Set<string>();
//       const teamMemberIds = new Set<string>();
//       const productIds = new Set<string>();

//       for (const order of orders) {
//         if (order.customerId) customerIds.add(order.customerId);
//         if (order.locationId) locationIds.add(order.locationId);
//         if (order.paymentTermsId) paymentTermsIds.add(order.paymentTermsId);
//         if (order.assignedToTeamMemberId) teamMemberIds.add(order.assignedToTeamMemberId);
//         if (order.confirmerTeamMemberId) teamMemberIds.add(order.confirmerTeamMemberId);
//         if (order.salesRepTeamMemberId) teamMemberIds.add(order.salesRepTeamMemberId);

//         order.lines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.packLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.pickLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.pickAllocationLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.pickAllocationFailures?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.restockLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//       }

//       // Check validation references in parallel
//       const [dbCustomers, dbLocations, dbTerms, dbTeam, dbProducts] = await Promise.all([
//         prisma.customer.findMany({ where: { inflowId: { in: Array.from(customerIds) } }, select: { inflowId: true } }),
//         prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
//         prisma.paymentTerms.findMany({ where: { inflowId: { in: Array.from(paymentTermsIds) } }, select: { inflowId: true } }),
//         prisma.teamMember.findMany({ where: { inflowId: { in: Array.from(teamMemberIds) } }, select: { inflowId: true } }),
//         prisma.product.findMany({ where: { inflowId: { in: Array.from(productIds) } }, select: { inflowId: true } }),
//       ]);

//       const validCustomers = new Set(dbCustomers.map((c) => c.inflowId));
//       const validLocations = new Set(dbLocations.map((l) => l.inflowId));
//       const validTerms = new Set(dbTerms.map((t) => t.inflowId));
//       const validTeamMembers = new Set(dbTeam.map((tm) => tm.inflowId));
//       const validProducts = new Set(dbProducts.map((p) => p.inflowId));

//       for (const order of orders) {
//         if (!validCustomers.has(order.customerId)) {
//           console.warn(`Skipping order ${order.orderNumber}: Customer ${order.customerId} missing.`);
//           continue;
//         }

//         const cleanLocationId = order.locationId && validLocations.has(order.locationId) ? order.locationId : null;
//         const cleanTermsId = order.paymentTermsId && validTerms.has(order.paymentTermsId) ? order.paymentTermsId : null;
//         const cleanAssignedId = order.assignedToTeamMemberId && validTeamMembers.has(order.assignedToTeamMemberId) ? order.assignedToTeamMemberId : null;
//         const cleanConfirmerId = order.confirmerTeamMemberId && validTeamMembers.has(order.confirmerTeamMemberId) ? order.confirmerTeamMemberId : null;
//         const cleanSalesRepId = order.salesRepTeamMemberId && validTeamMembers.has(order.salesRepTeamMemberId) ? order.salesRepTeamMemberId : null;

//         await prisma.$transaction(async (tx) => {
//           // A. Upsert parent SalesOrder record
//           await tx.salesOrder.upsert({
//             where: { inflowId: order.salesOrderId },
//             update: {
//               orderNumber: order.orderNumber,
//               poNumber: order.poNumber || null,
//               externalId: order.externalId || null,
//               source: order.source || null,
//               subTotal: new Prisma.Decimal(order.subTotal || 0),
//               total: new Prisma.Decimal(order.total || 0),
//               amountPaid: new Prisma.Decimal(order.amountPaid || 0),
//               balance: new Prisma.Decimal(order.balance || 0),
//               orderFreight: new Prisma.Decimal(order.orderFreight || 0),
//               returnFee: new Prisma.Decimal(order.returnFee || 0),
//               returnFreight: new Prisma.Decimal(order.returnFreight || 0),
//               exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
//               exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
//               paymentStatus: order.paymentStatus,
//               inventoryStatus: order.inventoryStatus,
//               isCancelled: order.isCancelled ?? false,
//               isCompleted: order.isCompleted ?? false,
//               isFullyPicked: order.isFullyPicked ?? false,
//               isInvoiced: order.isInvoiced ?? false,
//               isPicking: order.isPicking ?? false,
//               isPrioritized: order.isPrioritized ?? false,
//               isQuote: order.isQuote ?? false,
//               isTaxInclusive: order.isTaxInclusive ?? false,
//               needsConfirmation: order.needsConfirmation ?? false,
//               orderDate: order.orderDate ? new Date(order.orderDate) : null,
//               dueDate: order.dueDate ? new Date(order.dueDate) : null,
//               invoicedDate: order.invoicedDate ? new Date(order.invoicedDate) : null,
//               paidDate: order.paidDate ? new Date(order.paidDate) : null,
//               requestedShipDate: order.requestedShipDate ? new Date(order.requestedShipDate) : null,
//               shippedDate: order.shippedDate ? new Date(order.shippedDate) : null,
//               contactName: order.contactName || null,
//               email: order.email || null,
//               phone: order.phone || null,
//               orderRemarks: order.orderRemarks || null,
//               packRemarks: order.packRemarks || null,
//               pickRemarks: order.pickRemarks || null,
//               restockRemarks: order.restockRemarks || null,
//               returnRemarks: order.returnRemarks || null,
//               shipRemarks: order.shipRemarks || null,
//               shipToCompanyName: order.shipToCompanyName || null,
//               showShipping: order.showShipping ?? true,
//               timestamp: order.timestamp,
//               billingAddress: order.billingAddress || Prisma.DbNull,
//               shippingAddress: order.shippingAddress || Prisma.DbNull,
//               customFields: order.customFields || Prisma.DbNull,
//               nonCustomerCost: order.nonCustomerCost || Prisma.DbNull,
//               sameBillingAndShipping: order.sameBillingAndShipping ?? false,
//               customerId: order.customerId,
//               locationId: cleanLocationId,
//               paymentTermsId: cleanTermsId,
//               assignedToTeamMemberId: cleanAssignedId,
//               confirmerTeamMemberId: cleanConfirmerId,
//               salesRepTeamMemberId: cleanSalesRepId,
//               salesRep: order.salesRep || null,
//               pricingSchemeId: order.pricingSchemeId || null,
//               taxingSchemeId: order.taxingSchemeId || null,
//               currencyId: order.currencyId || null,
//               lastModifiedById: order.lastModifiedById || null,
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
//               id: order.salesOrderId,
//               inflowId: order.salesOrderId,
//               orderNumber: order.orderNumber,
//               poNumber: order.poNumber || null,
//               externalId: order.externalId || null,
//               source: order.source || null,
//               subTotal: new Prisma.Decimal(order.subTotal || 0),
//               total: new Prisma.Decimal(order.total || 0),
//               amountPaid: new Prisma.Decimal(order.amountPaid || 0),
//               balance: new Prisma.Decimal(order.balance || 0),
//               orderFreight: new Prisma.Decimal(order.orderFreight || 0),
//               returnFee: new Prisma.Decimal(order.returnFee || 0),
//               returnFreight: new Prisma.Decimal(order.returnFreight || 0),
//               exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
//               exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
//               paymentStatus: order.paymentStatus,
//               inventoryStatus: order.inventoryStatus,
//               isCancelled: order.isCancelled ?? false,
//               isCompleted: order.isCompleted ?? false,
//               isFullyPicked: order.isFullyPicked ?? false,
//               isInvoiced: order.isInvoiced ?? false,
//               isPicking: order.isPicking ?? false,
//               isPrioritized: order.isPrioritized ?? false,
//               isQuote: order.isQuote ?? false,
//               isTaxInclusive: order.isTaxInclusive ?? false,
//               needsConfirmation: order.needsConfirmation ?? false,
//               orderDate: order.orderDate ? new Date(order.orderDate) : null,
//               dueDate: order.dueDate ? new Date(order.dueDate) : null,
//               invoicedDate: order.invoicedDate ? new Date(order.invoicedDate) : null,
//               paidDate: order.paidDate ? new Date(order.paidDate) : null,
//               requestedShipDate: order.requestedShipDate ? new Date(order.requestedShipDate) : null,
//               shippedDate: order.shippedDate ? new Date(order.shippedDate) : null,
//               contactName: order.contactName || null,
//               email: order.email || null,
//               phone: order.phone || null,
//               orderRemarks: order.orderRemarks || null,
//               packRemarks: order.packRemarks || null,
//               pickRemarks: order.pickRemarks || null,
//               restockRemarks: order.restockRemarks || null,
//               returnRemarks: order.returnRemarks || null,
//               shipRemarks: order.shipRemarks || null,
//               shipToCompanyName: order.shipToCompanyName || null,
//               showShipping: order.showShipping ?? true,
//               timestamp: order.timestamp,
//               billingAddress: order.billingAddress || Prisma.DbNull,
//               shippingAddress: order.shippingAddress || Prisma.DbNull,
//               customFields: order.customFields || Prisma.DbNull,
//               nonCustomerCost: order.nonCustomerCost || Prisma.DbNull,
//               sameBillingAndShipping: order.sameBillingAndShipping ?? false,
//               customerId: order.customerId,
//               locationId: cleanLocationId,
//               paymentTermsId: cleanTermsId,
//               assignedToTeamMemberId: cleanAssignedId,
//               confirmerTeamMemberId: cleanConfirmerId,
//               salesRepTeamMemberId: cleanSalesRepId,
//               salesRep: order.salesRep || null,
//               pricingSchemeId: order.pricingSchemeId || null,
//               taxingSchemeId: order.taxingSchemeId || null,
//               currencyId: order.currencyId || null,
//               lastModifiedById: order.lastModifiedById || null,
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

//           // B. Clear stale child dependencies
//           await Promise.all([
//             tx.salesOrderLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderPackLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderPickLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderPickAllocationLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderPickAllocationFailure.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderRestockLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderShipLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderPaymentLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.costOfGoodsSold.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//           ]);

//           // C. Re-write records utilizing the helper mappers
//           const lines = SalesOrderMapper.mapLines(order.lines, order.salesOrderId, validProducts);
//           if (lines.length) await tx.salesOrderLine.createMany({ data: lines });

//           const packLines = SalesOrderMapper.mapPackLines(order.packLines, order.salesOrderId, validProducts);
//           if (packLines.length) await tx.salesOrderPackLine.createMany({ data: packLines });

//           const pickLines = SalesOrderMapper.mapPickLines(order.pickLines, order.salesOrderId, validProducts);
//           if (pickLines.length) await tx.salesOrderPickLine.createMany({ data: pickLines });

//           const allocLines = SalesOrderMapper.mapAllocationLines(order.pickAllocationLines, order.salesOrderId, validProducts);
//           if (allocLines.length) await tx.salesOrderPickAllocationLine.createMany({ data: allocLines });

//           const failures = SalesOrderMapper.mapAllocationFailures(order.pickAllocationFailures, order.salesOrderId, validProducts);
//           if (failures.length) await tx.salesOrderPickAllocationFailure.createMany({ data: failures });

//           const restockLines = SalesOrderMapper.mapRestockLines(order.restockLines, order.salesOrderId, validProducts);
//           if (restockLines.length) await tx.salesOrderRestockLine.createMany({ data: restockLines });

//           const shipLines = SalesOrderMapper.mapShipLines(order.shipLines, order.salesOrderId);
//           if (shipLines.length) await tx.salesOrderShipLine.createMany({ data: shipLines });

//           const paymentLines = SalesOrderMapper.mapPaymentLines(order.paymentLines, order.salesOrderId);
//           if (paymentLines.length) await tx.salesOrderPaymentLine.createMany({ data: paymentLines });

//           if (order.costOfGoodsSold) {
//             await tx.costOfGoodsSold.create({
//               data: {
//                 salesOrderCostOfGoodsSoldId: order.costOfGoodsSold.salesOrderCostOfGoodsSoldId,
//                 salesOrderId: order.salesOrderId,
//                 costOfGoodsSold: new Prisma.Decimal(order.costOfGoodsSold.costOfGoodsSold || 0),
//               },
//             });
//           }
//         }, { timeout: 45000 });
//       }

//       totalProcessed += orders.length;
//       after = orders[orders.length - 1].salesOrderId;

//       if (options?.onProgress) {
//         await options.onProgress(totalProcessed);
//       }

//       if (orders.length < BATCH_SIZE) break;
//     }

//     return {
//       totalSalesOrdersScanned: totalProcessed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }

// // services/sync/sales/sales-order-sync.service.ts
// import { prisma } from "@/lib/prisma";
// import { getSalesOrders } from "../data/sales-orders"; // Your fetcher with explicit string includes
// import { Prisma } from "@/generated/prisma/client";

// type SyncOptions = {
//   onProgress?: (processedCount: number) => Promise<void>;
//   batchSize?: number;
// };

// export class SalesOrderSyncService {
//   async sync(options?: SyncOptions) {
//     const BATCH_SIZE = options?.batchSize ?? 50; // Smaller batches are safer for deep graphs
//     let after: string | undefined;
//     let totalProcessed = 0;

//     console.log("Starting master Sales Order multi-relation graph sync...");

//     while (true) {
//       // 1. Fetch sales orders payload containing deep inclusions from inFlow
//       const response = await getSalesOrders(BATCH_SIZE, after);
//       const orders = Array.isArray(response) ? response : (response as any)?.data || [];

//       if (!orders || orders.length === 0) {
//         break;
//       }

//       // 2. Pre-flight Validation Phase: Gather unique master identifiers
//       const customerIds = new Set<string>();
//       const locationIds = new Set<string>();
//       const paymentTermsIds = new Set<string>();
//       const teamMemberIds = new Set<string>();
//       const productIds = new Set<string>();

//       for (const order of orders) {
//         if (order.customerId) customerIds.add(order.customerId);
//         if (order.locationId) locationIds.add(order.locationId);
//         if (order.paymentTermsId) paymentTermsIds.add(order.paymentTermsId);
//         if (order.assignedToTeamMemberId) teamMemberIds.add(order.assignedToTeamMemberId);
//         if (order.confirmerTeamMemberId) teamMemberIds.add(order.confirmerTeamMemberId);
//         if (order.salesRepTeamMemberId) teamMemberIds.add(order.salesRepTeamMemberId);

//         // Gather deep line-item dependencies
//         order.lines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.packLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.pickLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.pickAllocationLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.pickAllocationFailures?.forEach((l: any) => l.productId && productIds.add(l.productId));
//         order.restockLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
//       }



//       // 3. Query local existence tables in parallel
//       const [dbCustomers, dbLocations, dbTerms, dbTeam, dbProducts] = await Promise.all([
//         prisma.customer.findMany({ where: { inflowId: { in: Array.from(customerIds) } }, select: { inflowId: true } }),
//         prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
//         prisma.paymentTerms.findMany({ where: { inflowId: { in: Array.from(paymentTermsIds) } }, select: { inflowId: true } }),
//         prisma.teamMember.findMany({ where: { inflowId: { in: Array.from(teamMemberIds) } }, select: { inflowId: true } }),
//         prisma.product.findMany({ where: { inflowId: { in: Array.from(productIds) } }, select: { inflowId: true } }),
//       ]);

//       const validCustomers = new Set(dbCustomers.map((c) => c.inflowId));
//       const validLocations = new Set(dbLocations.map((l) => l.inflowId));
//       const validTerms = new Set(dbTerms.map((t) => t.inflowId));
//       const validTeamMembers = new Set(dbTeam.map((tm) => tm.inflowId));
//       const validProducts = new Set(dbProducts.map((p) => p.inflowId));

//       // 4. Loop orders down the transaction engine
//       for (const order of orders) {
//         // Essential core structural check
//         if (!validCustomers.has(order.customerId)) {
//           console.warn(`Skipping order ${order.orderNumber}: Customer reference (${order.customerId}) missing locally.`);
//           continue;
//         }

//         const cleanLocationId = order.locationId && validLocations.has(order.locationId) ? order.locationId : null;
//         const cleanTermsId = order.paymentTermsId && validTerms.has(order.paymentTermsId) ? order.paymentTermsId : null;
//         const cleanAssignedId = order.assignedToTeamMemberId && validTeamMembers.has(order.assignedToTeamMemberId) ? order.assignedToTeamMemberId : null;
//         const cleanConfirmerId = order.confirmerTeamMemberId && validTeamMembers.has(order.confirmerTeamMemberId) ? order.confirmerTeamMemberId : null;
//         const cleanSalesRepId = order.salesRepTeamMemberId && validTeamMembers.has(order.salesRepTeamMemberId) ? order.salesRepTeamMemberId : null;

//         await prisma.$transaction(async (tx) => {
//           // A. Upsert the primary master SalesOrder document header
//           await tx.salesOrder.upsert({
//             where: { inflowId: order.salesOrderId },
//             update: {
//               orderNumber: order.orderNumber,
//               poNumber: order.poNumber || null,
//               externalId: order.externalId || null,
//               source: order.source || null,
//               subTotal: new Prisma.Decimal(order.subTotal || 0),
//               total: new Prisma.Decimal(order.total || 0),
//               amountPaid: new Prisma.Decimal(order.amountPaid || 0),
//               balance: new Prisma.Decimal(order.balance || 0),
//               orderFreight: new Prisma.Decimal(order.orderFreight || 0),
//               returnFee: new Prisma.Decimal(order.returnFee || 0),
//               returnFreight: new Prisma.Decimal(order.returnFreight || 0),
//               exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
//               exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
//               paymentStatus: order.paymentStatus,
//               inventoryStatus: order.inventoryStatus,
//               isCancelled: order.isCancelled ?? false,
//               isCompleted: order.isCompleted ?? false,
//               isFullyPicked: order.isFullyPicked ?? false,
//               isInvoiced: order.isInvoiced ?? false,
//               isPicking: order.isPicking ?? false,
//               isPrioritized: order.isPrioritized ?? false,
//               isQuote: order.isQuote ?? false,
//               isTaxInclusive: order.isTaxInclusive ?? false,
//               needsConfirmation: order.needsConfirmation ?? false,
//               orderDate: order.orderDate ? new Date(order.orderDate) : null,
//               dueDate: order.dueDate ? new Date(order.dueDate) : null,
//               invoicedDate: order.invoicedDate ? new Date(order.invoicedDate) : null,
//               paidDate: order.paidDate ? new Date(order.paidDate) : null,
//               requestedShipDate: order.requestedShipDate ? new Date(order.requestedShipDate) : null,
//               shippedDate: order.shippedDate ? new Date(order.shippedDate) : null,
//               contactName: order.contactName || null,
//               email: order.email || null,
//               phone: order.phone || null,
//               orderRemarks: order.orderRemarks || null,
//               packRemarks: order.packRemarks || null,
//               pickRemarks: order.pickRemarks || null,
//               restockRemarks: order.restockRemarks || null,
//               returnRemarks: order.returnRemarks || null,
//               shipRemarks: order.shipRemarks || null,
//               shipToCompanyName: order.shipToCompanyName || null,
//               showShipping: order.showShipping ?? true,
//               timestamp: order.timestamp,
//               billingAddress: order.billingAddress || Prisma.DbNull,
//               shippingAddress: order.shippingAddress || Prisma.DbNull,
//               customFields: order.customFields || Prisma.DbNull,
//               nonCustomerCost: order.nonCustomerCost || Prisma.DbNull,
//               sameBillingAndShipping: order.sameBillingAndShipping ?? false,
//               customerId: order.customerId,
//               locationId: cleanLocationId,
//               paymentTermsId: cleanTermsId,
//               assignedToTeamMemberId: cleanAssignedId,
//               confirmerTeamMemberId: cleanConfirmerId,
//               salesRepTeamMemberId: cleanSalesRepId,
//               salesRep: order.salesRep || null,
//               pricingSchemeId: order.pricingSchemeId || null,
//               taxingSchemeId: order.taxingSchemeId || null,
//               currencyId: order.currencyId || null,
//               lastModifiedById: order.lastModifiedById || null,
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
//               id: order.salesOrderId, // Match payload unique reference
//               inflowId: order.salesOrderId,
//               orderNumber: order.orderNumber,
//               poNumber: order.poNumber || null,
//               externalId: order.externalId || null,
//               source: order.source || null,
//               subTotal: new Prisma.Decimal(order.subTotal || 0),
//               total: new Prisma.Decimal(order.total || 0),
//               amountPaid: new Prisma.Decimal(order.amountPaid || 0),
//               balance: new Prisma.Decimal(order.balance || 0),
//               orderFreight: new Prisma.Decimal(order.orderFreight || 0),
//               returnFee: new Prisma.Decimal(order.returnFee || 0),
//               returnFreight: new Prisma.Decimal(order.returnFreight || 0),
//               exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
//               exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
//               paymentStatus: order.paymentStatus,
//               inventoryStatus: order.inventoryStatus,
//               isCancelled: order.isCancelled ?? false,
//               isCompleted: order.isCompleted ?? false,
//               isFullyPicked: order.isFullyPicked ?? false,
//               isInvoiced: order.isInvoiced ?? false,
//               isPicking: order.isPicking ?? false,
//               isPrioritized: order.isPrioritized ?? false,
//               isQuote: order.isQuote ?? false,
//               isTaxInclusive: order.isTaxInclusive ?? false,
//               needsConfirmation: order.needsConfirmation ?? false,
//               orderDate: order.orderDate ? new Date(order.orderDate) : null,
//               dueDate: order.dueDate ? new Date(order.dueDate) : null,
//               invoicedDate: order.invoicedDate ? new Date(order.invoicedDate) : null,
//               paidDate: order.paidDate ? new Date(order.paidDate) : null,
//               requestedShipDate: order.requestedShipDate ? new Date(order.requestedShipDate) : null,
//               shippedDate: order.shippedDate ? new Date(order.shippedDate) : null,
//               contactName: order.contactName || null,
//               email: order.email || null,
//               phone: order.phone || null,
//               orderRemarks: order.orderRemarks || null,
//               packRemarks: order.packRemarks || null,
//               pickRemarks: order.pickRemarks || null,
//               restockRemarks: order.restockRemarks || null,
//               returnRemarks: order.returnRemarks || null,
//               shipRemarks: order.shipRemarks || null,
//               shipToCompanyName: order.shipToCompanyName || null,
//               showShipping: order.showShipping ?? true,
//               timestamp: order.timestamp,
//               billingAddress: order.billingAddress || Prisma.DbNull,
//               shippingAddress: order.shippingAddress || Prisma.DbNull,
//               customFields: order.customFields || Prisma.DbNull,
//               nonCustomerCost: order.nonCustomerCost || Prisma.DbNull,
//               sameBillingAndShipping: order.sameBillingAndShipping ?? false,
//               customerId: order.customerId,
//               locationId: cleanLocationId,
//               paymentTermsId: cleanTermsId,
//               assignedToTeamMemberId: cleanAssignedId,
//               confirmerTeamMemberId: cleanConfirmerId,
//               salesRepTeamMemberId: cleanSalesRepId,
//               salesRep: order.salesRep || null,
//               pricingSchemeId: order.pricingSchemeId || null,
//               taxingSchemeId: order.taxingSchemeId || null,
//               currencyId: order.currencyId || null,
//               lastModifiedById: order.lastModifiedById || null,
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

//           // B. Clear and Rewrite Dependent Collections to support item mutations cleanly
//           await Promise.all([
//             tx.salesOrderLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderPackLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderPickLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderPickAllocationLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderPickAllocationFailure.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderRestockLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderShipLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.salesOrderPaymentLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//             tx.costOfGoodsSold.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
//           ]);

//           // 1. Sales Order Lines
//           const filteredLines = (order.lines || []).filter((l: any) => validProducts.has(l.productId));
//           if (filteredLines.length) {
//             await tx.salesOrderLine.createMany({
//               data: filteredLines.map((l: any) => ({
//                 salesOrderLineId: l.salesOrderLineId,
//                 salesOrderId: order.salesOrderId,
//                 productId: l.productId,
//                 description: l.description || null,
//                 unitPrice: new Prisma.Decimal(l.unitPrice || 0),
//                 subTotal: new Prisma.Decimal(l.subTotal || 0),
//                 discount: l.discount || Prisma.DbNull,
//                 isDiscarded: l.isDiscarded ?? false,
//                 serviceCompleted: l.serviceCompleted || null,
//                 returnDate: l.returnDate ? new Date(l.returnDate) : null,
//                 quantity: l.quantity || Prisma.DbNull,
//                 tax1Rate: new Prisma.Decimal(l.tax1Rate || 0),
//                 tax2Rate: new Prisma.Decimal(l.tax2Rate || 0),
//                 taxCodeId: l.taxCodeId || null,
//                 timestamp: l.timestamp,
//               })),
//             });
//           }

//           // 2. Pack Lines
//           const filteredPackLines = (order.packLines || []).filter((l: any) => validProducts.has(l.productId));
//           if (filteredPackLines.length) {
//             await tx.salesOrderPackLine.createMany({
//               data: filteredPackLines.map((l: any) => ({
//                 salesOrderPackLineId: l.salesOrderPackLineId,
//                 salesOrderId: order.salesOrderId,
//                 productId: l.productId,
//                 containerNumber: l.containerNumber || null,
//                 description: l.description || null,
//                 quantity: l.quantity || Prisma.DbNull,
//                 timestamp: l.timestamp,
//               })),
//             });
//           }

//           // 3. Pick Lines
//           const filteredPickLines = (order.pickLines || []).filter((l: any) => validProducts.has(l.productId));
//           if (filteredPickLines.length) {
//             await tx.salesOrderPickLine.createMany({
//               data: filteredPickLines.map((l: any) => ({
//                 salesOrderPickLineId: l.salesOrderPickLineId,
//                 salesOrderId: order.salesOrderId,
//                 productId: l.productId,
//                 lineNum: l.lineNum !== undefined ? String(l.lineNum) : null,
//                 locationId: l.locationId || null,
//                 sublocation: l.sublocation || null,
//                 pickDate: l.pickDate ? new Date(l.pickDate) : null,
//                 description: l.description || null,
//                 quantity: l.quantity || Prisma.DbNull,
//                 timestamp: l.timestamp,
//               })),
//             });
//           }

//           // 4. Allocation Lines
//           const filteredAllocLines = (order.pickAllocationLines || []).filter((l: any) => validProducts.has(l.productId));
//           if (filteredAllocLines.length) {
//             await tx.salesOrderPickAllocationLine.createMany({
//               data: filteredAllocLines.map((l: any) => ({
//                 salesOrderPickAllocationLineId: l.salesOrderPickAllocationLineId,
//                 salesOrderId: order.salesOrderId,
//                 productId: l.productId,
//                 lineNum: l.lineNum !== undefined ? String(l.lineNum) : null,
//                 locationId: l.locationId || null,
//                 sublocation: l.sublocation || null,
//                 quantity: l.quantity || Prisma.DbNull,
//                 timestamp: l.timestamp,
//               })),
//             });
//           }

//           // 5. Allocation Failures
//           const filteredAllocFailures = (order.pickAllocationFailures || []).filter((l: any) => validProducts.has(l.productId));
//           if (filteredAllocFailures.length) {
//             await tx.salesOrderPickAllocationFailure.createMany({
//               data: filteredAllocFailures.map((l: any) => ({
//                 salesOrderPickAllocationFailureId: l.salesOrderPickAllocationFailureId,
//                 salesOrderId: order.salesOrderId,
//                 productId: l.productId,
//                 lineNum: l.lineNum !== undefined ? String(l.lineNum) : null,
//                 hasExpiredLotsInStock: l.hasExpiredLotsInStock ?? false,
//                 quantity: l.quantity || Prisma.DbNull,
//                 timestamp: l.timestamp,
//               })),
//             });
//           }

//           // 6. Restock Lines
//           const filteredRestockLines = (order.restockLines || []).filter((l: any) => validProducts.has(l.productId));
//           if (filteredRestockLines.length) {
//             await tx.salesOrderRestockLine.createMany({
//               data: filteredRestockLines.map((l: any) => ({
//                 salesOrderRestockLineId: l.salesOrderRestockLineId,
//                 salesOrderId: order.salesOrderId,
//                 productId: l.productId,
//                 description: l.description || null,
//                 locationId: l.locationId || null,
//                 sublocation: l.sublocation || null,
//                 restockDate: l.restockDate ? new Date(l.restockDate) : null,
//                 quantity: l.quantity || Prisma.DbNull,
//                 timestamp: l.timestamp,
//               })),
//             });
//           }

//           // 7. Ship Lines
//           if (order.shipLines?.length) {
//             await tx.salesOrderShipLine.createMany({
//               data: order.shipLines.map((l: any) => ({
//                 salesOrderShipLineId: l.salesOrderShipLineId,
//                 salesOrderId: order.salesOrderId,
//                 carrier: l.carrier || null,
//                 trackingNumber: l.trackingNumber || null,
//                 shippedDate: l.shippedDate ? new Date(l.shippedDate) : null,
//                 easyPostShipmentId: l.easyPostShipmentId || null,
//                 easyPostShipmentStatus: l.easyPostShipmentStatus || null,
//                 easyPostConfirmationEmailAddress: l.easyPostConfirmationEmailAddress || null,
//                 containers: l.containers ? l.containers : Prisma.DbNull,
//                 timestamp: l.timestamp,
//               })),
//             });
//           }

//           // 8. Payment Lines
//           if (order.paymentLines?.length) {
//             await tx.salesOrderPaymentLine.createMany({
//               data: order.paymentLines.map((l: any) => ({
//                 salesOrderPaymentHistoryLineId: l.salesOrderPaymentHistoryLineId,
//                 salesOrderId: order.salesOrderId,
//                 lineNum: typeof l.lineNum === "string" ? parseInt(l.lineNum, 10) : l.lineNum || 0,
//                 amount: new Prisma.Decimal(l.amount || 0),
//                 datePaid: l.datePaid ? new Date(l.datePaid) : null,
//                 paymentMethod: l.paymentMethod || null,
//                 paymentType: l.paymentType || null,
//                 referenceNumber: l.referenceNumber || null,
//                 remarks: l.remarks || null,
//                 timestamp: l.timestamp,
//               })),
//             });
//           }

//           // 9. Cost of Goods Sold Object
//           if (order.costOfGoodsSold) {
//             await tx.costOfGoodsSold.create({
//               data: {
//                 salesOrderCostOfGoodsSoldId: order.costOfGoodsSold.salesOrderCostOfGoodsSoldId,
//                 salesOrderId: order.salesOrderId,
//                 costOfGoodsSold: new Prisma.Decimal(order.costOfGoodsSold.costOfGoodsSold || 0),
//               },
//             });
//           }
//         }, { timeout: 45000 }); // Large timeout block given the multiple underlying inserts
//       }

//       totalProcessed += orders.length;
//       after = orders[orders.length - 1].salesOrderId;

//       if (options?.onProgress) {
//         await options.onProgress(totalProcessed);
//       }

//       if (orders.length < BATCH_SIZE) {
//         break;
//       }
//     }

//     return {
//       totalSalesOrdersScanned: totalProcessed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }
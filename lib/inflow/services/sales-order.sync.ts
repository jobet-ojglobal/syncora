// services/sync/sales/sales-order.sync.ts

import { Prisma } from "@/generated/prisma/client";
import { SalesOrderMapper } from "./sales-order-mappers";
import { getCustomer } from "../data/customers";
import { syncCustomer } from "./customer.sync";

export interface SalesOrderSyncValidationSets {
  validLocations: Set<string>;
  validTerms: Set<string>;
  validTeamMembers: Set<string>;
  validProducts: Set<string>;
}

/**
 * Syncs a single sales order record along with all its respective child dependencies 
 * using an isolated, active transaction pointer instance.
 */
export async function syncSalesOrder(
  tx: any,
  order: any,
  validationSets: SalesOrderSyncValidationSets
) {
  const { validLocations, validTerms, validTeamMembers, validProducts } = validationSets;

  // 1. 🛡️ JIT Self-Healing Layer for missing Customers
  const customerExists = await tx.customer.findUnique({
    where: { inflowId: order.customerId },
    select: { id: true },
  });

  if (!customerExists) {
    try {
      console.log(`[JIT Sync] Customer "${order.customerId}" missing for Order ${order.orderNumber}. Recovering...`);
      const cloudCustomer = await getCustomer(order.customerId);
      
      if (cloudCustomer) {
        const customerCaches = {
          verifiedLocationIds: new Set<string>(),
          verifiedPaymentTermsIds: new Set<string>(),
        };
        await syncCustomer(tx, cloudCustomer, customerCaches);
        console.log(`[JIT Sync] Successfully recovered customer "${order.customerId}".`);
      } else {
        console.warn(`[Sync Skipped] Skipping order ${order.orderNumber}: Customer "${order.customerId}" missing from cloud API source.`);
        return null;
      }
    } catch (err) {
      console.error(`[JIT Sync Error] Failed to auto-heal customer "${order.customerId}" for order ${order.orderNumber}:`, err);
      return null;
    }
  }

  // 2. Clean structural operational relationship fields
  const cleanLocationId = order.locationId && validLocations.has(order.locationId) ? order.locationId : null;
  const cleanTermsId = order.paymentTermsId && validTerms.has(order.paymentTermsId) ? order.paymentTermsId : null;
  const cleanAssignedId = order.assignedToTeamMemberId && validTeamMembers.has(order.assignedToTeamMemberId) ? order.assignedToTeamMemberId : null;
  const cleanConfirmerId = order.confirmerTeamMemberId && validTeamMembers.has(order.confirmerTeamMemberId) ? order.confirmerTeamMemberId : null;
  const cleanSalesRepId = order.salesRepTeamMemberId && validTeamMembers.has(order.salesRepTeamMemberId) ? order.salesRepTeamMemberId : null;

  // 3. Upsert Parent Record
  await tx.salesOrder.upsert({
    where: { inflowId: order.salesOrderId },
    update: {
      orderNumber: order.orderNumber,
      poNumber: order.poNumber || null,
      externalId: order.externalId || null,
      source: order.source || null,
      subTotal: new Prisma.Decimal(order.subTotal || 0),
      total: new Prisma.Decimal(order.total || 0),
      amountPaid: new Prisma.Decimal(order.amountPaid || 0),
      balance: new Prisma.Decimal(order.balance || 0),
      orderFreight: new Prisma.Decimal(order.orderFreight || 0),
      returnFee: new Prisma.Decimal(order.returnFee || 0),
      returnFreight: new Prisma.Decimal(order.returnFreight || 0),
      exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
      exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
      paymentStatus: order.paymentStatus,
      inventoryStatus: order.inventoryStatus,
      isCancelled: order.isCancelled ?? false,
      isCompleted: order.isCompleted ?? false,
      isFullyPicked: order.isFullyPicked ?? false,
      isInvoiced: order.isInvoiced ?? false,
      isPicking: order.isPicking ?? false,
      isPrioritized: order.isPrioritized ?? false,
      isQuote: order.isQuote ?? false,
      isTaxInclusive: order.isTaxInclusive ?? false,
      needsConfirmation: order.needsConfirmation ?? false,
      orderDate: order.orderDate ? new Date(order.orderDate) : null,
      dueDate: order.dueDate ? new Date(order.dueDate) : null,
      invoicedDate: order.invoicedDate ? new Date(order.invoicedDate) : null,
      paidDate: order.paidDate ? new Date(order.paidDate) : null,
      requestedShipDate: order.requestedShipDate ? new Date(order.requestedShipDate) : null,
      shippedDate: order.shippedDate ? new Date(order.shippedDate) : null,
      contactName: order.contactName || null,
      email: order.email || null,
      phone: order.phone || null,
      orderRemarks: order.orderRemarks || null,
      packRemarks: order.packRemarks || null,
      pickRemarks: order.pickRemarks || null,
      restockRemarks: order.restockRemarks || null,
      returnRemarks: order.returnRemarks || null,
      shipRemarks: order.shipRemarks || null,
      shipToCompanyName: order.shipToCompanyName || null,
      showShipping: order.showShipping ?? true,
      billingAddress: order.billingAddress || Prisma.DbNull,
      shippingAddress: order.shippingAddress || Prisma.DbNull,
      customFields: order.customFields || Prisma.DbNull,
      nonCustomerCost: order.nonCustomerCost || Prisma.DbNull,
      sameBillingAndShipping: order.sameBillingAndShipping ?? false,
      customerId: order.customerId,
      locationId: cleanLocationId,
      paymentTermsId: cleanTermsId,
      assignedToTeamMemberId: cleanAssignedId,
      confirmerTeamMemberId: cleanConfirmerId,
      salesRepTeamMemberId: cleanSalesRepId,
      salesRep: order.salesRep || null,
      pricingSchemeId: order.pricingSchemeId || null,
      taxingSchemeId: order.taxingSchemeId || null,
      currencyId: order.currencyId || null,
      lastModifiedById: order.lastModifiedById || null,
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
      id: order.salesOrderId,
      inflowId: order.salesOrderId,
      orderNumber: order.orderNumber,
      poNumber: order.poNumber || null,
      externalId: order.externalId || null,
      source: order.source || null,
      subTotal: new Prisma.Decimal(order.subTotal || 0),
      total: new Prisma.Decimal(order.total || 0),
      amountPaid: new Prisma.Decimal(order.amountPaid || 0),
      balance: new Prisma.Decimal(order.balance || 0),
      orderFreight: new Prisma.Decimal(order.orderFreight || 0),
      returnFee: new Prisma.Decimal(order.returnFee || 0),
      returnFreight: new Prisma.Decimal(order.returnFreight || 0),
      exchangeRate: order.exchangeRate ? parseFloat(order.exchangeRate) : 1.0,
      exchangeRateAutoPulled: order.exchangeRateAutoPulled ? new Date(order.exchangeRateAutoPulled) : null,
      paymentStatus: order.paymentStatus,
      inventoryStatus: order.inventoryStatus,
      isCancelled: order.isCancelled ?? false,
      isCompleted: order.isCompleted ?? false,
      isFullyPicked: order.isFullyPicked ?? false,
      isInvoiced: order.isInvoiced ?? false,
      isPicking: order.isPicking ?? false,
      isPrioritized: order.isPrioritized ?? false,
      isQuote: order.isQuote ?? false,
      isTaxInclusive: order.isTaxInclusive ?? false,
      needsConfirmation: order.needsConfirmation ?? false,
      orderDate: order.orderDate ? new Date(order.orderDate) : null,
      dueDate: order.dueDate ? new Date(order.dueDate) : null,
      invoicedDate: order.invoicedDate ? new Date(order.invoicedDate) : null,
      paidDate: order.paidDate ? new Date(order.paidDate) : null,
      requestedShipDate: order.requestedShipDate ? new Date(order.requestedShipDate) : null,
      shippedDate: order.shippedDate ? new Date(order.shippedDate) : null,
      contactName: order.contactName || null,
      email: order.email || null,
      phone: order.phone || null,
      orderRemarks: order.orderRemarks || null,
      packRemarks: order.packRemarks || null,
      pickRemarks: order.pickRemarks || null,
      restockRemarks: order.restockRemarks || null,
      returnRemarks: order.returnRemarks || null,
      shipRemarks: order.shipRemarks || null,
      shipToCompanyName: order.shipToCompanyName || null,
      showShipping: order.showShipping ?? true,
      billingAddress: order.billingAddress || Prisma.DbNull,
      shippingAddress: order.shippingAddress || Prisma.DbNull,
      customFields: order.customFields || Prisma.DbNull,
      nonCustomerCost: order.nonCustomerCost || Prisma.DbNull,
      sameBillingAndShipping: order.sameBillingAndShipping ?? false,
      customerId: order.customerId,
      locationId: cleanLocationId,
      paymentTermsId: cleanTermsId,
      assignedToTeamMemberId: cleanAssignedId,
      confirmerTeamMemberId: cleanConfirmerId,
      salesRepTeamMemberId: cleanSalesRepId,
      salesRep: order.salesRep || null,
      pricingSchemeId: order.pricingSchemeId || null,
      taxingSchemeId: order.taxingSchemeId || null,
      currencyId: order.currencyId || null,
      lastModifiedById: order.lastModifiedById || null,
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

  // 4. Clear stale child dependencies
  await Promise.all([
    tx.salesOrderLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
    tx.salesOrderPackLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
    tx.salesOrderPickLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
    tx.salesOrderPickAllocationLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
    tx.salesOrderPickAllocationFailure.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
    tx.salesOrderRestockLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
    tx.salesOrderShipLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
    tx.salesOrderPaymentLine.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
    tx.costOfGoodsSold.deleteMany({ where: { salesOrderId: order.salesOrderId } }),
  ]);

  // 5. Re-write records utilizing the helper mappers
  const lines = SalesOrderMapper.mapLines(order.lines, order.salesOrderId, validProducts);
  if (lines.length) await tx.salesOrderLine.createMany({ data: lines });

  const packLines = SalesOrderMapper.mapPackLines(order.packLines, order.salesOrderId, validProducts);
  if (packLines.length) await tx.salesOrderPackLine.createMany({ data: packLines });

  const pickLines = SalesOrderMapper.mapPickLines(order.pickLines, order.salesOrderId, validProducts);
  if (pickLines.length) await tx.salesOrderPickLine.createMany({ data: pickLines });

  const allocLines = SalesOrderMapper.mapAllocationLines(order.pickAllocationLines, order.salesOrderId, validProducts);
  if (allocLines.length) await tx.salesOrderPickAllocationLine.createMany({ data: allocLines });

  const failures = SalesOrderMapper.mapAllocationFailures(order.pickAllocationFailures, order.salesOrderId, validProducts);
  if (failures.length) await tx.salesOrderPickAllocationFailure.createMany({ data: failures });

  const restockLines = SalesOrderMapper.mapRestockLines(order.restockLines, order.salesOrderId, validProducts);
  if (restockLines.length) await tx.salesOrderRestockLine.createMany({ data: restockLines });

  const shipLines = SalesOrderMapper.mapShipLines(order.shipLines, order.salesOrderId);
  if (shipLines.length) await tx.salesOrderShipLine.createMany({ data: shipLines });

  const paymentLines = SalesOrderMapper.mapPaymentLines(order.paymentLines, order.salesOrderId);
  if (paymentLines.length) await tx.salesOrderPaymentLine.createMany({ data: paymentLines });

  if (order.costOfGoodsSold) {
    await tx.costOfGoodsSold.create({
      data: {
        salesOrderCostOfGoodsSoldId: order.costOfGoodsSold.salesOrderCostOfGoodsSoldId,
        salesOrderId: order.salesOrderId,
        costOfGoodsSold: new Prisma.Decimal(order.costOfGoodsSold.costOfGoodsSold || 0),
      },
    });
  }
}
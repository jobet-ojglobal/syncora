// lib/partner/services/webhook-sales-order.service.ts

import { prisma } from "@/lib/prisma";
import { getSalesOrder } from "../data/sales-order";
import { syncSalesOrder } from "@/lib/inflow/services/sales-order.sync";

interface SyncResult {
  success: boolean;
  message?: string; // <-- Add this optional property
  inflowPayload?: any;
  // ... other properties if any
}

export class InflowSalesOrderWebhookService {
  /**
   * Handles the 'SalesOrderCreatedV1' webhook event.
   */
  static async handleSalesOrderCreate(inflowId: string, eventId?: string) {
    console.log(`[Webhook Service] Processing real-time creation for sales order ID: ${inflowId}`);
    
    // Process the sync using our shared core logic
    const result = await this.syncSalesOrderPayload(inflowId);

    // If successful and an audit log event ID was provided, mark it as processed
    if (result.success && eventId) {
      await prisma.partnerWebhookEvent.update({ // <-- changed from inflowWebhookEvent
          where: { id: eventId },
          data: { processed: true }
      });
    }

    return result;
  }

  /**
   * Handles the 'SalesOrderUpdatedV2' webhook event.
   */
  static async handleSalesOrderUpdate(inflowId: string, eventId?: string) {
    console.log(`[Webhook Service] Processing real-time update for sales order ID: ${inflowId}`);
    
    const result = await this.syncSalesOrderPayload(inflowId);

    if (result.success && eventId) {
      await prisma.inflowWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });
    }

    return result;
  }

  /**
   * Private Helper: Shared core logic for both creates and updates.
   * Fetches full tree structure from inFlow API and executes atomic DB operations.
   */
  private static async syncSalesOrderPayload(batchId: string): Promise<SyncResult> {
    if (!batchId) {
      throw new Error("Cannot process sales order webhook without a valid inFlow salesOrderId.");
    }

    const fullOrderData = await getSalesOrder(batchId);
    
    
    if (!fullOrderData) {
      throw new Error(`Sales Order data for ID ${batchId} could not be retrieved from the API.`);
    }

    console.log(fullOrderData)

    // Collect individual references from this single record to build validation parameters
    const locationIds = new Set<string>();
    const paymentTermsIds = new Set<string>();
    const teamMemberIds = new Set<string>();
    const productIds = new Set<string>();

    if (fullOrderData.locationId) locationIds.add(fullOrderData.locationId);
    if (fullOrderData.paymentTermsId) paymentTermsIds.add(fullOrderData.paymentTermsId);
    if (fullOrderData.assignedToTeamMemberId) teamMemberIds.add(fullOrderData.assignedToTeamMemberId);
    if (fullOrderData.confirmerTeamMemberId) teamMemberIds.add(fullOrderData.confirmerTeamMemberId);
    if (fullOrderData.salesRepTeamMemberId) teamMemberIds.add(fullOrderData.salesRepTeamMemberId);

    fullOrderData.lines?.forEach((l: any) => l.productId && productIds.add(l.productId));
    fullOrderData.packLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
    fullOrderData.pickLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
    fullOrderData.pickAllocationLines?.forEach((l: any) => l.productId && productIds.add(l.productId));
    fullOrderData.pickAllocationFailures?.forEach((l: any) => l.productId && productIds.add(l.productId));
    fullOrderData.restockLines?.forEach((l: any) => l.productId && productIds.add(l.productId));

    // Resolve structural validation sets in parallel block
    // (Customer identification is ignored here to take advantage of syncSalesOrder's built-in self-healing JIT recovery)
    const [dbLocations, dbTerms, dbTeam, dbProducts] = await Promise.all([
      prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
      prisma.paymentTerm.findMany({ where: { inflowId: { in: Array.from(paymentTermsIds) } }, select: { inflowId: true } }),
      prisma.teamMember.findMany({ where: { inflowId: { in: Array.from(teamMemberIds) } }, select: { inflowId: true } }),
      prisma.product.findMany({ where: { inflowId: { in: Array.from(productIds) } }, select: { inflowId: true } }),
    ]);

    const validationSets = {
      validLocations: new Set(dbLocations.map((l) => l.inflowId)),
      validTerms: new Set(dbTerms.map((t) => t.inflowId)),
      validTeamMembers: new Set(dbTeam.map((tm) => tm.inflowId)),
      validProducts: new Set(dbProducts.map((p) => p.inflowId)),
    };

    // Atomic database execution block
    const builtPayload = await prisma.$transaction(async (tx) => {
      await syncSalesOrder(tx, fullOrderData, validationSets);
    }, { timeout: 30000 }); // Single order sync will safely finalize within 30 seconds

    return { success: true, inflowPayload: builtPayload };
  }
}

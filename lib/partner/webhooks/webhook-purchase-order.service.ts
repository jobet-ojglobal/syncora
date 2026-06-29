// lib/partner/services/webhook-purchase-order.service.ts

import { prisma } from "@/lib/prisma";
import { getPurchaseOrder } from "../data/purchase-order";
import { syncPurchaseOrder } from "@/lib/inflow/services/purchase-order.sync";

interface SyncResult {
  success: boolean;
  message?: string; // <-- Add this optional property
  // ... other properties if any
}

export class InflowPurchaseOrderWebhookService {
  /**
   * Handles the 'PurchaseOrderCreatedV1' webhook event.
   */
  static async handlePurchaseOrderCreate(inflowId: string, eventId?: string) {
    console.log(`[Webhook Service] Processing real-time creation for purchase order ID: ${inflowId}`);
    
    // Process the sync using our shared core logic
    const result = await this.syncPurchaseOrderPayload(inflowId);

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
   * Handles the 'PurchaseOrderUpdatedV2' webhook event.
   */
  static async handlePurchaseOrderUpdate(inflowId: string, eventId?: string) {
    console.log(`[Webhook Service] Processing real-time update for purchase order ID: ${inflowId}`);
    
    const result = await this.syncPurchaseOrderPayload(inflowId);

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
  private static async syncPurchaseOrderPayload(batchId: string): Promise<SyncResult> {
    if (!batchId) {
      throw new Error("Cannot process Purchase order webhook without a valid inFlow PurchaseOrderId.");
    }

    const fullOrderData = await getPurchaseOrder(batchId);
    
    if (!fullOrderData) {
      throw new Error(`Purchase Order data for ID ${batchId} could not be retrieved from the API.`);
    }

    // Collect individual references from this single record to build validation parameters
    const locationIds = new Set<string>();
    const paymentTermsIds = new Set<string>();
    const teamMemberIds = new Set<string>();
    const productIds = new Set<string>();

    if (fullOrderData.locationId) locationIds.add(fullOrderData.locationId);
    if (fullOrderData.paymentTermsId) paymentTermsIds.add(fullOrderData.paymentTermsId);
    if (fullOrderData.assignedToTeamMemberId) teamMemberIds.add(fullOrderData.assignedToTeamMemberId);

    fullOrderData.lines?.forEach((l: any) => l.productId && productIds.add(l.productId));

    // Resolve structural validation sets in parallel block
    // (Customer identification is ignored here to take advantage of syncPurchaseOrder's built-in self-healing JIT recovery)
    const [dbLocations, dbTerms, dbTeam, dbProducts] = await Promise.all([
      prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
      prisma.paymentTerms.findMany({ where: { inflowId: { in: Array.from(paymentTermsIds) } }, select: { inflowId: true } }),
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
    await prisma.$transaction(async (tx) => {
      await syncPurchaseOrder(tx, fullOrderData, validationSets);
    }, { timeout: 30000 }); 

    return { success: true };
  }
}

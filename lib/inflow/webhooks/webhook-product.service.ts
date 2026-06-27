// lib/inflow/services/webhook-product.service.ts
import { prisma } from "@/lib/prisma";
import { getProduct } from "../data/products";
import { syncCategory } from "../services/category-sync";
import { syncProductGroup } from "../services/product-group-sync";
import { syncProduct } from "../services/product.sync";
import { syncVariant } from "../services/variant.sync";

export class InflowProductWebhookService {
  /**
   * Handles the 'ProductCreatedV1' webhook event.
   */
  static async handleProductCreate(inflowId: string, eventId?: string) {
    console.log(`[Webhook Service] Processing real-time creation for product ID: ${inflowId}`);
    
    // Process the sync using our shared core logic
    const result = await this.syncProductPayload(inflowId);

    // If successful and an audit log event ID was provided, mark it as processed
    if (result.success && eventId) {
      await prisma.inflowWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });
      
      // PRO-TIP: You can add creation-only side effects here!
      // e.g., await sendSlackNotification(`New product created: ${inflowId}`);
    }

    return result;
  }

  /**
   * Handles the 'ProductUpdatedV2' webhook event.
   */
  static async handleProductUpdate(inflowId: string, eventId?: string) {
    console.log(`[Webhook Service] Processing real-time update for product ID: ${inflowId}`);
    
    const result = await this.syncProductPayload(inflowId);

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
  private static async syncProductPayload(inflowId: string) {
    if (!inflowId) {
      throw new Error("Cannot process product webhook without a valid inFlow productId.");
    }

    const fullProductData = await getProduct(inflowId);
    
    if (!fullProductData) {
      throw new Error(`Product data for ID ${inflowId} could not be retrieved from the API.`);
    }

    // Extract optional structural relations
    const variantRelation = fullProductData.productVariant;
    const groupData = variantRelation?.productGroup;
    const categoryData = groupData?.category;

    // Atomic database executions
    await prisma.$transaction(async (tx) => {
      
      // 1. Relational Layer: Sync group & category ONLY if they exist
      if (groupData) {
        if (categoryData) {
          await syncCategory(tx, categoryData);
        }
        await syncProductGroup(tx, groupData);
      } else {
        console.log(`[Webhook Service] Product ${inflowId} has no group tree structure. Syncing as standalone item.`);
      }
      
      // 2. Base Product Layer: ALWAYS sync the main product details
      await syncProduct(tx, fullProductData);

      // 3. Matrix Layer: Sync the variant connection matrix ONLY if it exists
      if (variantRelation && groupData) {
        await syncVariant(tx, groupData.productGroupId, variantRelation);
      }
    });

    return { success: true };
  }
}




  // private static async syncProductPayload(inflowId: string) {
  //   if (!inflowId) {
  //     throw new Error("Cannot process product webhook without a valid inFlow productId.");
  //   }

  //   const fullProductData = await getProduct(inflowId);
    
  //   if (!fullProductData) {
  //     throw new Error(`Product data for ID ${inflowId} could not be retrieved from the API.`);
  //   }

  //   const variantRelation = fullProductData.productVariant;
  //   const groupData = variantRelation?.productGroup;
  //   const categoryData = groupData?.category;

  //   if (!variantRelation || !groupData) {
  //     console.warn(`[Webhook Service] Skipping sync: Product ${inflowId} lacks a valid variant/group layout.`);
  //     return { success: false, reason: "Incomplete group structure" };
  //   }

  //   // Atomic database executions
  //   await prisma.$transaction(async (tx) => {
  //     if (categoryData) {
  //       await syncCategory(tx, categoryData);
  //     }
      
  //     await syncProductGroup(tx, groupData);
  //     await syncProduct(tx, fullProductData);
  //     await syncVariant(tx, groupData.productGroupId, variantRelation);
  //   });

  //   return { success: true };
  // }

  /**
   * Processes a real-time 'ProductUpdatedV2' webhook event.
   * Resolves full payload dependencies and upserts data locally.
   * * @param inflowId The unique productId received from the webhook payload.
   * @param eventId Optional database log ID to mark the event row as processed.
   */
  // static async handleProductUpdate(inflowId: string, eventId?: string) {
  //   if (!inflowId) {
  //     throw new Error("Cannot process product update without a valid inFlow productId.");
  //   }

  //   console.log(`[Webhook Service] Fetching full product tree details for ID: ${inflowId}`);
    
  //   // 1. Fetch full nested structure from the inFlow API
  //   const fullProductData = await getProduct(inflowId);
    
  //   if (!fullProductData) {
  //     throw new Error(`Product data for ID ${inflowId} could not be retrieved from the API.`);
  //   }

  //   const variantRelation = fullProductData.productVariant;
  //   const groupData = variantRelation?.productGroup;
  //   const categoryData = groupData?.category;

  //   if (!variantRelation || !groupData) {
  //     console.warn(`[Webhook Service] Skipping sync: Product ${inflowId} is standalone or lacks variant/group mappings.`);
  //     return { success: false, reason: "Incomplete group structure" };
  //   }

  //   // 2. Execute atomic database upserts matching relational hierarchy constraints
  //   await prisma.$transaction(async (tx) => {
  //     // Sync parent category branch if available
  //     if (categoryData) {
  //       await syncCategory(tx, categoryData);
  //     }
      
  //     // Sync parent structural Product Group, including options and matrices
  //     await syncProductGroup(tx, groupData);

  //     // Sync individual core Product specifics
  //     await syncProduct(tx, fullProductData);

  //     // Sync the distinct variant matrix mapping
  //     await syncVariant(tx, groupData.productGroupId, variantRelation);
  //   });

  //   // 3. Mark the transaction event log row as fully integrated
  //   if (eventId) {
  //     await prisma.inflowWebhookEvent.update({
  //       where: { id: eventId },
  //       data: { processed: true }
  //     });
  //   }

  //   console.log(`[Webhook Service] Successfully matched and updated local product models for ID: ${inflowId}`);
  //   return { success: true };
  // }
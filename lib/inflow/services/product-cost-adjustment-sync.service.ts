// services/sync/products/product-cost-adjustment-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductCostAdjustments } from "../data/product-cost-adjustment";
import { syncProduct } from "./product.sync";
import { Prisma } from "@/generated/prisma/client";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductCostAdjustmentSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize || 50;
    
    // Memory caches to prevent redundant DB writes for identical resources across pages
    const verifiedTeamMemberIds = new Set<string>();
    const verifiedProductIds = new Set<string>();

    let after: string | undefined = undefined;
    let totalProcessed = 0;
    
    console.log("Starting hyper-optimized batched product cost adjustment sync...");

    while (true) {
      // 1. Fetch the paginated batch from inFlow client API
      const batch = await getProductCostAdjustments(BATCH_SIZE, after);
      if (!batch || batch.length === 0) break;

      // 2. Wrap the batch chunk operations in an isolated database transaction
      try {
        await prisma.$transaction(async (tx) => {
          for (const adjustment of batch) {
            
            // A. Foreign Key Safety Check: TeamMember Relation
            if (adjustment.lastModifiedById && !verifiedTeamMemberIds.has(adjustment.lastModifiedById)) {
              const memberData = adjustment.lastModifiedBy;
              
              if (memberData) {
                await tx.teamMember.upsert({
                  where: { inflowId: adjustment.lastModifiedById },
                  create: {
                    inflowId: adjustment.lastModifiedById,
                    name: memberData.name || "Unknown Member",
                    email: memberData.email || "",
                  },
                  update: {
                    name: memberData.name || "Unknown Member",
                    email: memberData.email || "",
                  },
                });
                verifiedTeamMemberIds.add(adjustment.lastModifiedById);
              }
            }

            // B. Foreign Key Safety Check: Product Relation (Self-Healing / Stub generation)
            if (adjustment.productId && !verifiedProductIds.has(adjustment.productId)) {
              const prodData = adjustment.product;

              if (prodData) {
                const productExists = await tx.product.findUnique({
                  where: { inflowId: adjustment.productId },
                  select: { inflowId: true },
                });

                if (!productExists) {
                  // Upsert/stub the product record to support foreign key reference assignments
                  await syncProduct(tx, prodData);
                  
                  verifiedProductIds.add(adjustment.productId);
                } else {
                  verifiedProductIds.add(adjustment.productId);
                }
              } else {
                console.warn(`Skipping adjustment ${adjustment.productCostAdjustmentId} due to missing payload product metadata.`);
                continue;
              }
            }

            // C. Persist Core Product Cost Adjustment
            await tx.productCostAdjustment.upsert({
              where: { inflowId: adjustment.productCostAdjustmentId },
              create: {
                inflowId: adjustment.productCostAdjustmentId,
                productId: adjustment.productId,
                lastModifiedById: adjustment.lastModifiedById || null,
                dateTime: new Date(adjustment.dateTime),
                serial: adjustment.serial || null,
                unitCost: new Prisma.Decimal(adjustment.unitCost),
              },
              update: {
                productId: adjustment.productId,
                lastModifiedById: adjustment.lastModifiedById || null,
                dateTime: new Date(adjustment.dateTime),
                serial: adjustment.serial || null,
                unitCost: new Prisma.Decimal(adjustment.unitCost),
              },
            });
          }
        }, {
          timeout: 40000 // Provides ample thread execution safety limits per batch
        });
      } catch (transactionError) {
        console.error(`Transaction failed for cost adjustment batch ending with ID ${after}:`, transactionError);
      }

      // 3. Track pagination state increments and advance cursor
      after = batch[batch.length - 1].productCostAdjustmentId;
      totalProcessed += batch.length;
      
      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }
    }

    return {
      costAdjustmentsProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}
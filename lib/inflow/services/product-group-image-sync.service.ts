// services/sync/products/product-group-image-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductGroupsInclude } from "../data/product-group";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductGroupImageSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize || 50;
    
    let after: string | undefined = undefined;
    let totalProcessed = 0;
    let skippedCount = 0;
    
    console.log("Starting polymorphic Product Group Image sync pipeline...");

    while (true) {
      const batch = await getProductGroupsInclude(BATCH_SIZE, after, ["images"]);
      if (!batch || batch.length === 0) break;

      await prisma.$transaction(async (tx) => {
        for (const remoteGroup of batch) {
          
          // 1. Confirm the parent group exists locally using its inflowId
          const localGroupExists = await tx.productGroup.findUnique({
            where: { inflowId: remoteGroup.productGroupId },
            select: { inflowId: true }
          });

          if (!localGroupExists) {
            console.warn(`Skipping image sync: Group (${remoteGroup.productGroupId}) is missing locally.`);
            skippedCount++;
            continue;
          }

          // 2. Process the images if present in the data stream payload
          if (remoteGroup.images !== undefined) {
            
            // Wipe out existing images tied to this specific group to maintain a clean slate
            await tx.productImage.deleteMany({
              where: { groupId: remoteGroup.productGroupId }
            });

            if (remoteGroup.images?.length) {
              await tx.productImage.createMany({
                data: remoteGroup.images.map((img, idx) => ({
                  inflowId: img.productGroupImageId || `${remoteGroup.productGroupId}-img-${idx}`,
                  groupId: remoteGroup.productGroupId,
                  productId: null, // Left null since this image lives at the Group level
                  position: idx,
                  largeUrl: img.image.originalUrl || img.image.originalUrl || null,
                  mediumUncroppedUrl: img.image.mediumUncroppedUrl || img.image.originalUrl || null,
                  mediumUrl: img.image.mediumUrl || img.image.originalUrl || null,
                  originalUrl: img.image.originalUrl || null,
                  smallUrl: img.image.smallUrl || img.image.originalUrl || null,
                  thumbUrl: img.image.thumbUrl || img.image.originalUrl || null,
                })),
                skipDuplicates: true,
              });
            }
          }
          
          totalProcessed++;
        }
      }, {
        timeout: 30000 
      });

      after = batch[batch.length - 1].productGroupId;
      
      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }
    }

    return {
      groupsProcessed: totalProcessed,
      groupsSkipped: skippedCount,
      syncedAt: new Date().toISOString(),
    };
  }
}
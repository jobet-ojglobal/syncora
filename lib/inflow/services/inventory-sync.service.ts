import { prisma } from "@/lib/prisma";
import { getInventory } from "../data/inventory";
import { syncInventoryLines } from "./inventory-lines.sync";

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

export class InventorySyncService {
  async sync(options?: SyncOptions) {
    const products = await getInventory();

    let processed = 0;
    const total = products.length;

    // Cross-product caches to prevent redundant DB writes for overlapping locations
    const syncedLocationsSet = new Set<string>();
    const syncedSublocationsSet = new Set<string>();

    for (let i = 0; i < total; i++) {
      const product = products[i];

      try {
        await prisma.$transaction(async (tx) => {
          await syncInventoryLines(
            tx,
            product.productId,
            product.inventoryLines ?? [],
            syncedLocationsSet,
            syncedSublocationsSet
          );
        });
      } catch (err) {
        console.error(`Failed inventory sync for product ${product.productId}:`, err);
      }

      processed++;

      if (options?.onProgress) {
        await options.onProgress(Math.round((processed / total) * 100));
      }
    }

    return {
      productsProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}

// export class InventorySync {
//   async sync(options?: SyncOptions) {
//     const products =
//       await getInventory();

//     let processed = 0;
//     const total = products.length;

//     for (let i = 0; i < total; i++) {
//       const product = products[i];

//       await prisma.$transaction(async (tx) => {
//         await syncInventoryLines(
//           tx,
//           product.productId,
//           product.inventoryLines ?? []
//         );
//       });

//       processed++;

//       await options?.onProgress?.(
//         Math.round((processed / total) * 100)
//       );
//     }

//     return {
//       productsProcessed: processed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }

// export class InventorySyncService {
//   async sync(options?: SyncOptions) {
//     const products = await fetchProductInventory();

//     let processed = 0;
//     const total = products.length;

//     for (let i = 0; i < total; i++) {
//       const product = products[i];

//       await prisma.$transaction(async (tx) => {
//         await syncInventoryLines(
//           tx,
//           product.productId,
//           product.inventoryLines ?? []
//         );
//       });

//       processed++;

//       await options?.onProgress?.(
//         Math.round((processed / total) * 100)
//       );
//     }

//     return {
//       productsProcessed: processed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }
import { prisma } from "@/lib/prisma";
import { fetchProductInventory } from "../data/products";
import { syncInventoryLines } from "./helpers";

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

export class InventorySyncService {
  async sync(options?: SyncOptions) {
    const products =
      await fetchProductInventory();

    let processed = 0;
    const total = products.length;

    for (let i = 0; i < total; i++) {
      const product = products[i];

      await prisma.$transaction(async (tx) => {
        await syncInventoryLines(
          tx,
          product.productId,
          product.inventoryLines ?? []
        );
      });

      processed++;

      await options?.onProgress?.(
        Math.round((processed / total) * 100)
      );
    }

    return {
      productsProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}

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
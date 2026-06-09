// services/sync/products/product-sync.service.ts

import { prisma } from "@/lib/prisma";
import { fetchProductGroup } from "../data/product-group";

import { syncCategory } from "./category.sync";
import { syncProductGroup } from "./product-group-sync";
import { syncProduct } from "./product.sync";
import { syncVariant } from "./variant.sync";

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

export class ProductGroupSyncService {
  async sync(options?: SyncOptions) {
    const groups = await fetchProductGroup();

    let processed = 0;
    const total = groups.length;

    for (let i = 0; i < total; i++) {
      const group = groups[i];

      await prisma.$transaction(async (tx) => {
        await syncCategory(tx, group.category);
        await syncProductGroup(tx, group);

        for (const variant of group.productVariants ?? []) {
          await syncProduct(tx, variant.product);
          await syncVariant(tx, group.productGroupId, variant);
        }
      });

      const progress = Math.round(((i + 1) / total) * 100);

      console.log("progress:", progress); // debug

      await options?.onProgress?.(progress);

      processed++;
    }

    return {
      groupsProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}
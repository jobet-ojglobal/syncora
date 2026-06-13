import { prisma } from "@/lib/prisma";
import { getCategories } from "../data/categories";
import { syncCategory } from "./category-sync";

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

export class CategorySyncService {
  async sync(options?: SyncOptions) {
    const categories = await getCategories();

    let processed = 0;
    const total = categories.length;

    for (let i = 0; i < total; i++) {
      const category = categories[i];
      await prisma.$transaction(async (tx) => {
        await syncCategory(tx, category);
      });

      processed++;

      await options?.onProgress?.(
        Math.round((processed / total) * 100)
      );
    }

    return {
      categoriesProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}
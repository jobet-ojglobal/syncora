
export class CustomerSyncService {
  async sync() {
    // const groups = await fetchProductGoup();

    let processed = 0;

    // for (const group of groups) {
    //   await prisma.$transaction(async (tx) => {
    //     await syncCategory(tx, group.category);

    //     await syncProductGroup(tx, group);

    //     for (const variant of group.productVariants ?? []) {
    //       await syncProduct(tx, variant.product);

    //       await syncVariant(
    //         tx,
    //         group.productGroupId,
    //         variant
    //       );
    //     }
    //   });

    //   processed++;
    // }

    return {
      groupsProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}
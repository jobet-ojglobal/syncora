// services/sync/products/helpers.ts

import { Prisma } from "@/generated/prisma/client";
import { InflowInventoryLine, InflowProduct, InflowProductGroupImage } from "../types";
import { syncUom } from "./uom-sync";

type Tx = Prisma.TransactionClient;

export async function syncBrand(
  tx: Tx,
  brandName?: string | null
): Promise<string | null> {
  if (!brandName?.trim()) {
    return null;
  }

  const brand = await tx.brand.upsert({
    where: {
      name: brandName.trim(),
    },
    create: {
      name: brandName.trim(),
    },
    update: {},
  });

  return brand.id;
}

/**
 * 📸 Separated Feature Synchronization Layer
 */
export async function syncGroupFeatures(
  tx: Tx,
  groupId: string,
  rawFeatures?: string | null
) {
  await tx.productGroupFeature.deleteMany({
    where: { groupId },
  });

  if (!rawFeatures?.trim()) return;

  const parsedFeatures = parseFeatures(rawFeatures);

  for (const f of parsedFeatures) {
    const feature = await tx.feature.upsert({
      where: {
        name: f.key,
      },
      create: {
        name: f.key,
      },
      update: {},
    });

    const featureValue = await tx.featureValue.upsert({
      where: {
        featureId_value: {
          featureId: feature.id,
          value: f.value,
        },
      },
      create: {
        featureId: feature.id,
        value: f.value,
      },
      update: {},
    });

    await tx.productGroupFeature.upsert({
      where: {
        groupId_featureId: {
          groupId,
          featureId: feature.id,
        },
      },
      create: {
        groupId,
        featureId: feature.id,
        featureValueId: featureValue.id,
      },
      update: {
        featureValueId: featureValue.id,
      },
    });
  }
}


/**
 * 📸 Separated Feature Synchronization Layer
 */
export async function syncProductFeatures(
  tx: Tx,
  productId: string,
  rawFeatures?: string | null
) {
  await tx.productFeature.deleteMany({
    where: { productId },
  });

  if (!rawFeatures?.trim()) return;

  const parsedFeatures = parseFeatures(rawFeatures);

  for (const f of parsedFeatures) {
    const feature = await tx.feature.upsert({
      where: {
        name: f.key,
      },
      create: {
        name: f.key,
      },
      update: {},
    });

    const featureValue = await tx.featureValue.upsert({
      where: {
        featureId_value: {
          featureId: feature.id,
          value: f.value,
        },
      },
      create: {
        featureId: feature.id,
        value: f.value,
      },
      update: {},
    });

    await tx.productFeature.upsert({
      where: {
        productId_featureId: {
          productId,
          featureId: feature.id,
        },
      },
      create: {
        productId,
        featureId: feature.id,
        featureValueId: featureValue.id,
      },
      update: {
        featureValueId: featureValue.id,
      },
    });
  }
}

/**
 * 🏷️ Separated Tag Synchronization Layer
 */
export async function syncGroupTags(
  tx: Tx,
  groupId: string,
  rawTags?: string | null
) {
  // Clear old tag connections for this group execution
  await tx.productGroupTag.deleteMany({ 
    where: { groupId } 
  });

  if (!rawTags?.trim()) return;

  // Parse comma-separated matrix list
  const parsedTags = parseTags(rawTags);

  for (const tagName of parsedTags) {
    // Step A: Ensure master tag index item exists globally
    const globalTag = await tx.tag.upsert({
      where: { name: tagName },
      create: { name: tagName },
      update: {},
    });

    // Step B: Map join connection row records
    await tx.productGroupTag.create({
      data: {
        groupId,
        tagId: globalTag.id,
      },
    });
  }
}

export async function syncProductTags(
  tx: Tx,
  productId: string,
  rawTags?: string | null
) {
  // Clear old tag connections for this group execution
  await tx.productTag.deleteMany({ 
    where: { productId } 
  });

  if (!rawTags?.trim()) return;

  // Parse comma-separated matrix list
  const parsedTags = parseTags(rawTags);

  for (const tagName of parsedTags) {
    // Step A: Ensure master tag index item exists globally
    const globalTag = await tx.tag.upsert({
      where: { name: tagName },
      create: { name: tagName },
      update: {},
    });

    // Step B: Map join connection row records
    await tx.productTag.create({
      data: {
        productId,
        tagId: globalTag.id,
      },
    });
  }
}

export interface ParsedFeature {
  key: string;
  value: string;
}

export function parseFeatures(
  value?: string | null
): ParsedFeature[] { // 👈 Updated from string[] to reflect the actual object shape
  return (value ?? "")
    .split("|")
    .map((item) => {
      const parts = item.split(":");
      if (parts.length < 2) return null;
      return {
        key: parts[0].trim(),
        value: parts.slice(1).join(":").trim(), // Safe for nested colons (e.g., "Time: 10:30")
      };
    })
    .filter((f): f is ParsedFeature => f !== null && f.key !== "");
}

export function parseTags(
  value?: string | null
): string[] {
  return (value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function syncPurchasingUom(
  tx: Tx,
  product: InflowProduct
) {
  if (!product.purchasingUom) return;

  const uom = await syncUom(
    tx,
    product.purchasingUom.name.toUpperCase(),
    product.purchasingUom.name
  );

  await tx.productUom.upsert({
    where: {
      productId: product.productId,
    },
    create: {
      productId: product.productId,
      uomId: uom.id,
      standardQuantity:
        product.purchasingUom.conversionRatio.standardQuantity,
      uomQuantity:
        product.purchasingUom.conversionRatio.uomQuantity,
    },
    update: {
      uomId: uom.id,
      standardQuantity:
        product.purchasingUom.conversionRatio.standardQuantity,
      uomQuantity:
        product.purchasingUom.conversionRatio.uomQuantity,
    },
  });
}

export async function syncSalesUom(
  tx: Tx,
  product: InflowProduct
) {
  if (!product.salesUom) return;

  const uom = await syncUom(
    tx,
    product.salesUom.name.toUpperCase(),
    product.salesUom.name
  );

  await tx.productSalesUom.upsert({
    where: {
      productId: product.productId,
    },
    create: {
      productId: product.productId,
      uomId: uom.id,
      standardQuantity:
        product.salesUom.conversionRatio.standardQuantity,
      uomQuantity:
        product.salesUom.conversionRatio.uomQuantity,
    },
    update: {
      uomId: uom.id,
      standardQuantity:
        product.salesUom.conversionRatio.standardQuantity,
      uomQuantity:
        product.salesUom.conversionRatio.uomQuantity,
    },
  });
}

export async function syncImages(
  tx: Tx,
  product: InflowProduct
) {
  for (
    let index = 0;
    index < (product.images ?? []).length;
    index++
  ) {
    const image = product.images[index];

    await tx.productImage.upsert({
      where: {
        inflowId: image.imageId,
      },
      create: {
        inflowId: image.imageId,
        productId: product.productId,
        position: index,
        largeUrl: image.largeUrl,
        mediumUncroppedUrl:
          image.mediumUncroppedUrl,
        mediumUrl: image.mediumUrl,
        originalUrl: image.originalUrl,
        smallUrl: image.smallUrl,
        thumbUrl: image.thumbUrl,
      },
      update: {
        position: index,
        largeUrl: image.largeUrl,
        mediumUncroppedUrl:
          image.mediumUncroppedUrl,
        mediumUrl: image.mediumUrl,
        originalUrl: image.originalUrl,
        smallUrl: image.smallUrl,
        thumbUrl: image.thumbUrl,
      },
    });
  }
}

export async function syncGroupImages(
  tx: any,
  groupId: string,
  images: InflowProductGroupImage[]
) {
  for (
    let index = 0;
    index < images.length;
    index++
  ) {
    const groupImage = images[index];
    const image = groupImage.image;

    await tx.productImage.upsert({
      where: {
        inflowId: image.imageId,
      },
      create: {
        inflowId: image.imageId,
        groupId,
        position: index,
        largeUrl: image.largeUrl,
        mediumUncroppedUrl:
          image.mediumUncroppedUrl,
        mediumUrl: image.mediumUrl,
        originalUrl: image.originalUrl,
        smallUrl: image.smallUrl,
        thumbUrl: image.thumbUrl,
      },
      update: {
        groupId,
        position: index,
        largeUrl: image.largeUrl,
        mediumUncroppedUrl:
          image.mediumUncroppedUrl,
        mediumUrl: image.mediumUrl,
        originalUrl: image.originalUrl,
        smallUrl: image.smallUrl,
        thumbUrl: image.thumbUrl,
      },
    });
  }
}

export async function syncInventoryLines1(
  tx: Prisma.TransactionClient,
  productId: string,
  inventoryLines: InflowInventoryLine[]
) {
  if (!inventoryLines.length) {
    return;
  }

  const locationTotals = new Map<
    string,
    Prisma.Decimal
  >();

  // Aggregate location inventory totals
  for (const line of inventoryLines) {
    const current =
      locationTotals.get(line.locationId) ??
      new Prisma.Decimal(0);

    locationTotals.set(
      line.locationId,
      current.plus(
        new Prisma.Decimal(line.quantityOnHand)
      )
    );
  }

  // Create location inventory
  for (const [
    locationId,
    quantityOnHand,
  ] of locationTotals) {
    const inventory = await tx.inventory.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      create: {
        productId,
        locationId,
        quantityOnHand,
      },
      update: {
        quantityOnHand,
      },
    });

    const linesForLocation =
      inventoryLines.filter(
        (x) => x.locationId === locationId
      );

    for (const line of linesForLocation) {
      const sublocationName =
        line.sublocation?.trim() || "Default";

      const sublocation =
        await tx.sublocation.findUnique({
          where: {
            locationId_name: {
              locationId,
              name: sublocationName,
            },
          },
        });

      if (!sublocation) {
        console.warn(
          `Missing sublocation "${sublocationName}" for location ${locationId}`
        );
        continue;
      }

      await tx.inventoryBin.upsert({
        where: {
          productId_sublocationId: {
            productId,
            sublocationId: sublocation.id,
          },
        },
        create: {
          inventoryId: inventory.id,
          productId,
          sublocationId: sublocation.id,
          quantity: new Prisma.Decimal(
            line.quantityOnHand
          ),
        },
        update: {
          quantity: new Prisma.Decimal(
            line.quantityOnHand
          ),
        },
      });
    }
  }
}




// export async function syncFeatures(
//   tx: Tx,
//   inflowProductId: string,
//   value?: string | null
// ) {
//   const product = await tx.product.findUnique({
//     where: {
//       inflowId: inflowProductId,
//     },
//     select: {
//       id: true,
//     },
//   });

//   if (!product) return;

//   const features = (value ?? "")
//     .split(";")
//     .map((x) => x.trim())
//     .filter(Boolean);

//   await tx.productFeature.deleteMany({
//     where: {
//       productId: product.id,
//     },
//   });

//   for (const featureName of features) {
//     const feature = await tx.feature.upsert({
//       where: {
//         name: featureName,
//       },
//       create: {
//         name: featureName,
//       },
//       update: {},
//     });

//     await tx.productFeature.create({
//       data: {
//         productId: product.id,
//         featureId: feature.id,
//       },
//     });
//   }
// }

// export async function syncTags(
//   tx: Tx,
//   inflowProductId: string,
//   value?: string | null
// ) {
//   const product = await tx.product.findUnique({
//     where: {
//       inflowId: inflowProductId,
//     },
//     select: {
//       id: true,
//     },
//   });

//   if (!product) return;

//   const tags = (value ?? "")
//     .split(",")
//     .map((x) => x.trim())
//     .filter(Boolean);

//   await tx.productTag.deleteMany({
//     where: {
//       productId: product.id,
//     },
//   });

//   for (const tagName of tags) {
//     const tag = await tx.tag.upsert({
//       where: {
//         name: tagName,
//       },
//       create: {
//         name: tagName,
//       },
//       update: {},
//     });

//     await tx.productTag.create({
//       data: {
//         productId: product.id,
//         tagId: tag.id,
//       },
//     });
//   }
// }

// export function parseFeatures(
//   value?: string | null
// ): string[] {
//   return (value ?? "")
//     .split(";")
//     .map((x) => x.trim())
//     .filter(Boolean);
// }

// export function parseTags(
//   value?: string | null
// ): string[] {
//   return (value ?? "")
//     .split(",")
//     .map((x) => x.trim())
//     .filter(Boolean);
// }


// export async function syncInventoryLines(
//   tx: Prisma.TransactionClient,
//   productId: string,
//   lines: InflowInventoryLine[]
// ) {
//   const grouped = new Map<
//     string,
//     Prisma.Decimal
//   >();

//   for (const line of lines) {
//     const current =
//       grouped.get(line.locationId) ??
//       new Prisma.Decimal(0);

//     grouped.set(
//       line.locationId,
//       current.plus(line.quantityOnHand)
//     );
//   }

//   for (const [locationId, qty] of grouped) {
//     const inventory = await tx.inventory.upsert({
//       where: {
//         productId_locationId: {
//           productId,
//           locationId,
//         },
//       },
//       create: {
//         productId,
//         locationId,
//         quantityOnHand: qty,
//       },
//       update: {
//         quantityOnHand: qty,
//       },
//     });

//     for (const line of lines.filter(
//       (x) =>
//         x.locationId === locationId &&
//         x.sublocation
//     )) {
//       const sublocation =
//         await tx.sublocation.findFirst({
//           where: {
//             locationId,
//             name: line.sublocation,
//           },
//         });

//       if (!sublocation) continue;

//       await tx.inventoryBin.upsert({
//         where: {
//           productId_sublocationId: {
//             productId,
//             sublocationId: sublocation.id,
//           },
//         },
//         create: {
//           inventoryId: inventory.id,
//           productId,
//           sublocationId: sublocation.id,
//           quantity: line.quantityOnHand,
//         },
//         update: {
//           quantity: line.quantityOnHand,
//         },
//       });
//     }
//   }
// }
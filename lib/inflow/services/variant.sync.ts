// lib\inflow\services\variant.sync.ts
import { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function syncVariant(
  tx: Tx,
  productGroupId: string,
  variant: any
) {
  // 1. Extract option pairs (Key = Option ID, Value = Option Value ID)
  const optionEntries = Object.entries(variant.variantOption ?? {});

  // 2. Compute signature to match the Group Matrix implementation precisely:
  // Signature Format: "OptionID_1:ValueID_1|OptionID_2:ValueID_2" (Sorted alphabetically)
  const signature = optionEntries
    .map(([optionId, optionValueId]) => `${optionId}:${optionValueId}`)
    .sort()
    .join("|");

  const variantCount = variant.variantCount ?? optionEntries.length;
  const defaultPrice = new Prisma.Decimal(variant.defaultPrice ?? 0.0);

  // 3. Upsert the primary structural variant record
  await tx.productVariant.upsert({
    where: {
      inflowId: variant.productVariantId,
    },
    create: {
      inflowId: variant.productVariantId,
      productGroupId,
      productId: variant.productId,
      defaultPrice,
      signature,
      variantCount,
    },
    update: {
      defaultPrice,
      signature,
      variantCount,
    },
  });

  // 4. Synchronize explicit multi-variant option matrix values layers
  for (const [optionId, optionValueId] of optionEntries) {
    await tx.productVariantSelection.upsert({
      where: {
        variantId_optionId: {
          variantId: variant.productVariantId,
          optionId: optionId,
        },
      },
      create: {
        variantId: variant.productVariantId,
        optionId: optionId,
        optionValueId: String(optionValueId),
      },
      update: {
        optionValueId: String(optionValueId),
      },
    });
  }
}



// import { Prisma } from "@/generated/prisma/client";

// type Tx = Prisma.TransactionClient;

// export async function syncVariant(
//   tx: Tx,
//   productGroupId: string,
//   variant: any
// ) {
//   // 1. Extract option records (Key = Option ID, Value = Option Value ID)
//   const optionEntries = Object.entries(variant.variantOption ?? {});

//   // 2. Compute signature to match the Group Matrix implementation precisely
//   // Group form logic: intersection.map(item => item.valueInflowId).sort().join("-")
//   const signature = optionEntries
//     .map(([_, optionValueId]) => String(optionValueId))
//     .sort((a, b) => a.localeCompare(b))
//     .join("-");

//   const variantCount = variant.variantCount ?? optionEntries.length;

//   // 3. Upsert the primary structural variant record
//   await tx.productVariant.upsert({
//     where: {
//       inflowId: variant.productVariantId,
//     },
//     create: {
//       inflowId: variant.productVariantId,
//       productGroupId,
//       productId: variant.productId,
//       defaultPrice: Number(variant.defaultPrice) || 0.00,
//       signature,
//       variantCount,
//     },
//     update: {
//       defaultPrice: Number(variant.defaultPrice) || 0.00,
//       signature,
//       variantCount,
//     },
//   });

//   // 4. Synchronize explicit multi-variant option matrix values layers
//   for (const [optionId, optionValueId] of optionEntries) {
//     await tx.productVariantSelection.upsert({
//       where: {
//         variantId_optionId: {
//           variantId: variant.productVariantId,
//           optionId: optionId,
//         },
//       },
//       create: {
//         variantId: variant.productVariantId,
//         optionId: optionId,
//         optionValueId: String(optionValueId),
//       },
//       update: {
//         optionValueId: String(optionValueId),
//       },
//     });
//   }
// }
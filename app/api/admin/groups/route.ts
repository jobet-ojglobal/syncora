// app/api/admin/product-groups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inflowId, name, slug, description, brandId, categoryId, isActive, options, variants } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Missing required identification metadata keys titles." }, { status: 400 });
    }

    const savedGroup = await prisma.$transaction(async (tx) => {
      // 1. Create primary group record node 
      const group = await tx.productGroup.create({
        data: {
          inflowId,
          name,
          slug,
          description,
          brandId: brandId || null,
          categoryId: categoryId || null,
          isActive,
        }
      });

      // 2. Insert option matrices and their tracking values sequentially
      for (const opt of options) {
        const createdOpt = await tx.productGroupOption.create({
          data: {
            inflowId: opt.inflowId,
            productGroupId: group.inflowId,
            lineNum: opt.lineNum,
            name: opt.name,
          }
        });

        for (const val of opt.values) {
          await tx.productGroupOptionValue.create({
            data: {
              inflowId: val.inflowId,
              optionId: createdOpt.inflowId,
              lineNum: val.lineNum,
              value: val.value,
            }
          });
        }
      }

      // 3. Mount individual variants coupled with dimensional choice markers
      for (const variant of variants) {
        await tx.productVariant.create({
          data: {
            inflowId: variant.inflowId,
            productGroupId: group.inflowId,
            productId: variant.productId,
            defaultPrice: variant.defaultPrice,
            selections: {
              create: variant.selections.map((sel: any) => ({
                optionId: sel.optionId,
                optionValueId: sel.optionValueId,
              }))
            }
          }
        });
      }

      return group;
    });

    return NextResponse.json(savedGroup, { status: 201 });
  } catch (error: any) {
    console.error("Product Group generation crash failure:", error);
    return NextResponse.json({ error: error.message || "Database execution error during transactional commit." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { inflowId, name, slug, description, brandId, categoryId, isActive, options, variants } = body;

    // Use an atomic structural rebuild approach to wipe clean past options matrices before rewriting definitions
    const alteredGroup = await prisma.$transaction(async (tx) => {
      
      // Clear out deep historic mapping structures safely first
      const historicalVariants = await tx.productVariant.findMany({ where: { productGroupId: inflowId } });
      const variantInflowIds = historicalVariants.map(v => v.inflowId);

      await tx.productVariantSelection.deleteMany({ where: { variantId: { in: variantInflowIds } } });
      await tx.productVariant.deleteMany({ where: { productGroupId: inflowId } });

      const historicalOptions = await tx.productGroupOption.findMany({ where: { productGroupId: inflowId } });
      const optionInflowIds = historicalOptions.map(o => o.inflowId);

      await tx.productGroupOptionValue.deleteMany({ where: { optionId: { in: optionInflowIds } } });
      await tx.productGroupOption.deleteMany({ where: { productGroupId: inflowId } });

      // Re-apply core parameter edits onto parent block entry
      const group = await tx.productGroup.update({
        where: { inflowId },
        data: { name, slug, description, brandId: brandId || null, categoryId: categoryId || null, isActive }
      });

      // Re-hydrate Options indices structure trees
      for (const opt of options) {
        await tx.productGroupOption.create({
          data: {
            inflowId: opt.inflowId,
            productGroupId: group.inflowId,
            lineNum: opt.lineNum,
            name: opt.name,
            values: {
              create: opt.values.map((v: any) => ({
                inflowId: v.inflowId,
                lineNum: v.lineNum,
                value: v.value,
              }))
            }
          }
        });
      }

      // Re-hydrate variant connection parameters trees
      for (const vr of variants) {
        await tx.productVariant.create({
          data: {
            inflowId: vr.inflowId,
            productGroupId: group.inflowId,
            productId: vr.productId,
            defaultPrice: vr.defaultPrice,
            selections: {
              create: vr.selections.filter((s: any) => s.optionId && s.optionValueId).map((sel: any) => ({
                optionId: sel.optionId,
                optionValueId: sel.optionValueId
              }))
            }
          }
        });
      }

      return group;
    });

    return NextResponse.json(alteredGroup, { status: 200 });
  } catch (error: any) {
    console.error("Failed executing structural group option edits updates:", error);
    return NextResponse.json({ error: "Transactional database pipeline correction failure." }, { status: 500 });
  }
}


// // app/api/admin/groups/route.ts

// import { prisma } from "@/lib/prisma";
// import { slugify } from "@/lib/slugify";
// import { createProductGroupSchema } from "@/schemas/product-group.schema";
// import { NextResponse } from "next/server";
// import { nanoid } from "nanoid";

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();

//     const data = createProductGroupSchema.parse(body);

//     const result = await prisma.$transaction(async (tx) => {

//       const group = await tx.productGroup.create({
//         data: {
//           inflowId: nanoid(),
//           name: data.name,
//           slug: slugify(data.name),
//           categoryId: data.categoryId,
//           brandId: data.brandId,
//           isActive: data.isActive,
//         },
//       });

//       // FEATURES
//       for (const featureInput of data.features) {
//         const feature = await tx.feature.upsert({
//           where: {
//             name: featureInput.key,
//           },
//           update: {},
//           create: {
//             name: featureInput.key,
//           },
//         });

//         await tx.productFeature.create({
//           data: {
//             groupId: group.inflowId,
//             productId: "", // assigned later when variants created
//             featureId: feature.id,
//             value: featureInput.value,
//           },
//         });
//       }

//       // TAGS
//       for (const tagName of data.tags) {
//         const tag = await tx.tag.upsert({
//           where: {
//             name: tagName,
//           },
//           update: {},
//           create: {
//             name: tagName,
//           },
//         });

//         await tx.productTag.create({
//           data: {
//             groupId: group.inflowId,
//             productId: "",
//             tagId: tag.id,
//           },
//         });
//       }

//       // OPTIONS
//       for (let optionIndex = 0; optionIndex < data.options.length; optionIndex++) {
//         const optionInput = data.options[optionIndex];

//         let attributeId = optionInput.attributeId;

//         // custom attribute
//         if (!attributeId) {
//           const attr = await tx.attribute.upsert({
//             where: {
//               name: optionInput.name,
//             },
//             update: {},
//             create: {
//               name: optionInput.name,
//             },
//           });

//           attributeId = attr.id;
//         }

//         const option = await tx.productGroupOption.create({
//           data: {
//             inflowId: nanoid(),
//             productGroupId: group.inflowId,
//             lineNum: optionIndex + 1,
//             name: optionInput.name,
//             attributeId,
//           },
//         });

//         for (let valueIndex = 0; valueIndex < optionInput.values.length; valueIndex++) {
//           const valueInput = optionInput.values[valueIndex];

//           const attributeValue = await tx.attributeValue.upsert({
//             where: {
//               attributeId_value: {
//                 attributeId,
//                 value: valueInput.value,
//               },
//             },
//             update: {},
//             create: {
//               attributeId,
//               value: valueInput.value,
//             },
//           });

//           await tx.productGroupOptionValue.create({
//             data: {
//               inflowId: nanoid(),
//               optionId: option.inflowId,
//               lineNum: valueIndex + 1,
//               value: valueInput.value,
//               attributeValueId: attributeValue.id,
//             },
//           });
//         }
//       }

//       return group;
//     });

//     return NextResponse.json(result);
//   } catch (error) {
//     console.error(error);

//     return NextResponse.json(
//       {
//         error: "Failed to create group",
//       },
//       {
//         status: 400,
//       }
//     );
//   }
// }
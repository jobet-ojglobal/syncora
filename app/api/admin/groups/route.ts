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
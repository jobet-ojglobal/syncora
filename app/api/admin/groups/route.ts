// app/api/admin/groups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSku2Variant2 } from "@/helpers/genSKU";
import { genUniqueSlug } from "@/helpers/genUniqueSlug";

// 🎯 Recursive algorithm to compute the Cartesian cross-product matrix 
function getCartesianProduct(arrays: any[][]): any[][] {
  return arrays.reduce(
    (acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])),
    [[]]
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, brandId, categoryId, isActive, options, tags, features } = body;

    if (!name || !options || options.length === 0) {
      return NextResponse.json({ error: "Missing required identification metadata matrix options." }, { status: 400 });
    }

    // 1. Resolve brand context for SKU prefixing patterns
    const brand = await prisma.brand.findUnique({
      where: { id: brandId || "" },
      select: { name: true }
    });
    const brandName = brand?.name || "GENERIC";

    const masterGroupInflowId = crypto.randomUUID().toLowerCase();
    const groupSlug = await genUniqueSlug(name, prisma.productGroup);

    // Execute everything safely wrapped in a sequential database isolation transaction
    const savedGroup = await prisma.$transaction(async (tx) => {
      
      // 2. Insert primary Root ProductGroup configuration record node
      const group = await tx.productGroup.create({
        data: {
          inflowId: masterGroupInflowId,
          name,
          slug: groupSlug,
          description: description || null,
          brandId: brandId || null,
          categoryId: categoryId || null,
          isActive: isActive ?? true,
        }
      });

      // 3. Map structural system features lookup definitions globally
      const localizedFeaturesList: Array<{ featureId: string; featureValueId: string }> = [];
      for (const feat of (features || [])) {
        if (!feat.key.trim() || !feat.value.trim()) continue;
        
        // Ensure Feature class exists
        const dbFeature = await tx.feature.upsert({
          where: { name: feat.key.trim() },
          update: {},
          create: { name: feat.key.trim() }
        });

        // Ensure Feature Value variant exists under this specific feature
        const dbFeatureValue = await tx.featureValue.upsert({
          where: {
            featureId_value: {
              featureId: dbFeature.id,
              value: feat.value.trim()
            }
          },
          update: {},
          create: {
            featureId: dbFeature.id,
            value: feat.value.trim()
          }
        });

        localizedFeaturesList.push({ 
          featureId: dbFeature.id, 
          featureValueId: dbFeatureValue.id 
        });

        // Map Feature to the Parent Product Group
        await tx.productGroupFeature.create({
          data: {
            groupId: group.inflowId,
            featureId: dbFeature.id,
            featureValueId: dbFeatureValue.id
          }
        });
      }

      // 4. Map system search keywords lookup tags globally
      const localizedTagsList: string[] = [];
      for (const tagStr of (tags || [])) {
        if (!tagStr.trim()) continue;
        const dbTag = await tx.tag.upsert({
          where: { name: tagStr.trim() },
          update: {},
          create: { name: tagStr.trim() }
        });
        localizedTagsList.push(dbTag.id);

        // Link tag to parent group via group-tag join layer
        await tx.productGroupTag.create({
          data: {
            groupId: group.inflowId,
            tagId: dbTag.id
          }
        });
      }

      // Track created database lookup options & value configurations for selections mapping later
      const structuralOptionsMap: Array<{
        optionInflowId: string;
        optionName: string;
        values: Array<{ valueInflowId: string; literalStr: string }>;
      }> = [];

      // 5. Populate database metadata for option rows and option values
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const optionInflowId = crypto.randomUUID().toLowerCase();
        const targetAttributeId = opt.attributeId && opt.attributeId !== "custom-literal-mode" ? opt.attributeId : null;

        // Automatically create dynamic missing attributes if designated raw custom text matches something new
        let finalAttributeId = targetAttributeId;
        if (!finalAttributeId) {
          const fallbackAttribute = await tx.attribute.upsert({
            where: { name: opt.name.trim() },
            update: {},
            create: { name: opt.name.trim() }
          });
          finalAttributeId = fallbackAttribute.id;
        }

        const createdOpt = await tx.productGroupOption.create({
          data: {
            inflowId: optionInflowId,
            productGroupId: group.inflowId,
            lineNum: i + 1,
            attributeId: finalAttributeId,
          }
        });

        const loggedValues: Array<{ valueInflowId: string; literalStr: string }> = [];

        for (let j = 0; j < opt.values.length; j++) {
          const val = opt.values[j];
          const valueInflowId = crypto.randomUUID().toLowerCase();

          // Sync attribute values mapping
          const dbAttrValue = await tx.attributeValue.upsert({
            where: {
              attributeId_value: {
                attributeId: finalAttributeId,
                value: val.value.trim()
              }
            },
            update: {},
            create: {
              attributeId: finalAttributeId,
              value: val.value.trim()
            }
          });

          await tx.productGroupOptionValue.create({
            data: {
              inflowId: valueInflowId,
              optionId: createdOpt.inflowId,
              lineNum: j + 1,
              attributeValueId: dbAttrValue.id, 
            }
          });

          loggedValues.push({ valueInflowId, literalStr: val.value });
        }

        structuralOptionsMap.push({
          optionInflowId,
          optionName: opt.name,
          values: loggedValues
        });
      }

      // 6. Extract arrays of values to construct the permutation array layer matrix
      // const valueArraysForCartesian = structuralOptionsMap.map(opt => 
      //   opt.values.map(v => ({
      //     optionInflowId: opt.optionInflowId,
      //     valueInflowId: v.valueInflowId,
      //     literalStr: v.literalStr
      //   }))
      // );

      // // 7. Build dynamic cross product lines array
      // const cartesianIntersections = getCartesianProduct(valueArraysForCartesian);

      const driverOptions = options.filter((opt: any) => opt.isDriver !== false);

      const valueArraysForCartesian = structuralOptionsMap
        .filter(opt => {
          // Find the original incoming option to check its isDriver status
          const originalOpt = options.find((o: any) => o.name === opt.optionName);
          return originalOpt?.isDriver ?? true;
        })
        .map(opt => 
          opt.values.map(v => ({
            optionInflowId: opt.optionInflowId,
            valueInflowId: v.valueInflowId,
            literalStr: v.literalStr
          }))
        );

      // 7. Build dynamic cross product lines array using ONLY driver fields
      const cartesianIntersections = getCartesianProduct(valueArraysForCartesian);

      // 8. Generate individual Child Products and concrete Variant references sequentially
      for (const intersection of cartesianIntersections) {
        const variationLabels = intersection.map(item => item.literalStr).join(" / ");
        const variantName = `${name} (${variationLabels})`;
        const variantProductInflowId = crypto.randomUUID().toLowerCase();
        
        const individualVariantValuesArray = intersection.map(item => item.literalStr);
        const generatedSku = generateSku2Variant2(brandName, name, individualVariantValuesArray);
        const generatedSlug = await genUniqueSlug(variantName, prisma.product);

        // A. Insert base SKU catalog entity placeholder table record
        const childProduct = await tx.product.create({
          data: {
            inflowId: variantProductInflowId,
            sku: generatedSku,
            name: variantName,
            slug: generatedSlug,
            description: description || null,
            isActive: false,
            brandId: brandId || null,
            categoryId: categoryId || null
          }
        });

        // B. Connect the core inventory balance record with its relational matrix metadata 
        const productVariantInflowId = crypto.randomUUID().toLowerCase();
        
        // Calculated unique option combination deterministic signature string
        const variantSignature = intersection.map(item => item.valueInflowId).sort().join("-");

        await tx.productVariant.create({
          data: {
            inflowId: productVariantInflowId,
            productGroupId: group.inflowId,
            productId: childProduct.inflowId,
            defaultPrice: 0.00,
            signature: variantSignature, 
            variantCount: cartesianIntersections.length, 
            selections: {
              create: intersection.map((sel) => ({
                optionId: sel.optionInflowId, 
                optionValueId: sel.valueInflowId, 
              }))
            }
          }
        });

        // C. Insert relational specifications (ProductFeature Join Layer)
        for (const featRelation of localizedFeaturesList) {
          await tx.productFeature.create({
            data: {
              productId: childProduct.inflowId,
              featureId: featRelation.featureId,
              featureValueId: featRelation.featureValueId
            }
          });
        }

        // D. Insert contextual search filters (ProductTag Join Layer)
        for (const tagId of localizedTagsList) {
          await tx.productTag.create({
            data: {
              productId: childProduct.inflowId,
              tagId: tagId
            }
          });
        }
      }

      return group;
    });

    return NextResponse.json(savedGroup, { status: 201 });
  } catch (error: any) {
    console.error("Product Group generation crash failure:", error);
    return NextResponse.json(
      { error: error.message || "Database execution error during transactional commit layers." }, 
      { status: 500 }
    );
  }
}


// app/api/admin/groups/route.ts
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id: groupId, 
      brandId, 
      categoryId, 
      isActive, 
      name, 
      features, 
      description, 
      tags, 
      options, 
      variants: incomingVariantsManager 
    } = body;

    if (!groupId || !name || !options || options.length === 0) {
      return NextResponse.json({ error: "Missing required identification metadata matrix options." }, { status: 400 });
    }

    // 1. Resolve brand context for SKU prefixing patterns
    const brand = await prisma.brand.findUnique({
      where: { id: brandId || "" },
      select: { name: true }
    });
    const brandName = brand?.name || "GENERIC";

    // 🎯 FIX: Consistently target inflowId if that is your primary client identifier field
    const groupSlug = await genUniqueSlug(name, prisma.productGroup, groupId);

    const updatedGroup = await prisma.$transaction(async (tx) => {
      
      // 🟢 STEP 1: Purge Old Relational Join Mappings to Prevent Duplication Bloat
      // We clear features, tags, and options safely; existing variants are managed manually below
      await tx.productGroupFeature.deleteMany({ where: { groupId } });
      await tx.productGroupTag.deleteMany({ where: { groupId } });
      
      // Cascading clean up of current option configurations inside this profile
      await tx.productGroupOptionValue.deleteMany({
        where: { option: { productGroupId: groupId } }
      });
      await tx.productGroupOption.deleteMany({ where: { productGroupId: groupId } });

      // 🟢 STEP 2: Update Primary Root ProductGroup Core Record Node
      const group = await tx.productGroup.update({
        where: { inflowId: groupId }, // ✨ FIX: Standardized key pointer
        data: {
          name,
          slug: groupSlug,
          description: description || null,
          brandId: brandId || null,
          categoryId: categoryId || null,
          isActive: isActive ?? true,
        }
      });

      // 🟢 STEP 3: Re-map Structural System Features Configuration Definitions
      for (const feat of (features || [])) {
        if (!feat.key?.trim() || !feat.value?.trim()) continue;
        
        const dbFeature = await tx.feature.upsert({
          where: { name: feat.key.trim() },
          update: {},
          create: { name: feat.key.trim() }
        });

        const dbFeatureValue = await tx.featureValue.upsert({
          where: {
            featureId_value: {
              featureId: dbFeature.id,
              value: feat.value.trim()
            }
          },
          update: {},
          create: {
            featureId: dbFeature.id,
            value: feat.value.trim()
          }
        });

        await tx.productGroupFeature.create({
          data: {
            groupId: group.inflowId,
            featureId: dbFeature.id,
            featureValueId: dbFeatureValue.id
          }
        });
      }

      // 🟢 STEP 4: Re-map System Discoverability Search Keywords
      for (const tagStr of (tags || [])) {
        if (!tagStr?.trim()) continue;
        const dbTag = await tx.tag.upsert({
          where: { name: tagStr.trim() },
          update: {},
          create: { name: tagStr.trim() }
        });

        await tx.productGroupTag.create({
          data: {
            groupId: group.inflowId,
            tagId: dbTag.id
          }
        });
      }

      // 🟢 STEP 5: Populate Re-built Clean Database Metadata Configuration Rows
      const structuralOptionsMap: Array<{
        optionInflowId: string;
        optionName: string;
        values: Array<{ valueInflowId: string; fingerprintId: string; literalStr: string }>;
      }> = [];

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const optionInflowId = crypto.randomUUID().toLowerCase();
        const targetAttributeId = opt.attributeId && opt.attributeId !== "custom-literal-mode" ? opt.attributeId : null;

        let finalAttributeId = targetAttributeId;
        if (!finalAttributeId) {
          const fallbackAttribute = await tx.attribute.upsert({
            where: { name: opt.name.trim() },
            update: {},
            create: { name: opt.name.trim() }
          });
          finalAttributeId = fallbackAttribute.id;
        }

        const createdOpt = await tx.productGroupOption.create({
          data: {
            inflowId: optionInflowId,
            productGroupId: group.inflowId,
            lineNum: i + 1,
            attributeId: finalAttributeId,
          }
        });

        // 🎯 FIX: Explicitly type this array to expect the fingerprintId parameter
        const loggedValues: Array<{ valueInflowId: string; fingerprintId: string; literalStr: string }> = [];

        for (let j = 0; j < opt.values.length; j++) {
          const val = opt.values[j];
          const valueInflowId = crypto.randomUUID().toLowerCase();

          const dbAttrValue = await tx.attributeValue.upsert({
            where: {
              attributeId_value: {
                attributeId: finalAttributeId,
                value: val.value.trim()
              }
            },
            update: {},
            create: {
              attributeId: finalAttributeId,
              value: val.value.trim()
            }
          });

          await tx.productGroupOptionValue.create({
            data: {
              inflowId: valueInflowId,
              optionId: createdOpt.inflowId,
              lineNum: j + 1,
              attributeValueId: dbAttrValue.id, 
            }
          });

          // Now this aligns perfectly with the typed array definition above!
          loggedValues.push({ 
            valueInflowId: valueInflowId,     
            fingerprintId: dbAttrValue.id,    
            literalStr: val.value.trim() 
          });
        }

        structuralOptionsMap.push({
          optionInflowId,
          optionName: opt.name,
          values: loggedValues
        });
      }

      // 🟢 STEP 6: Compute Matrix Array Intersections (Driver Dependent Mapping)
      const valueArraysForCartesian = structuralOptionsMap
        .filter(opt => {
          const originalOpt = options.find((o: any) => o.name === opt.optionName);
          return originalOpt?.isDriver ?? true;
        })
        .map(opt => 
          opt.values.map(v => ({
            optionInflowId: opt.optionInflowId,
            valueInflowId: v.valueInflowId,
            fingerprintId: v.fingerprintId, // ✨ Ensure this is passed along!
            literalStr: v.literalStr
          }))
        );

      const newCartesianIntersections = getCartesianProduct(valueArraysForCartesian);

      // Fetch currently stored item variations for differential mapping updates
      const existingVariants = await tx.productVariant.findMany({
        where: { productGroupId: groupId },
        select: { inflowId: true, signature: true, productId: true }
      });
      const existingSignatures = existingVariants.map(v => v.signature);

      // 🟢 STEP 7: Append Structural Additions (e.g., Material + Color additions)
      for (const intersection of newCartesianIntersections) {
        // 🎯 FIX: Calculate the signature using the stable global fingerprintId
        const newSignature = intersection.map(item => item.fingerprintId).sort().join("-");

        if (existingSignatures.includes(newSignature)) continue;

        const variationLabels = intersection.map(item => item.literalStr).join(" / ");
        const variantName = `${name} (${variationLabels})`;
        const childProductInflowId = crypto.randomUUID().toLowerCase();

        const childProduct = await tx.product.create({
          data: {
            inflowId: childProductInflowId,
            sku: generateSku2Variant2(brandName, name, intersection.map(i => i.literalStr)),
            name: variantName,
            slug: await genUniqueSlug(variantName, tx.product),
            isActive: false,
          }
        });

        await tx.productVariant.create({
          data: {
            inflowId: crypto.randomUUID().toLowerCase(),
            productGroupId: groupId,
            productId: childProduct.inflowId,
            defaultPrice: 0.00,
            signature: newSignature,
            variantCount: newCartesianIntersections.length,
            selections: {
              create: intersection.map((sel) => ({
                optionId: sel.optionInflowId,      // Points to a valid active option
                optionValueId: sel.valueInflowId,  // ✨ FIX: Points directly to your new valid optionValue!
              }))
            }
          }
        });
      }

      // 🟢 STEP 8: Process UI Table Differential Mutations Lifecycles
      for (const UIItem of (incomingVariantsManager || [])) {
        if (UIItem.isExisting) {
          if (UIItem.status === "unlink") {
            // 1. Sever the selections attributes map holding the matrix relationship
            await tx.productVariantSelection.deleteMany({
              where: { 
                variant: {
                  productId: UIItem.productId,
                  productGroupId: groupId 
                }
              }
            });

            // 2. Safely drop the Variant bridge record link
            await tx.productVariant.deleteMany({
              where: { productId: UIItem.productId, productGroupId: groupId }
            });
          } else if (UIItem.status === "delete") {
            await tx.productVariant.deleteMany({ where: { productId: UIItem.productId } });
            await tx.productFeature.deleteMany({ where: { productId: UIItem.productId } });
            await tx.productTag.deleteMany({ where: { productId: UIItem.productId } });
            await tx.product.delete({ where: { inflowId: UIItem.productId } });
          } else if (UIItem.status === "active") {
            await tx.productVariant.updateMany({
              where: { productId: UIItem.productId, productGroupId: groupId },
              data: { defaultPrice: Number(UIItem.defaultPrice) }
            });
          }
        }
      }

      return group;
    });

    return NextResponse.json(updatedGroup, { status: 200 });
  } catch (error: any) {
    console.error("⛔ MATRIX SYNC ERROR ENGINE FAIL:", error);
    return NextResponse.json({ error: error.message || "Internal Matrix Mutation Crash" }, { status: 500 });
  }
}

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { name, description, brandId, categoryId, isActive, options } = body;

//     if (!name) {
//       return NextResponse.json({ error: "Missing required identification metadata keys titles." }, { status: 400 });
//     }

//     const brandName = await prisma.brand.findUnique({
//       where: {
//         id: brandId,
//       },
//       select: { name: true }
//     });

//     if (!brandName) {
//       return NextResponse.json({ error: "Brand not found." }, { status: 400 });
//     }

//     const optionNames = options.map((o: any) => o.name);

//     const sku = generateSku2Variant2(brandName.name, name, optionNames);

//     // const savedGroup = await prisma.$transaction(async (tx) => {
//     //   // 1. Create primary group record node 
//     //   const group = await tx.productGroup.create({
//     //     data: {
//     //       inflowId,
//     //       name,
//     //       slug,
//     //       description,
//     //       brandId: brandId || null,
//     //       categoryId: categoryId || null,
//     //       isActive,
//     //     }
//     //   });

//     //   // 2. Insert option matrices and their tracking values sequentially
//     //   for (const opt of options) {
//     //     const createdOpt = await tx.productGroupOption.create({
//     //       data: {
//     //         inflowId: opt.inflowId,
//     //         productGroupId: group.inflowId,
//     //         lineNum: opt.lineNum,
//     //         name: opt.name,
//     //       }
//     //     });

//     //     for (const val of opt.values) {
//     //       await tx.productGroupOptionValue.create({
//     //         data: {
//     //           inflowId: val.inflowId,
//     //           optionId: createdOpt.inflowId,
//     //           lineNum: val.lineNum,
//     //           value: val.value,
//     //         }
//     //       });
//     //     }
//     //   }

//       // 3. Mount individual variants coupled with dimensional choice markers
//       // for (const variant of variants) {
//       //   await tx.productVariant.create({
//       //     data: {
//       //       inflowId: variant.inflowId,
//       //       productGroupId: group.inflowId,
//       //       productId: variant.productId,
//       //       defaultPrice: variant.defaultPrice,
//       //       selections: {
//       //         create: variant.selections.map((sel: any) => ({
//       //           optionId: sel.optionId,
//       //           optionValueId: sel.optionValueId,
//       //         }))
//       //       }
//       //     }
//       //   });
//       // }

//     //   return group;
//     // });

//     return NextResponse.json("savedGroup", { status: 201 });
//   } catch (error: any) {
//     console.error("Product Group generation crash failure:", error);
//     return NextResponse.json({ error: error.message || "Database execution error during transactional commit." }, { status: 500 });
//   }
// }

// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { inflowId, name, slug, description, brandId, categoryId, isActive, options, variants } = body;

//     // Use an atomic structural rebuild approach to wipe clean past options matrices before rewriting definitions
//     const alteredGroup = await prisma.$transaction(async (tx) => {
      
//       // Clear out deep historic mapping structures safely first
//       const historicalVariants = await tx.productVariant.findMany({ where: { productGroupId: inflowId } });
//       const variantInflowIds = historicalVariants.map(v => v.inflowId);

//       await tx.productVariantSelection.deleteMany({ where: { variantId: { in: variantInflowIds } } });
//       await tx.productVariant.deleteMany({ where: { productGroupId: inflowId } });

//       const historicalOptions = await tx.productGroupOption.findMany({ where: { productGroupId: inflowId } });
//       const optionInflowIds = historicalOptions.map(o => o.inflowId);

//       await tx.productGroupOptionValue.deleteMany({ where: { optionId: { in: optionInflowIds } } });
//       await tx.productGroupOption.deleteMany({ where: { productGroupId: inflowId } });

//       // Re-apply core parameter edits onto parent block entry
//       const group = await tx.productGroup.update({
//         where: { inflowId },
//         data: { name, slug, description, brandId: brandId || null, categoryId: categoryId || null, isActive }
//       });

//       // Re-hydrate Options indices structure trees
//       for (const opt of options) {
//         await tx.productGroupOption.create({
//           data: {
//             inflowId: opt.inflowId,
//             productGroupId: group.inflowId,
//             lineNum: opt.lineNum,
//             attributeId: opt.id,
//             values: {
//               create: opt.values.map((v: any) => ({
//                 inflowId: v.inflowId,
//                 lineNum: v.lineNum,
//                 value: v.value,
//               }))
//             }
//           }
//         });
//       }

//       // Re-hydrate variant connection parameters trees
//       // for (const vr of variants) {
//       //   await tx.productVariant.create({
//       //     data: {
//       //       inflowId: vr.inflowId,
//       //       productGroupId: group.inflowId,
//       //       productId: vr.productId,
//       //       defaultPrice: vr.defaultPrice,
//       //       selections: {
//       //         create: vr.selections.filter((s: any) => s.optionId && s.optionValueId).map((sel: any) => ({
//       //           optionId: sel.optionId,
//       //           optionValueId: sel.optionValueId
//       //         }))
//       //       }
//       //     }
//       //   });
//       // }

//       return group;
//     });

//     return NextResponse.json(alteredGroup, { status: 200 });
//   } catch (error: any) {
//     console.error("Failed executing structural group option edits updates:", error);
//     return NextResponse.json({ error: "Transactional database pipeline correction failure." }, { status: 500 });
//   }
// }


export async function DELETE(request: NextRequest) {
  try {
    const { inflowId } = await request.json();

    if (!inflowId) {
      return NextResponse.json({ error: "Missing identity reference identification parameter." }, { status: 400 });
    }

    // Run cascade cleanup operations within an isolated transaction layer block to maintain structural database safety
    await prisma.$transaction(async (tx) => {
      
      // Step A: Parse and cache lower structural variant references maps arrays
      const linkedVariants = await tx.productVariant.findMany({
        where: { productGroupId: inflowId },
        select: { inflowId: true }
      });
      const vrInflowIds = linkedVariants.map(v => v.inflowId);

      // Step B: Clear lowest branch intersection lines choice matrix markers first
      await tx.productVariantSelection.deleteMany({
        where: { variantId: { in: vrInflowIds } }
      });

      // Step C: Clear intermediate structural variants entries mapping block lines
      await tx.productVariant.deleteMany({
        where: { productGroupId: inflowId }
      });

      // Step D: Resolve option configurations tracking sets lines nodes
      const linkedOptions = await tx.productGroupOption.findMany({
        where: { productGroupId: inflowId },
        select: { inflowId: true }
      });
      const optInflowIds = linkedOptions.map(o => o.inflowId);

      // Step E: Purge declared dimensional attribute value criteria items strings
      await tx.productGroupOptionValue.deleteMany({
        where: { optionId: { in: optInflowIds } }
      });

      // Step F: Drop intermediate options parameters anchors
      await tx.productGroupOption.deleteMany({
        where: { productGroupId: inflowId }
      });

      // Step G: Remove the primary parent product group index card node mapping
      await tx.productGroup.delete({
        where: { inflowId }
      });
      
    });

    return NextResponse.json({ success: true, decoupledProductGroupInflowId: inflowId }, { status: 200 });
  } catch (error: any) {
    console.error("Matrix catalog extraction routine crashed:", error);
    return NextResponse.json({ error: "Internal Database transaction constraint conflict during taxonomy removal routing." }, { status: 500 });
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
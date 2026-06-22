// app/api/admin/groups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSku2Variant2 } from "@/helpers/genSKU";
import { genUniqueSlug } from "@/helpers/genUniqueSlug";

// 🎯 Recursive algorithm to compute the Cartesian cross-product matrix 
function getCartesianProduct(arrays: any[][]): any[][] {
  if (arrays.length === 0) return [];
  return arrays.reduce(
    (acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])),
    [[]]
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      brandId, 
      categoryId, 
      isActive, 
      options, 
      tags, 
      features,
      skuPattern,   
      skuSeparator  
    } = body;

    if (!name || !options || options.length === 0) {
      return NextResponse.json({ error: "Missing required identification metadata matrix options." }, { status: 400 });
    }

    const activePattern = skuPattern || "[PARENT_SKU]-[VAL_1]-[VAL_2]-[INDEX]";
    const activeSeparator = typeof skuSeparator === "string" ? skuSeparator : "-";

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

      // --- [Features & Tags mapping layers] ---
      const localizedFeaturesList: Array<{ featureId: string; featureValueId: string }> = [];
      for (const feat of (features || [])) {
        if (!feat.key.trim() || !feat.value.trim()) continue;
        const dbFeature = await tx.feature.upsert({
          where: { name: feat.key.trim() }, update: {}, create: { name: feat.key.trim() }
        });
        const dbFeatureValue = await tx.featureValue.upsert({
          where: { featureId_value: { featureId: dbFeature.id, value: feat.value.trim() } },
          update: {}, create: { featureId: dbFeature.id, value: feat.value.trim() }
        });
        localizedFeaturesList.push({ featureId: dbFeature.id, featureValueId: dbFeatureValue.id });
        await tx.productGroupFeature.create({
          data: { groupId: group.inflowId, featureId: dbFeature.id, featureValueId: dbFeatureValue.id }
        });
      }

      const localizedTagsList: string[] = [];
      for (const tagStr of (tags || [])) {
        if (!tagStr.trim()) continue;
        const dbTag = await tx.tag.upsert({
          where: { name: tagStr.trim() }, update: {}, create: { name: tagStr.trim() }
        });
        localizedTagsList.push(dbTag.id);
        await tx.productGroupTag.create({ data: { groupId: group.inflowId, tagId: dbTag.id } });
      }

      // 3. Structural Storage Map for items
      const structuralOptionsMap: Array<{
        optionInflowId: string;
        optionName: string;
        values: Array<{ valueInflowId: string; literalStr: string; isSkuDriver: boolean }>;
      }> = [];

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const optionInflowId = crypto.randomUUID().toLowerCase();
        const targetAttributeId = opt.attributeId && opt.attributeId !== "custom-literal-mode" ? opt.attributeId : null;

        let finalAttributeId = targetAttributeId;
        if (!finalAttributeId) {
          const fallbackAttribute = await tx.attribute.upsert({
            where: { name: opt.name.trim() }, update: {}, create: { name: opt.name.trim() }
          });
          finalAttributeId = fallbackAttribute.id;
        }

        const createdOpt = await tx.productGroupOption.create({
          data: { inflowId: optionInflowId, productGroupId: group.inflowId, lineNum: i + 1, attributeId: finalAttributeId }
        });

        const loggedValues: Array<{ valueInflowId: string; literalStr: string; isSkuDriver: boolean }> = [];
        for (let j = 0; j < opt.values.length; j++) {
          const val = opt.values[j];
          const valueInflowId = crypto.randomUUID().toLowerCase();
          
          // 🎯 UPDATED: Map matching value definitions from incoming form body array
          const formValueObj = opt.values[j];
          const isSkuDriver = formValueObj?.isSkuDriver ?? true; // fallback to true if undefined

          const dbAttrValue = await tx.attributeValue.upsert({
            where: { attributeId_value: { attributeId: finalAttributeId, value: val.value.trim() } },
            update: {}, create: { attributeId: finalAttributeId, value: val.value.trim() }
          });
          
          await tx.productGroupOptionValue.create({
            data: { inflowId: valueInflowId, optionId: createdOpt.inflowId, lineNum: j + 1, attributeValueId: dbAttrValue.id }
          });
          
          loggedValues.push({ valueInflowId, literalStr: val.value, isSkuDriver });
        }
        structuralOptionsMap.push({ optionInflowId, optionName: opt.name, values: loggedValues });
      }

      // 🎯 UPDATED: Include ALL values for the initial cartesian engine loop matrix
      // const valueArraysForCartesian = structuralOptionsMap.map(opt => 
      //   opt.values.map(v => ({
      //     optionInflowId: opt.optionInflowId,
      //     optionName: opt.optionName,
      //     valueInflowId: v.valueInflowId,
      //     literalStr: v.literalStr,
      //     isSkuDriver: v.isSkuDriver // 👈 Forward flag to the loop index
      //   }))
      // );

      // // 7. Generate intersections dynamically across all available properties
      // const cartesianIntersections = getCartesianProduct(valueArraysForCartesian);

      // 🟢 STEP 6: Compute Matrix Array Intersections (Only include active SKU drivers)
      const valueArraysForCartesian = structuralOptionsMap
        .map(opt => {
          // Look up the matching incoming option payload block
          const originalOpt = options.find((o: any) => o.name === opt.optionName);
          
          // 🎯 CRITICAL RULE: If option level is false, return empty array to skip child elements
          if (!originalOpt?.isDriver) return [];

          return opt.values
            .filter(v => v.isSkuDriver === true) // Check item level driver flag
            .map(v => ({
              optionInflowId: opt.optionInflowId,
              optionName: opt.optionName, 
              valueInflowId: v.valueInflowId,
              literalStr: v.literalStr,
              isSkuDriver: v.isSkuDriver 
            }));
        })
        // Drop groups that have no contributing driver elements
        .filter(group => group.length > 0); 

      const cartesianIntersections = getCartesianProduct(valueArraysForCartesian);

      // 8. Generate individual child products with variable values conditional mapping
      for (let index = 0; index < cartesianIntersections.length; index++) {
        const intersection = cartesianIntersections[index];
        const variationLabels = intersection.map(item => item.literalStr).join(" / ");
        const variantName = `${name} (${variationLabels})`;
        const variantProductInflowId = crypto.randomUUID().toLowerCase();
        
        // Dynamic base setup variables strings
        const parentSkuMock = name.toUpperCase().substring(0, 6).replace(/\s+/g, "") + "-100";
        const brandTokenStr = brandName.toUpperCase().substring(0, 3).replace(/\s+/g, "");
        const incrementalSequenceStr = String(index + 1).padStart(3, "0");

        let generatedSku = activePattern
          .replace("[PARENT_SKU]", parentSkuMock)
          .replace("[BRAND]", brandTokenStr)
          .replace("[INDEX]", incrementalSequenceStr);

        // 🎯 UPDATED: Run the generator replacement loop conditionally based on value state overrides
        intersection.forEach((sel) => {
          const tokenKey = `[${sel.optionName.trim().toUpperCase().replace(/\s+/g, "_")}]`;
          
          if (sel.isSkuDriver) {
            // Apply true value parameter formatting configuration string 
            const sanitizedValue = sel.literalStr.trim().toUpperCase().replace(/\s+/g, "");
            generatedSku = generatedSku.split(tokenKey).join(sanitizedValue);
          } else {
            // Strip option configuration tokens from the compiled result string if disabled
            generatedSku = generatedSku.split(tokenKey).join("");
          }
        });

        // Clean double/trailing spacer patterns left over from skipped parameters
        if (activeSeparator) {
          const doubleSepRegex = new RegExp(`\\${activeSeparator}+`, "g");
          generatedSku = generatedSku.replace(doubleSepRegex, activeSeparator);
          
          if (generatedSku.startsWith(activeSeparator)) generatedSku = generatedSku.slice(activeSeparator.length);
          if (generatedSku.endsWith(activeSeparator)) generatedSku = generatedSku.slice(0, -activeSeparator.length);
        }

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

        // B. Connect structural relationship layout balances definitions metrics mapping 
        const productVariantInflowId = crypto.randomUUID().toLowerCase();
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

        // C & D Join layers
        for (const featRelation of localizedFeaturesList) {
          await tx.productFeature.create({
            data: { productId: childProduct.inflowId, featureId: featRelation.featureId, featureValueId: featRelation.featureValueId }
          });
        }
        for (const tagId of localizedTagsList) {
          await tx.productTag.create({
            data: { productId: childProduct.inflowId, tagId: tagId }
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
      variants: incomingVariantsManager,
      skuPattern,   
      skuSeparator  
    } = body;

    if (!groupId || !name || !options || options.length === 0) {
      return NextResponse.json({ error: "Missing required identification metadata matrix options." }, { status: 400 });
    }

    // Default configuration fallbacks if missing
    const activePattern = skuPattern || "[PARENT_SKU]-[VAL_1]-[VAL_2]-[INDEX]";
    const activeSeparator = typeof skuSeparator === "string" ? skuSeparator : "-";

    const brand = await prisma.brand.findUnique({
      where: { id: brandId || "" },
      select: { name: true }
    });
    const brandName = brand?.name || "GENERIC";
    const groupSlug = await genUniqueSlug(name, prisma.productGroup, groupId);

    // Pre-deduplicate incoming tags & features in memory before transaction layer
    const uniqueFeaturesMap = new Map<string, string>();
    for (const feat of (features || [])) {
      if (feat.key?.trim() && feat.value?.trim()) {
        uniqueFeaturesMap.set(feat.key.trim(), feat.value.trim());
      }
    }

    const uniqueTagsSet = new Set<string>();
    for (const tagStr of (tags || [])) {
      if (tagStr?.trim()) uniqueTagsSet.add(tagStr.trim());
    }

    const updatedGroup = await prisma.$transaction(async (tx) => {
      
      // 🟢 STEP 1: Purge Old Relational Join Mappings
      await tx.productGroupFeature.deleteMany({ where: { groupId } });
      await tx.productGroupTag.deleteMany({ where: { groupId } });
      
      await tx.productGroupOptionValue.deleteMany({
        where: { option: { productGroupId: groupId } }
      });
      await tx.productGroupOption.deleteMany({ where: { productGroupId: groupId } });

      // 🟢 STEP 2: Update Primary Root ProductGroup Core Record Node
      const group = await tx.productGroup.update({
        where: { inflowId: groupId },
        data: {
          name,
          slug: groupSlug,
          description: description || null,
          brandId: brandId || null,
          categoryId: categoryId || null,
          isActive: isActive ?? true,
        }
      });

      const localizedFeaturesList: Array<{ id: string; val: string }> = [];
      const localizedTagsList: string[] = [];

      // 🟢 STEP 3: Re-map Structural System Features Configuration Definitions
      for (const [featKey, featVal] of uniqueFeaturesMap.entries()) {
        const dbFeature = await tx.feature.upsert({
          where: { name: featKey }, update: {}, create: { name: featKey }
        });
        const dbFeatureValue = await tx.featureValue.upsert({
          where: { featureId_value: { featureId: dbFeature.id, value: featVal } },
          update: {}, create: { featureId: dbFeature.id, value: featVal }
        });
        await tx.productGroupFeature.create({
          data: { groupId: group.inflowId, featureId: dbFeature.id, featureValueId: dbFeatureValue.id }
        });
        localizedFeaturesList.push({ id: dbFeature.id, val: featVal });
      }

      // 🟢 STEP 4: Re-map System Discoverability Search Keywords
      for (const tagStr of uniqueTagsSet) {
        const dbTag = await tx.tag.upsert({
          where: { name: tagStr }, update: {}, create: { name: tagStr }
        });
        await tx.productGroupTag.create({
          data: { groupId: group.inflowId, tagId: dbTag.id }
        });
        localizedTagsList.push(dbTag.id);
      }

      // 🟢 STEP 5: Populate Re-built Clean Database Metadata Configuration Rows
      const structuralOptionsMap: Array<{
        optionInflowId: string;
        optionName: string;
        values: Array<{ valueInflowId: string; fingerprintId: string; literalStr: string; isSkuDriver: boolean }>;
      }> = [];

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const optionInflowId = crypto.randomUUID().toLowerCase();
        const targetAttributeId = opt.attributeId && opt.attributeId !== "custom-literal-mode" ? opt.attributeId : null;

        let finalAttributeId = targetAttributeId;
        if (!finalAttributeId) {
          const fallbackAttribute = await tx.attribute.upsert({
            where: { name: opt.name.trim() }, update: {}, create: { name: opt.name.trim() }
          });
          finalAttributeId = fallbackAttribute.id;
        }

        const createdOpt = await tx.productGroupOption.create({
          data: { inflowId: optionInflowId, productGroupId: group.inflowId, lineNum: i + 1, attributeId: finalAttributeId }
        });

        const loggedValues: Array<{ valueInflowId: string; fingerprintId: string; literalStr: string; isSkuDriver: boolean }> = [];
        for (let j = 0; j < opt.values.length; j++) {
          const val = opt.values[j];
          const valueInflowId = crypto.randomUUID().toLowerCase();
          
          // 🎯 ATOMIC UPDATE: Capture value level toggle driver flags directly from request options schema context
          const isSkuDriver = val?.isSkuDriver ?? true;

          const dbAttrValue = await tx.attributeValue.upsert({
            where: { attributeId_value: { attributeId: finalAttributeId, value: val.value.trim() } },
            update: {}, create: { attributeId: finalAttributeId, value: val.value.trim() }
          });
          await tx.productGroupOptionValue.create({
            data: { inflowId: valueInflowId, optionId: createdOpt.inflowId, lineNum: j + 1, attributeValueId: dbAttrValue.id }
          });
          loggedValues.push({ valueInflowId, fingerprintId: dbAttrValue.id, literalStr: val.value.trim(), isSkuDriver });
        }
        structuralOptionsMap.push({ optionInflowId, optionName: opt.name, values: loggedValues });
      }

      // 🟢 STEP 6: 🎯 REFACTOR: Pass ALL option data through to guarantee variant matrices arrays stay complete
      // const valueArraysForCartesian = structuralOptionsMap.map(opt => 
      //   opt.values.map(v => ({
      //     optionInflowId: opt.optionInflowId,
      //     optionName: opt.optionName, 
      //     valueInflowId: v.valueInflowId,
      //     fingerprintId: v.fingerprintId,
      //     literalStr: v.literalStr,
      //     isSkuDriver: v.isSkuDriver // 👈 Forward flag down to generation loops pipeline
      //   }))
      // );

      // const newCartesianIntersections = getCartesianProduct(valueArraysForCartesian);

      // 🟢 STEP 6: Compute Matrix Array Intersections (Only include active SKU drivers)
      const valueArraysForCartesian = structuralOptionsMap
        .map(opt => {
          // Look up the matching incoming option payload block
          const originalOpt = options.find((o: any) => o.name === opt.optionName);
          
          // 🎯 CRITICAL RULE: If option level is false, return empty array to skip child elements
          if (!originalOpt?.isDriver) return [];

          return opt.values
            .filter(v => v.isSkuDriver === true) // Check item level driver flag
            .map(v => ({
              optionInflowId: opt.optionInflowId,
              optionName: opt.optionName, 
              valueInflowId: v.valueInflowId,
              fingerprintId: v.fingerprintId ?? undefined, // Only needed for PATCH
              literalStr: v.literalStr,
              isSkuDriver: v.isSkuDriver 
            }));
        })
        // Drop groups that have no contributing driver elements
        .filter(group => group.length > 0); 

      const newCartesianIntersections = getCartesianProduct(valueArraysForCartesian);

      // Fetch currently stored item variations for differential mapping updates
      const existingVariants = await tx.productVariant.findMany({
        where: { productGroupId: groupId },
        select: { inflowId: true, signature: true, productId: true }
      });
      const existingSignatures = existingVariants.map(v => v.signature);

      // 🟢 STEP 7: Append Structural Additions (With Custom SKU Engine Integration)

      // 1. Fetch ALL current products tied to this group to look up their actual assigned SKUs
      const groupProductsWithSkus = await tx.productVariant.findMany({
        where: { productGroupId: groupId },
        select: {
          product: {
            select: { sku: true }
          }
        }
      });

      // 2. Parse out the maximum numerical index suffix found (e.g., "003" -> 3)
      let highestCurrentIndex = 0;
      groupProductsWithSkus.forEach((variant) => {
        const currentSku = variant.product?.sku;
        if (!currentSku) return;

        // Split on your active separator (e.g., "-")
        const parts = currentSku.split(activeSeparator);
        if (parts.length > 0) {
          // Grab the last element in the SKU string token sequence
          const lastPart = parts[parts.length - 1]; 
          const parsedIndex = parseInt(lastPart, 10);
          
          // Ensure it's a valid number before comparing
          if (!isNaN(parsedIndex) && parsedIndex > highestCurrentIndex) {
            highestCurrentIndex = parsedIndex;
          }
        }
      });

      // Track our ongoing operational pointer safely out of the loop range
      let nextSequenceCounter = highestCurrentIndex + 1;

      for (let index = 0; index < newCartesianIntersections.length; index++) {
        const intersection = newCartesianIntersections[index];
        if (intersection.length === 0) continue;

        const newSignature = intersection.map(item => item.fingerprintId).sort().join("-");
        if (existingSignatures.includes(newSignature)) continue;

        const variationLabels = intersection.map(item => item.literalStr).join(" / ");
        const variantName = `${name} (${variationLabels})`;
        const childProductInflowId = crypto.randomUUID().toLowerCase();

        // 🛠️ DYNAMIC SKU COMPILER LOGIC FOR NEW INTERSECTIONS
        const parentSkuMock = name.toUpperCase().substring(0, 6).replace(/\s+/g, "") + "-100";
        const brandTokenStr = brandName.toUpperCase().substring(0, 3).replace(/\s+/g, "");
        // const incrementalSequenceStr = String(index + 1).padStart(3, "0");
        // 🎯 CRITICAL FIX: Instead of your loop's 'index', format the running sequence counter
        const incrementalSequenceStr = String(nextSequenceCounter).padStart(3, "0");

        let generatedSku = activePattern
          .replace("[PARENT_SKU]", parentSkuMock)
          .replace("[BRAND]", brandTokenStr)
          .replace("[INDEX]", incrementalSequenceStr);

        // 🎯 INTERSECTION LOOP REFACTOR: Map runtime tokens conditionally based on item-level flag overrides
        intersection.forEach((sel) => {
          const tokenKey = `[${sel.optionName.trim().toUpperCase().replace(/\s+/g, "_")}]`;
          
          if (sel.isSkuDriver) {
            const sanitizedValue = sel.literalStr.trim().toUpperCase().replace(/\s+/g, "");
            generatedSku = generatedSku.split(tokenKey).join(sanitizedValue);
          } else {
            // Strip option placeholder parameters if item is flagged to drop from dynamic compiling handles
            generatedSku = generatedSku.split(tokenKey).join("");
          }
        });

        // Cleanup trailing or duplicate structural separators left by skipped values
        if (activeSeparator) {
          const doubleSepRegex = new RegExp(`\\${activeSeparator}+`, "g");
          generatedSku = generatedSku.replace(doubleSepRegex, activeSeparator);
          
          if (generatedSku.startsWith(activeSeparator)) generatedSku = generatedSku.slice(activeSeparator.length);
          if (generatedSku.endsWith(activeSeparator)) generatedSku = generatedSku.slice(0, -activeSeparator.length);
        }

        // A. Insert base SKU catalog entity placeholder table record
        const childProduct = await tx.product.create({
          data: {
            inflowId: childProductInflowId,
            sku: generatedSku, 
            name: variantName,
            slug: await genUniqueSlug(variantName, tx.product),
            isActive: false,
            brandId: brandId || null,
            categoryId: categoryId || null,
            description: description || null
          }
        });

        // B. Connect core inventory balance record with its relational matrix metadata 
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
                optionId: sel.optionInflowId,      
                optionValueId: sel.valueInflowId,  
              }))
            }
          }
        });

        // C & D Join layers
        for (const featRelation of localizedFeaturesList) {
          const dbFeatureValue = await tx.featureValue.upsert({
            where: { featureId_value: { featureId: featRelation.id, value: featRelation.val } },
            update: {}, create: { featureId: featRelation.id, value: featRelation.val }
          });
          await tx.productFeature.create({
            data: { productId: childProduct.inflowId, featureId: featRelation.id, featureValueId: dbFeatureValue.id }
          });
        }

        for (const tagId of localizedTagsList) {
          await tx.productTag.create({
            data: { productId: childProduct.inflowId, tagId: tagId }
          });
        }

        nextSequenceCounter++;
      }

      // 🟢 STEP 8: Process UI Table Differential Mutations Lifecycles
      for (const UIItem of (incomingVariantsManager || [])) {
        if (UIItem.isExisting) {
          if (UIItem.status === "unlink") {
            await tx.productVariantSelection.deleteMany({
              where: { variant: { productId: UIItem.productId, productGroupId: groupId } }
            });
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

            await tx.product.update({
              where: { inflowId: UIItem.productId },
              data: { brandId: brandId || null, categoryId: categoryId || null }
            });

            for (const featRelation of localizedFeaturesList) {
              const dbFeatureValue = await tx.featureValue.upsert({
                where: { featureId_value: { featureId: featRelation.id, value: featRelation.val } },
                update: {}, create: { featureId: featRelation.id, value: featRelation.val }
              });
              await tx.productFeature.upsert({
                where: { productId_featureId: { productId: UIItem.productId, featureId: featRelation.id } },
                update: { featureValueId: dbFeatureValue.id },
                create: { productId: UIItem.productId, featureId: featRelation.id, featureValueId: dbFeatureValue.id }
              });
            }

            for (const tagId of localizedTagsList) {
              await tx.productTag.upsert({
                where: { productId_tagId: { productId: UIItem.productId, tagId: tagId } },
                update: {}, create: { productId: UIItem.productId, tagId: tagId }
              });
            }
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


// =============== >> SKU Server GENERATED >> =============

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { name, description, brandId, categoryId, isActive, options, tags, features } = body;

//     if (!name || !options || options.length === 0) {
//       return NextResponse.json({ error: "Missing required identification metadata matrix options." }, { status: 400 });
//     }

//     // 1. Resolve brand context for SKU prefixing patterns
//     const brand = await prisma.brand.findUnique({
//       where: { id: brandId || "" },
//       select: { name: true }
//     });
//     const brandName = brand?.name || "GENERIC";

//     const masterGroupInflowId = crypto.randomUUID().toLowerCase();
//     const groupSlug = await genUniqueSlug(name, prisma.productGroup);

//     // Execute everything safely wrapped in a sequential database isolation transaction
//     const savedGroup = await prisma.$transaction(async (tx) => {
      
//       // 2. Insert primary Root ProductGroup configuration record node
//       const group = await tx.productGroup.create({
//         data: {
//           inflowId: masterGroupInflowId,
//           name,
//           slug: groupSlug,
//           description: description || null,
//           brandId: brandId || null,
//           categoryId: categoryId || null,
//           isActive: isActive ?? true,
//         }
//       });

//       // 3. Map structural system features lookup definitions globally
//       const localizedFeaturesList: Array<{ featureId: string; featureValueId: string }> = [];
//       for (const feat of (features || [])) {
//         if (!feat.key.trim() || !feat.value.trim()) continue;
        
//         // Ensure Feature class exists
//         const dbFeature = await tx.feature.upsert({
//           where: { name: feat.key.trim() },
//           update: {},
//           create: { name: feat.key.trim() }
//         });

//         // Ensure Feature Value variant exists under this specific feature
//         const dbFeatureValue = await tx.featureValue.upsert({
//           where: {
//             featureId_value: {
//               featureId: dbFeature.id,
//               value: feat.value.trim()
//             }
//           },
//           update: {},
//           create: {
//             featureId: dbFeature.id,
//             value: feat.value.trim()
//           }
//         });

//         localizedFeaturesList.push({ 
//           featureId: dbFeature.id, 
//           featureValueId: dbFeatureValue.id 
//         });

//         // Map Feature to the Parent Product Group
//         await tx.productGroupFeature.create({
//           data: {
//             groupId: group.inflowId,
//             featureId: dbFeature.id,
//             featureValueId: dbFeatureValue.id
//           }
//         });
//       }

//       // 4. Map system search keywords lookup tags globally
//       const localizedTagsList: string[] = [];
//       for (const tagStr of (tags || [])) {
//         if (!tagStr.trim()) continue;
//         const dbTag = await tx.tag.upsert({
//           where: { name: tagStr.trim() },
//           update: {},
//           create: { name: tagStr.trim() }
//         });
//         localizedTagsList.push(dbTag.id);

//         // Link tag to parent group via group-tag join layer
//         await tx.productGroupTag.create({
//           data: {
//             groupId: group.inflowId,
//             tagId: dbTag.id
//           }
//         });
//       }

//       // Track created database lookup options & value configurations for selections mapping later
//       const structuralOptionsMap: Array<{
//         optionInflowId: string;
//         optionName: string;
//         values: Array<{ valueInflowId: string; literalStr: string }>;
//       }> = [];

//       // 5. Populate database metadata for option rows and option values
//       for (let i = 0; i < options.length; i++) {
//         const opt = options[i];
//         const optionInflowId = crypto.randomUUID().toLowerCase();
//         const targetAttributeId = opt.attributeId && opt.attributeId !== "custom-literal-mode" ? opt.attributeId : null;

//         // Automatically create dynamic missing attributes if designated raw custom text matches something new
//         let finalAttributeId = targetAttributeId;
//         if (!finalAttributeId) {
//           const fallbackAttribute = await tx.attribute.upsert({
//             where: { name: opt.name.trim() },
//             update: {},
//             create: { name: opt.name.trim() }
//           });
//           finalAttributeId = fallbackAttribute.id;
//         }

//         const createdOpt = await tx.productGroupOption.create({
//           data: {
//             inflowId: optionInflowId,
//             productGroupId: group.inflowId,
//             lineNum: i + 1,
//             attributeId: finalAttributeId,
//           }
//         });

//         const loggedValues: Array<{ valueInflowId: string; literalStr: string }> = [];

//         for (let j = 0; j < opt.values.length; j++) {
//           const val = opt.values[j];
//           const valueInflowId = crypto.randomUUID().toLowerCase();

//           // Sync attribute values mapping
//           const dbAttrValue = await tx.attributeValue.upsert({
//             where: {
//               attributeId_value: {
//                 attributeId: finalAttributeId,
//                 value: val.value.trim()
//               }
//             },
//             update: {},
//             create: {
//               attributeId: finalAttributeId,
//               value: val.value.trim()
//             }
//           });

//           await tx.productGroupOptionValue.create({
//             data: {
//               inflowId: valueInflowId,
//               optionId: createdOpt.inflowId,
//               lineNum: j + 1,
//               attributeValueId: dbAttrValue.id, 
//             }
//           });

//           loggedValues.push({ valueInflowId, literalStr: val.value });
//         }

//         structuralOptionsMap.push({
//           optionInflowId,
//           optionName: opt.name,
//           values: loggedValues
//         });
//       }

//       const driverOptions = options.filter((opt: any) => opt.isDriver !== false);

//       const valueArraysForCartesian = structuralOptionsMap
//         .filter(opt => {
//           // Find the original incoming option to check its isDriver status
//           const originalOpt = options.find((o: any) => o.name === opt.optionName);
//           return originalOpt?.isDriver ?? true;
//         })
//         .map(opt => 
//           opt.values.map(v => ({
//             optionInflowId: opt.optionInflowId,
//             valueInflowId: v.valueInflowId,
//             literalStr: v.literalStr
//           }))
//         );

//       // 7. Build dynamic cross product lines array using ONLY driver fields
//       const cartesianIntersections = getCartesianProduct(valueArraysForCartesian);

//       // 8. Generate individual Child Products and concrete Variant references sequentially
//       for (const intersection of cartesianIntersections) {
//         const variationLabels = intersection.map(item => item.literalStr).join(" / ");
//         const variantName = `${name} (${variationLabels})`;
//         const variantProductInflowId = crypto.randomUUID().toLowerCase();
        
//         const individualVariantValuesArray = intersection.map(item => item.literalStr);
//         const generatedSku = generateSku2Variant2(brandName, name, individualVariantValuesArray);
//         const generatedSlug = await genUniqueSlug(variantName, prisma.product);

//         // A. Insert base SKU catalog entity placeholder table record
//         const childProduct = await tx.product.create({
//           data: {
//             inflowId: variantProductInflowId,
//             sku: generatedSku,
//             name: variantName,
//             slug: generatedSlug,
//             description: description || null,
//             isActive: false,
//             brandId: brandId || null,
//             categoryId: categoryId || null
//           }
//         });

//         // B. Connect the core inventory balance record with its relational matrix metadata 
//         const productVariantInflowId = crypto.randomUUID().toLowerCase();
        
//         // Calculated unique option combination deterministic signature string
//         const variantSignature = intersection.map(item => item.valueInflowId).sort().join("-");
//         // const variantSignature = `custom-${crypto.randomUUID().slice(0, 8)}`;

//         await tx.productVariant.create({
//           data: {
//             inflowId: productVariantInflowId,
//             productGroupId: group.inflowId,
//             productId: childProduct.inflowId,
//             defaultPrice: 0.00,
//             signature: variantSignature, 
//             variantCount: cartesianIntersections.length, 
//             selections: {
//               create: intersection.map((sel) => ({
//                 optionId: sel.optionInflowId, 
//                 optionValueId: sel.valueInflowId, 
//               }))
//             }
//           }
//         });

//         // C. Insert relational specifications (ProductFeature Join Layer)
//         for (const featRelation of localizedFeaturesList) {
//           await tx.productFeature.create({
//             data: {
//               productId: childProduct.inflowId,
//               featureId: featRelation.featureId,
//               featureValueId: featRelation.featureValueId
//             }
//           });
//         }

//         // D. Insert contextual search filters (ProductTag Join Layer)
//         for (const tagId of localizedTagsList) {
//           await tx.productTag.create({
//             data: {
//               productId: childProduct.inflowId,
//               tagId: tagId
//             }
//           });
//         }
//       }

//       return group;
//     });

//     return NextResponse.json(savedGroup, { status: 201 });
//   } catch (error: any) {
//     console.error("Product Group generation crash failure:", error);
//     return NextResponse.json(
//       { error: error.message || "Database execution error during transactional commit layers." }, 
//       { status: 500 }
//     );
//   }
// }


// app/api/admin/groups/route.ts


// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       id: groupId, 
//       brandId, 
//       categoryId, 
//       isActive, 
//       name, 
//       features, 
//       description, 
//       tags, 
//       options, 
//       variants: incomingVariantsManager 
//     } = body;

//     if (!groupId || !name || !options || options.length === 0) {
//       return NextResponse.json({ error: "Missing required identification metadata matrix options." }, { status: 400 });
//     }

//     const brand = await prisma.brand.findUnique({
//       where: { id: brandId || "" },
//       select: { name: true }
//     });
//     const brandName = brand?.name || "GENERIC";
//     const groupSlug = await genUniqueSlug(name, prisma.productGroup, groupId);

//     // 🎯 FIX 1: Pre-deduplicate incoming tags & features in memory before transaction layer
//     const uniqueFeaturesMap = new Map<string, string>();
//     for (const feat of (features || [])) {
//       if (feat.key?.trim() && feat.value?.trim()) {
//         uniqueFeaturesMap.set(feat.key.trim(), feat.value.trim());
//       }
//     }

//     const uniqueTagsSet = new Set<string>();
//     for (const tagStr of (tags || [])) {
//       if (tagStr?.trim()) uniqueTagsSet.add(tagStr.trim());
//     }

//     const updatedGroup = await prisma.$transaction(async (tx) => {
      
//       // 🟢 STEP 1: Purge Old Relational Join Mappings
//       await tx.productGroupFeature.deleteMany({ where: { groupId } });
//       await tx.productGroupTag.deleteMany({ where: { groupId } });
      
//       await tx.productGroupOptionValue.deleteMany({
//         where: { option: { productGroupId: groupId } }
//       });
//       await tx.productGroupOption.deleteMany({ where: { productGroupId: groupId } });

//       // 🟢 STEP 2: Update Primary Root ProductGroup Core Record Node
//       const group = await tx.productGroup.update({
//         where: { inflowId: groupId },
//         data: {
//           name,
//           slug: groupSlug,
//           description: description || null,
//           brandId: brandId || null,
//           categoryId: categoryId || null,
//           isActive: isActive ?? true,
//         }
//       });

//       // 🎯 FIX 2: Declare variables with transaction-wide scope
//       const localizedFeaturesList: Array<{ id: string; val: string }> = [];
//       const localizedTagsList: string[] = [];

//       // 🟢 STEP 3: Re-map Structural System Features Configuration Definitions
//       for (const [featKey, featVal] of uniqueFeaturesMap.entries()) {
//         const dbFeature = await tx.feature.upsert({
//           where: { name: featKey },
//           update: {},
//           create: { name: featKey }
//         });

//         const dbFeatureValue = await tx.featureValue.upsert({
//           where: {
//             featureId_value: {
//               featureId: dbFeature.id,
//               value: featVal
//             }
//           },
//           update: {},
//           create: {
//             featureId: dbFeature.id,
//             value: featVal
//           }
//         });

//         await tx.productGroupFeature.create({
//           data: {
//             groupId: group.inflowId,
//             featureId: dbFeature.id,
//             featureValueId: dbFeatureValue.id
//           }
//         });

//         // Safe push into transaction scope
//         localizedFeaturesList.push({ id: dbFeature.id, val: featVal });
//       }

//       // 🟢 STEP 4: Re-map System Discoverability Search Keywords
//       for (const tagStr of uniqueTagsSet) {
//         const dbTag = await tx.tag.upsert({
//           where: { name: tagStr },
//           update: {},
//           create: { name: tagStr }
//         });

//         await tx.productGroupTag.create({
//           data: {
//             groupId: group.inflowId,
//             tagId: dbTag.id
//           }
//         });

//         // Safe push into transaction scope
//         localizedTagsList.push(dbTag.id);
//       }

//       // 🟢 STEP 5: Populate Re-built Clean Database Metadata Configuration Rows
//       const structuralOptionsMap: Array<{
//         optionInflowId: string;
//         optionName: string;
//         values: Array<{ valueInflowId: string; fingerprintId: string; literalStr: string }>;
//       }> = [];

//       for (let i = 0; i < options.length; i++) {
//         const opt = options[i];
//         const optionInflowId = crypto.randomUUID().toLowerCase();
//         const targetAttributeId = opt.attributeId && opt.attributeId !== "custom-literal-mode" ? opt.attributeId : null;

//         let finalAttributeId = targetAttributeId;
//         if (!finalAttributeId) {
//           const fallbackAttribute = await tx.attribute.upsert({
//             where: { name: opt.name.trim() },
//             update: {},
//             create: { name: opt.name.trim() }
//           });
//           finalAttributeId = fallbackAttribute.id;
//         }

//         const createdOpt = await tx.productGroupOption.create({
//           data: {
//             inflowId: optionInflowId,
//             productGroupId: group.inflowId,
//             lineNum: i + 1,
//             attributeId: finalAttributeId,
//           }
//         });

//         // 🎯 FIX: Explicitly type this array to expect the fingerprintId parameter
//         const loggedValues: Array<{ valueInflowId: string; fingerprintId: string; literalStr: string }> = [];

//         for (let j = 0; j < opt.values.length; j++) {
//           const val = opt.values[j];
//           const valueInflowId = crypto.randomUUID().toLowerCase();

//           const dbAttrValue = await tx.attributeValue.upsert({
//             where: {
//               attributeId_value: {
//                 attributeId: finalAttributeId,
//                 value: val.value.trim()
//               }
//             },
//             update: {},
//             create: {
//               attributeId: finalAttributeId,
//               value: val.value.trim()
//             }
//           });

//           await tx.productGroupOptionValue.create({
//             data: {
//               inflowId: valueInflowId,
//               optionId: createdOpt.inflowId,
//               lineNum: j + 1,
//               attributeValueId: dbAttrValue.id, 
//             }
//           });

//           // Now this aligns perfectly with the typed array definition above!
//           loggedValues.push({ 
//             valueInflowId: valueInflowId,     
//             fingerprintId: dbAttrValue.id,    
//             literalStr: val.value.trim() 
//           });
//         }

//         structuralOptionsMap.push({
//           optionInflowId,
//           optionName: opt.name,
//           values: loggedValues
//         });
//       }

//       // 🟢 STEP 6: Compute Matrix Array Intersections (Driver Dependent Mapping)
//       const valueArraysForCartesian = structuralOptionsMap
//         .filter(opt => {
//           const originalOpt = options.find((o: any) => o.name === opt.optionName);
//           return originalOpt?.isDriver ?? true;
//         })
//         .map(opt => 
//           opt.values.map(v => ({
//             optionInflowId: opt.optionInflowId,
//             valueInflowId: v.valueInflowId,
//             fingerprintId: v.fingerprintId, // ✨ Ensure this is passed along!
//             literalStr: v.literalStr
//           }))
//         );

//       const newCartesianIntersections = getCartesianProduct(valueArraysForCartesian);

//       // Fetch currently stored item variations for differential mapping updates
//       const existingVariants = await tx.productVariant.findMany({
//         where: { productGroupId: groupId },
//         select: { inflowId: true, signature: true, productId: true }
//       });
//       const existingSignatures = existingVariants.map(v => v.signature);

//       // 🟢 STEP 7: Append Structural Additions (e.g., Material + Color additions)
//       for (const intersection of newCartesianIntersections) {
//         if (intersection.length === 0) continue;

//         const newSignature = intersection.map(item => item.fingerprintId).sort().join("-");
//         if (existingSignatures.includes(newSignature)) continue;

//         const variationLabels = intersection.map(item => item.literalStr).join(" / ");
//         const variantName = `${name} (${variationLabels})`;
//         const childProductInflowId = crypto.randomUUID().toLowerCase();

//         // A. Insert base SKU catalog entity placeholder table record
//         const childProduct = await tx.product.create({
//           data: {
//             inflowId: childProductInflowId,
//             sku: generateSku2Variant2(brandName, name, intersection.map(i => i.literalStr)),
//             name: variantName,
//             slug: await genUniqueSlug(variantName, tx.product),
//             isActive: false,
//             brandId: brandId || null,
//             categoryId: categoryId || null,
//             description: description || null
//           }
//         });

//         // B. Connect the core inventory balance record with its relational matrix metadata 
//         await tx.productVariant.create({
//           data: {
//             inflowId: crypto.randomUUID().toLowerCase(),
//             productGroupId: groupId,
//             productId: childProduct.inflowId,
//             defaultPrice: 0.00,
//             signature: newSignature,
//             variantCount: newCartesianIntersections.length,
//             selections: {
//               create: intersection.map((sel) => ({
//                 optionId: sel.optionInflowId,      
//                 optionValueId: sel.valueInflowId,  
//               }))
//             }
//           }
//         });

//         // C. 🎯 FIX: Relational specifications targeting FeatureValue layout
//         for (const featRelation of localizedFeaturesList) {
//           // Look up or establish the FeatureValue reference for the variant context safely
//           const dbFeatureValue = await tx.featureValue.upsert({
//             where: {
//               featureId_value: {
//                 featureId: featRelation.id,
//                 value: featRelation.val
//               }
//             },
//             update: {},
//             create: {
//               featureId: featRelation.id,
//               value: featRelation.val
//             }
//           });

//           await tx.productFeature.create({
//             data: {
//               productId: childProduct.inflowId,
//               featureId: featRelation.id,
//               featureValueId: dbFeatureValue.id // 👈 Matches your strict relational schema fields
//             }
//           });
//         }

//         // D. 🎯 FIX: Link contextual search filter tags cleanly
//         for (const tagId of localizedTagsList) {
//           await tx.productTag.create({
//             data: {
//               productId: childProduct.inflowId,
//               tagId: tagId
//             }
//           });
//         }
//       }

//       // 🟢 STEP 8: Process UI Table Differential Mutations Lifecycles
//       for (const UIItem of (incomingVariantsManager || [])) {
//         if (UIItem.isExisting) {
//           if (UIItem.status === "unlink") {
//             await tx.productVariantSelection.deleteMany({
//               where: { variant: { productId: UIItem.productId, productGroupId: groupId } }
//             });
//             await tx.productVariant.deleteMany({
//               where: { productId: UIItem.productId, productGroupId: groupId }
//             });
//           } else if (UIItem.status === "delete") {
//             await tx.productVariant.deleteMany({ where: { productId: UIItem.productId } });
//             await tx.productFeature.deleteMany({ where: { productId: UIItem.productId } });
//             await tx.productTag.deleteMany({ where: { productId: UIItem.productId } });
//             await tx.product.delete({ where: { inflowId: UIItem.productId } });
//           } else if (UIItem.status === "active") {
//             // Sync base catalog prices
//             await tx.productVariant.updateMany({
//               where: { productId: UIItem.productId, productGroupId: groupId },
//               data: { defaultPrice: Number(UIItem.defaultPrice) }
//             });

//             // Re-sync basic classifications if changed at root group level
//             await tx.product.update({
//               where: { inflowId: UIItem.productId },
//               data: { brandId: brandId || null, categoryId: categoryId || null }
//             });

//             // 🎯 Re-sync core features for existing rows cleanly matching new composite primary key constraints
//             for (const featRelation of localizedFeaturesList) {
//               const dbFeatureValue = await tx.featureValue.upsert({
//                 where: { featureId_value: { featureId: featRelation.id, value: featRelation.val } },
//                 update: {},
//                 create: { featureId: featRelation.id, value: featRelation.val }
//               });

//               await tx.productFeature.upsert({
//                 where: { productId_featureId: { productId: UIItem.productId, featureId: featRelation.id } },
//                 update: { featureValueId: dbFeatureValue.id },
//                 create: { productId: UIItem.productId, featureId: featRelation.id, featureValueId: dbFeatureValue.id }
//               });
//             }

//             // 🎯 Re-sync core tag items for existing rows cleanly 
//             for (const tagId of localizedTagsList) {
//               await tx.productTag.upsert({
//                 where: { productId_tagId: { productId: UIItem.productId, tagId: tagId } },
//                 update: {},
//                 create: { productId: UIItem.productId, tagId: tagId }
//               });
//             }
//           }
//         }
//       }

//       return group;
//     });

//     return NextResponse.json(updatedGroup, { status: 200 });
//   } catch (error: any) {
//     console.error("⛔ MATRIX SYNC ERROR ENGINE FAIL:", error);
//     return NextResponse.json({ error: error.message || "Internal Matrix Mutation Crash" }, { status: 500 });
//   }
// }

// =============== xx SKU Server GENERATED xx =============

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
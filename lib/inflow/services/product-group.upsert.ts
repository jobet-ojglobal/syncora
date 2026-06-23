import { prisma } from "@/lib/prisma";
import { CreateProductGroupInput } from "@/schemas/product-group.schema";
import { syncProductGroup } from "./product-group-sync";
import { getProductGroup, upsertProductGroup } from "../data/product-group";
import { upsertProduct } from "../data/products";
import { syncCategory } from "./category-sync";

// Helper function to generate clean, short SKU components from product text names
function generateSkuSlug(text: string): string {
  const clean = text.trim().replace(/[^a-zA-Z0-9\s-]/g, ""); // Remove special characters
  const words = clean.split(/[\s-]+/).filter(Boolean);

  if (words.length === 1) {
    const singleWord = words[0].toUpperCase();
    // If it's a short word, keep it; if long, truncate to 3 letters (e.g., "Black" -> "BLA")
    return singleWord.length <= 4 ? singleWord : singleWord.slice(0, 3);
  }

  // If multi-word (e.g., "Fully Assembled"), grab initials: "FA"
  // If it contains numbers (e.g. "Q1 Pro"), keep numbers: "Q1P"
  return words
    .map(word => {
      const upper = word.toUpperCase();
      const match = upper.match(/[0-9]+/); // Preserve numbers if they exist
      return match ? match[0] + upper.charAt(0) : upper.charAt(0);
    })
    .join("")
    .replace(/[^A-Z0-9]/g, "") // Ensure clean alphanumeric string
    .slice(0, 4); // Keep slugs reasonably compact
}

export async function createProductGroupToInflow(input: CreateProductGroupInput) {
  if (!input.options || input.options.length === 0) {
    throw new Error("Cannot create a Product Group without variation options.");
  }

  const generatedGroupId = crypto.randomUUID();

  // 1. Transform basic option metadata mapping structure
  const transformedOptions = input.options.map((option, optIdx) => {
    const optionGuid = crypto.randomUUID();
    const optionLineNum = ((optIdx + 1) * 100).toString();

    return {
      lineNum: optionLineNum,
      name: option.name.trim(),
      productGroupOptionId: optionGuid,
      optionValues: option.values.map((valObj, valIdx) => ({
        lineNum: ((valIdx + 1) * 100).toString(),
        productGroupOptionValueId: crypto.randomUUID(),
        value: valObj.value.trim(),
      })),
    };
  });

  // ✨ Prepare custom metadata items for variant synchronization
  // Convert Array of specs [{key: "Sensor", value: "Full Frame"}] -> "Sensor:Full Frame|Max Resolution:8K 30p"
  const flattenedFeatures = input.features
    ?.map(f => `${f.key.trim()}:${f.value.trim()}`)
    .join("|") || "";

  // Convert Array of keywords ["hot-swap", "wireless"] -> "hot-swap, wireless"
  const flattenedTags = input.tags?.map(t => t.trim()).join(", ") || "";

  // Look up brand name string if you have a database reference id, or pass raw ID/name directly
  let brandString = "";
  if (input.brandId && input.brandId !== "no-brand") {
    const brandRecord = await prisma.brand.findUnique({
      where: { id: input.brandId },
      select: { name: true }
    });
    brandString = brandRecord?.name || input.brandId;
  }

  let computedVariants: any[] = [];

  if (input.generateVariants) {
    // Collect variant breakdown arrays
    const optionsArrayOfValues = transformedOptions.map(opt => 
      opt.optionValues.map(val => ({
        optionId: opt.productGroupOptionId,
        optionName: opt.name,
        valueId: val.productGroupOptionValueId,
        valueName: val.value
      }))
    );

    const cartesianProduct = (arrays: any[][]): any[][] => {
      return arrays.reduce((acc, curr) => acc.flatMap(d => curr.map(e => [...d, e])), [[]]);
    };

    const combinations = cartesianProduct(optionsArrayOfValues);

    for (const combination of combinations) {
      const generatedProductId = crypto.randomUUID().toLowerCase();
      const generatedVariantId = crypto.randomUUID().toLowerCase();

      // ✨ 1. Build Naming Structure: "Keychron Q1 Pro - Fully Assembled - Carbon Black"
      const variantValueLabels = combination.map(c => c.valueName).join(" - ");
      const variantProductName = `${input.name.trim()} - ${variantValueLabels}`;

      // ✨ 2. Build SKU Structure: "KEYCHRON-Q1P-FA-BLK"
      // Generate individual short codes for group name and every selected variation value
      const groupSkuBase = input.name.trim().split(/\s+/).slice(0, 2).map(w => w.toUpperCase()).join("-"); 
      const variantSlugs = combination.map(c => generateSkuSlug(c.valueName)).join("-");
      const generatedSku = `${groupSkuBase}-${variantSlugs}`;

      const variantOptionMap: Record<string, string> = {};
      combination.forEach(item => {
        variantOptionMap[item.optionId] = item.valueId;
      });

      // Register separate standalone variant products inside inFlow
      await upsertProduct({
        productId: generatedProductId,
        name: variantProductName,
        sku: generatedSku,
        categoryId: input.categoryId,
        itemType: "StockedProduct",
        isActive: input.isActive,
        standardUomName: "ea.",
        // 🏷️ Connect custom fields schema directly to individual items
        customFields: {
          custom1: brandString,        // Brand Context Label
          custom2: flattenedFeatures, // "Sensor:Full Frame|Max Resolution:8K 30p"
          custom3: flattenedTags,     // "hot-swap, wireless, custom"
        },

        productVariant: {
          defaultPrice: "0.00",
          productGroupId: generatedGroupId,
          productId: generatedProductId,
          productVariantId: generatedVariantId,
          variantOption: variantOptionMap,
          product: null as any,
          productGroup: null as any
        }
      });

      computedVariants.push({
        defaultPrice: "0.00",
        productGroupId: generatedGroupId,
        productId: generatedProductId,
        productVariantId: generatedVariantId,
        variantOption: variantOptionMap,
        product: null as any,
        productGroup: null as any
      });
    }
  }

  // 2. Submit the full payload to the group endpoint using the verified items
  const inflowPayload = {
    productGroupId: generatedGroupId,
    categoryId: input.categoryId,
    name: input.name.trim(),
    isActive: input.isActive,
    options: transformedOptions,
    productVariants: computedVariants,
  };

  const inflowProductGroup = await upsertProductGroup(inflowPayload);

  // 3. Sync data locally
  const localDbRecord = await prisma.$transaction(async (tx) => {
    const targetProductGroup = await getProductGroup(inflowProductGroup.productGroupId);
    targetProductGroup.category ? await syncCategory(tx, targetProductGroup.category) : null;
    await syncProductGroup(tx, targetProductGroup, targetProductGroup.defaultProduct);
    return targetProductGroup;
  });

  return localDbRecord;
}

// import { prisma } from "@/lib/prisma";
// import { CreateProductGroupInput } from "@/schemas/product-group.schema";
// import { syncProductGroup } from "./product-group-sync";
// import { getProductGroup, upsertProductGroup } from "../data/product-group";

// // Extended types reflecting the structural changes
// export interface InflowOptionValuePayload {
//   lineNum: string;
//   productGroupOptionValueId: string;
//   value: string;
// }

// export interface InflowOptionPayload {
//   lineNum: string;
//   name: string;
//   productGroupOptionId: string;
//   optionValues: InflowOptionValuePayload[];
// }

// export interface InflowProductVariantPayload {
//   defaultPrice: string;
//   productGroupId: string;
//   productId: string;
//   productVariantId: string;
//   // inFlow expects a flat string-to-string dictionary record mapping optionId to valueId
//   variantOption: Record<string, string>; 
//   product: Record<string, any>;
//   productGroup: Record<string, any>;
// }

// export interface InflowGroupPayload {
//   productGroupId: string;
//   categoryId: string; // 👈 CRITICAL: Must be explicitly provided at the root level
//   name: string;
//   isActive: boolean;
//   options: InflowOptionPayload[];
//   productVariants: InflowProductVariantPayload[];
//   defaultImageId?: string | null;
//   defaultProductId?: string | null;
// }

// export async function createProductGroupToInflow(input: CreateProductGroupInput) {
//   // Guard clause validation
//   if (!input.options || input.options.length === 0) {
//     throw new Error("Cannot create a Product Group in inFlow without providing at least one variation option.");
//   }

//   const generatedGroupId = crypto.randomUUID();

//   // 1. Transform input array maps into structured inFlow options payload
//   const transformedOptions: InflowOptionPayload[] = input.options.map((option, optIdx) => {
//     const optionGuid = crypto.randomUUID();
//     const optionLineNum = ((optIdx + 1) * 100).toString();

//     return {
//       lineNum: optionLineNum,
//       name: option.name.trim(),
//       productGroupOptionId: optionGuid,
//       optionValues: option.values.map((valObj, valIdx) => {
//         const valueGuid = crypto.randomUUID();
//         const valueLineNum = ((valIdx + 1) * 100).toString();

//         return {
//           lineNum: valueLineNum,
//           productGroupOptionValueId: valueGuid,
//           value: valObj.value.trim(),
//         };
//       }),
//     };
//   });

//   // 2. Build variants if the toggle is set to true
//   let computedVariants: InflowProductVariantPayload[] = [];

//   if (input.generateVariants) {
//     const optionsArrayOfValues = transformedOptions.map(opt => 
//       opt.optionValues.map(val => ({
//         optionId: opt.productGroupOptionId,
//         valueId: val.productGroupOptionValueId
//       }))
//     );

//     // Standard helper mapping combinations
//     const cartesianProduct = (arrays: any[][]): any[][] => {
//       return arrays.reduce((acc, curr) => 
//         acc.flatMap(d => curr.map(e => [...d, e])), 
//         [[]]
//       );
//     };

//     const combinations = cartesianProduct(optionsArrayOfValues);

//     computedVariants = combinations.map((combination: Array<{ optionId: string; valueId: string }>) => {
//       const generatedProductId = crypto.randomUUID();
//       const generatedVariantId = crypto.randomUUID();

//       const variantOptionMap: Record<string, string> = {};
//       combination.forEach(item => {
//         variantOptionMap[item.optionId] = item.valueId;
//       });

//       return {
//         defaultPrice: "0.00",
//         productGroupId: generatedGroupId,
//         productId: generatedProductId,
//         productVariantId: generatedVariantId,
//         variantOption: variantOptionMap,
//         product: {}, // inFlow expects empty objects if not initializing explicit product models
//         productGroup: {}
//       };
//     });
//   }

//   // 3. Construct the clean payload containing category parameters at root level
//   const inflowPayload: InflowGroupPayload = {
//     productGroupId: generatedGroupId,
//     categoryId: input.categoryId, // 👈 Added: Map root level target category relationship
//     name: input.name.trim(),
//     isActive: input.isActive,
//     options: transformedOptions,
//     productVariants: computedVariants,
//     defaultImageId: null,
//     defaultProductId: null
//   };

//   // 4. Send PUT request out to the API
//   const inflowProductGroup = await upsertProductGroup(inflowPayload);

//   // 5. Save locally using a single database transaction context wrapper
//   const localDbRecord = await prisma.$transaction(async (tx) => {
//     // Read clean server response object mapping from remote
//     const targetProductGroup = await getProductGroup(inflowProductGroup.productGroupId);
    
//     // Execute data sync mutations across tables
//     await syncProductGroup(tx, targetProductGroup);
    
//     return targetProductGroup;
//   });

//   return localDbRecord;
// }
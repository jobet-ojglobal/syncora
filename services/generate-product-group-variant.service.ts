import { prisma } from "@/lib/prisma";
import { Prisma, Product } from "@/generated/prisma/client";
import { genUniqueSlug } from "@/helpers/genUniqueSlug";

type Tx = Prisma.TransactionClient;

// Standard dictionaries to extract option matrix keys from product names
const COLOR_KEYWORDS = [
  "WHITE", "BLACK", "BLUE", "GREEN", "PURPLE", "GREY", "GOLD", "SB", "YE"
];
const PACKAGE_KEYWORDS = ["COMBO", "STANDARD"];
const MODEL_SIZE_KEYWORDS = ["MK2", "600BT", "400BT", "3S", "M2S", "M3", "Q4", "Q3", "4", "2"];

export interface ExtractedProductMeta {
  rawProduct: Product;
  brandName: string;
  baseGroupName: string;
  options: {
    color?: string;
    packageType?: string;
    modelSize?: string;
  };
}

export class ProductGroupGeneratorService {
  /**
   * Helper: Parse raw product name into components (Brand, Base Group, Variants)
   */
  private parseProductName(product: Product): ExtractedProductMeta {
    const nameUpper = product.name.toUpperCase().trim();
    const parts = nameUpper.split(/\s+/);
    const brandName = parts[0] || "GENERIC";

    // 1. Extract color option
    const matchedColor = COLOR_KEYWORDS.find((c) =>
      new RegExp(`\\b${c}\\b`, "i").test(nameUpper)
    );

    // 2. Extract package option
    const matchedPackage = PACKAGE_KEYWORDS.find((p) =>
      new RegExp(`\\b${p}\\b`, "i").test(nameUpper)
    );

    // 3. Extract model/size option
    const matchedModel = MODEL_SIZE_KEYWORDS.find((m) =>
      new RegExp(`\\b${m}\\b`, "i").test(nameUpper)
    );

    // 4. Derive Base Group Name by removing option tokens
    let baseGroupName = product.name;

    const tokensToRemove = [
      matchedColor,
      matchedPackage,
      matchedModel
    ].filter(Boolean) as string[];

    for (const token of tokensToRemove) {
      const regex = new RegExp(`\\b${token}\\b`, "gi");
      baseGroupName = baseGroupName.replace(regex, "");
    }

    // Clean up trailing dashes or spaces
    baseGroupName = baseGroupName.replace(/\s+/g, " ").trim();

    return {
      rawProduct: product,
      brandName,
      baseGroupName: baseGroupName || product.name,
      options: {
        color: matchedColor,
        packageType: matchedPackage,
        modelSize: matchedModel,
      },
    };
  }

  /**
   * Core Transaction Service: Group products and connect variants
   */
  async generateAndConnectGroups(productIds?: string[]) {
    return await prisma.$transaction(async (tx: Tx) => {
      // 1. Fetch products to process
      const products = await tx.product.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          ...(productIds && productIds.length > 0
            ? { inflowId: { in: productIds } }
            : {}),
        },
      });

      if (!products.length) {
        return { groupsCreated: 0, variantsConnected: 0 };
      }

      // 2. Parse metadata and cluster products by base group name
      const groupedMap = new Map<string, ExtractedProductMeta[]>();

      for (const product of products) {
        const meta = this.parseProductName(product);
        const key = `${meta.brandName}::${meta.baseGroupName}`.toUpperCase();

        if (!groupedMap.has(key)) {
          groupedMap.set(key, []);
        }
        groupedMap.get(key)!.push(meta);
      }

      let groupsCreated = 0;
      let variantsConnected = 0;

      // 3. Process each clustered group
      for (const [groupKey, metaList] of groupedMap.entries()) {
        const sampleMeta = metaList[0];
        const { brandName, baseGroupName } = sampleMeta;

        // Upsert Brand[cite: 1]
        let brandId: string | null = null;
        if (brandName && brandName !== "GENERIC") {
          const brand = await tx.brand.upsert({
            where: { name: brandName },
            create: { name: brandName },
            update: {},
          });
          brandId = brand.id;
        }

        // Generate Group Unique Key/ID and Slug
        const groupInflowId = `group-${crypto.randomUUID().toLowerCase()}`;
        const slug = await genUniqueSlug(baseGroupName, tx.productGroup);

        // Upsert Master ProductGroup
        const productGroup = await tx.productGroup.upsert({
          where: { inflowId: groupInflowId },
          create: {
            inflowId: groupInflowId,
            name: baseGroupName,
            slug,
            brandId,
            isActive: true,
          },
          update: {
            name: baseGroupName,
            brandId,
            isActive: true,
          },
        });

        groupsCreated++;

        // 4. Collect and create option matrix structures (Color, Package Type, Model/Size)[cite: 1]
        const optionTypeMap = new Map<
          string,
          {
            optionInflowId: string;
            attributeId: string;
            values: Map<string, { valueInflowId: string; attrValueId: string }>;
          }
        >();

        const optionKeys: Array<keyof ExtractedProductMeta["options"]> = [
          "color",
          "packageType",
          "modelSize",
        ];

        let lineNumCounter = 1;

        for (const optKey of optionKeys) {
          const uniqueValues = Array.from(
            new Set(
              metaList
                .map((m) => m.options[optKey])
                .filter((v): v is string => Boolean(v))
            )
          );

          if (uniqueValues.length === 0) continue;

          const optionName =
            optKey === "color"
              ? "Color"
              : optKey === "packageType"
              ? "Package Type"
              : "Model / Size";

          // Upsert Global Attribute[cite: 1]
          const attribute = await tx.attribute.upsert({
            where: { name: optionName },
            create: { name: optionName },
            update: {},
          });

          const groupOptionInflowId = `opt-${crypto.randomUUID().toLowerCase()}`;

          // Create ProductGroupOption relation[cite: 1]
          await tx.productGroupOption.upsert({
            where: { inflowId: groupOptionInflowId },
            create: {
              inflowId: groupOptionInflowId,
              productGroupId: productGroup.inflowId,
              attributeId: attribute.id,
              lineNum: lineNumCounter++,
            },
            update: {},
          });

          const valueMap = new Map<
            string,
            { valueInflowId: string; attrValueId: string }
          >();
          let valueLineNum = 1;

          for (const valStr of uniqueValues) {
            // Upsert AttributeValue[cite: 1]
            const attrValue = await tx.attributeValue.upsert({
              where: {
                attributeId_value: {
                  attributeId: attribute.id,
                  value: valStr,
                },
              },
              create: {
                attributeId: attribute.id,
                value: valStr,
              },
              update: {},
            });

            const optionValueInflowId = `optval-${crypto.randomUUID().toLowerCase()}`;

            // Create ProductGroupOptionValue relation[cite: 1]
            await tx.productGroupOptionValue.upsert({
              where: { inflowId: optionValueInflowId },
              create: {
                inflowId: optionValueInflowId,
                optionId: groupOptionInflowId,
                attributeValueId: attrValue.id,
                lineNum: valueLineNum++,
              },
              update: {},
            });

            valueMap.set(valStr, {
              valueInflowId: optionValueInflowId,
              attrValueId: attrValue.id,
            });
          }

          optionTypeMap.set(optKey, {
            optionInflowId: groupOptionInflowId,
            attributeId: attribute.id,
            values: valueMap,
          });
        }

        // 5. Connect each Product as a ProductVariant
        for (const meta of metaList) {
          const { rawProduct, options } = meta;
          const optionEntries: Array<{ optionId: string; valueId: string }> = [];

          for (const optKey of optionKeys) {
            const valStr = options[optKey];
            if (!valStr) continue;

            const groupOpt = optionTypeMap.get(optKey);
            if (!groupOpt) continue;

            const valData = groupOpt.values.get(valStr);
            if (!valData) continue;

            optionEntries.push({
              optionId: groupOpt.optionInflowId,
              valueId: valData.valueInflowId,
            });
          }

          // Build Signature format: "OptionID_1:ValueID_1|OptionID_2:ValueID_2" (Sorted alphabetically)[cite: 1]
          const signature =
            optionEntries.length > 0
              ? optionEntries
                  .map((e) => `${e.optionId}:${e.valueId}`)
                  .sort()
                  .join("|")
              : `standalone-${rawProduct.inflowId}`;

          const variantInflowId = `var-${crypto.randomUUID().toLowerCase()}`;

          // Upsert ProductVariant record linking Product to ProductGroup[cite: 1]
          const variant = await tx.productVariant.upsert({
            where: { productId: rawProduct.inflowId },
            create: {
              inflowId: variantInflowId,
              productGroupId: productGroup.inflowId,
              productId: rawProduct.inflowId,
              defaultPrice: new Prisma.Decimal("0.00"),
              isActive: true,
              signature,
              variantCount: optionEntries.length,
            },
            update: {
              productGroupId: productGroup.inflowId,
              signature,
              variantCount: optionEntries.length,
            },
          });

          // Create ProductVariantSelection multi-value entries[cite: 1]
          for (const entry of optionEntries) {
            await tx.productVariantSelection.upsert({
              where: {
                variantId_optionId: {
                  variantId: variant.inflowId,
                  optionId: entry.optionId,
                },
              },
              create: {
                variantId: variant.inflowId,
                optionId: entry.optionId,
                optionValueId: entry.valueId,
              },
              update: {
                optionValueId: entry.valueId,
              },
            });
          }

          variantsConnected++;
        }
      }

      return {
        groupsCreated,
        variantsConnected,
      };
    });
  }
}

export const productGroupGeneratorService = new ProductGroupGeneratorService();
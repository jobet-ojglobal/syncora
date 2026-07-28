// schemas/product.schema.ts
import { z } from "zod";

export const productSchema = z.object({
  inflowId: z.string().optional(),
  productGroupId: z.string().optional().nullable(),
  variantSignature: z.string().optional().nullable(),
  sku: z.string().min(1, "SKU reference identifier is required").max(100),
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().nullable().optional(),
  itemType: z.string().min(1, "Item type name is required"),
  brandId: z.string().nullable().optional().or(z.literal("")),
  categoryId: z.string().nullable().optional().or(z.literal("")),
  
  // ⚙️ Booleans Logistics Flags
  autoAssemble: z.boolean(),
  isActive: z.boolean(),
  isManufacturable: z.boolean(),
  includeQuantityBuildable: z.boolean(),
  trackExpiry: z.boolean(),
  trackLots: z.boolean(),
  trackSerials: z.boolean(),
  
  // ⏳ Lifespan Variables
  shelfLifeDays: z.number().int().min(0).nullable().optional(),
  sellBeforeExpiryDays: z.number().int().min(0).nullable().optional(),
  expiryNotificationDays: z.number().int().min(0).nullable().optional(),
  
  // 📐 Dimensions (Coerced Decimals)
  weight: z.number().min(0).nullable().optional(),
  width: z.number().min(0).nullable().optional(),
  height: z.number().min(0).nullable().optional(),
  length: z.number().min(0).nullable().optional(),
  
  // 🌍 Compliance Logistics
  originCountry: z.string().nullable().optional(),
  hsTariffNumber: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  standardUomName: z.string().min(1, "Base system UOM is required"),

  // 💰 Financial Costing & Pricing Elements
  initialCost: z.number("Base cost is required").min(0, "Cost basis cannot be negative"),
  prices: z.array(
    z.object({
      inflowId: z.string().optional(),
      pricingSchemeId: z.string().min(1, "Target execution pricing scheme is required"),
      priceType: z.enum(["FixedPrice", "FixedMarkup", "Dynamic", "Tiered"]),
      unitPrice: z.number("Unit price is required").min(0, "Base unit retail price cannot be negative"),
      fixedMarkup: z.number("fixed markup is required").min(0).optional(),
    })
  ).min(1, "At least one default pricing matrix line is required")
  .superRefine((val, ctx) => {
    const seen = new Set<string>();

    val.forEach((item, index) => {
      if (!item.pricingSchemeId) return;

      // Option A: Strict DB Match (Recommended)
      // Ensures a pricing scheme is only configured ONCE per product.
      const key = item.pricingSchemeId;

      // Option B: Unique Scheme + Type Pairs
      // Uncomment this line if your DB supports multiple price types per scheme:
      // const key = `${item.pricingSchemeId}-${item.priceType}`;

      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This pricing scheme is already assigned to this product.",
          path: [index, "pricingSchemeId"], // Targets the specific dropdown index in your FieldArray
        });
      } else {
        seen.add(key);
      }
    });
  }),

  // 📥 1:1 Purchasing UOM Object Relation
  purchasingUom: z.object({
    name: z.string().min(1, "Purchasing unit name is required (e.g. Box, Case)"),
    standardQuantity: z.number().min(0.0001, "Must be greater than 0"),
    uomQuantity: z.number().min(0.0001, "Must be greater than 0"),
  }).nullable().optional(),

  // 📤 1:1 Sales UOM Object Relation
  salesUom: z.object({
    name: z.string().min(1, "Sales unit name is required (e.g. Pack, Each)"),
    standardQuantity: z.number().min(0.0001, "Must be greater than 0"),
    uomQuantity: z.number().min(0.0001, "Must be greater than 0"),
  }).nullable().optional(),

  // 🏷️ 1:Many Nested Barcodes Array Matrix
  barcodes: z.array(
    z.object({
      id: z.string().optional(),
      barcode: z.string().min(1, "Barcode payload numeric sequence is required"),
    })
  ),

  // 🖼️ 1:Many Product Image Assets Array
  images: z.array(
    z.object({
      id: z.string().optional(),
      originalUrl: z.string().min(1, "Original image link is required").url("Must be valid asset media CDN source URL"),
      largeUrl: z.union([z.literal(""), z.string().url("Must be valid asset media CDN source URL")]).nullable().optional(),
      mediumUncroppedUrl: z.union([z.literal(""), z.string().url("Must be valid asset media CDN source URL")]).nullable().optional(),
      mediumUrl: z.union([z.literal(""), z.string().url("Must be valid asset media CDN source URL")]).nullable().optional(),
      smallUrl: z.union([z.literal(""), z.string().url("Must be valid asset media CDN source URL")]).nullable().optional(),
      thumbUrl: z.union([z.literal(""), z.string().url("Must be valid asset media CDN source URL")]).nullable().optional(),
    })
  ).min(1, "At least one product image is required"),
});

export type ProductInput = z.infer<typeof productSchema>;

// Simplified schema for form submission
export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  brandId: z.string().nullable().optional(),
  
  // Logistics Dimensions
  weight: z.coerce.number().positive("Weight must be positive").optional(),
  width: z.coerce.number().positive("Width must be positive").optional(),
  height: z.coerce.number().positive("Height must be positive").optional(),
  length: z.coerce.number().positive("Length must be positive").optional(),
  
  // Tracking & States
  isActive: z.boolean().default(true),
  trackExpiry: z.boolean().default(false),
  trackLots: z.boolean().default(false),
  trackSerials: z.boolean().default(false),
  
  // Variant Setup Meta-fields (Crucial for the architecture)
  productGroupId: z.string().min(1, "Assigning a Product Group is required to tie variants"),
  defaultPrice: z.coerce.number().min(0, "Price cannot be negative").default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

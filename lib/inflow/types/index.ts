
// =====================================
// Root
// =====================================

export interface InflowProductGroupResponse {
  productGroupId: string;
  categoryId: string;
  defaultImageId: string | null;
  defaultProductId: string | null;
  isActive: boolean;
  name: string;
  timestamp: string;

  category: InflowCategory | null;

  images: InflowProductGroupImage[];

  options: InflowProductGroupOption[];

  productVariants: InflowProductVariant[];
}

// =====================================
// Category
// =====================================

export interface InflowCategory {
  categoryId: string;
  isDefault: boolean;
  name: string;
  parentCategoryId: string | null;
  timestamp: string;
}

// =====================================
// Product Group Images
// =====================================

export interface InflowProductGroupImage {
  productGroupImageId: string;
  image: InflowProductImage
}

// =====================================
// Variant Options
// =====================================

export type VariantOptionMap = {
  [productGroupOptionId: string]: string; // productGroupOptionValueId
};

export interface InflowProductGroupOption {
  productGroupOptionId: string;
  lineNum: number;
  name: string;

  optionValues: InflowProductGroupOptionValue[];
}

export interface InflowProductGroupOptionValue {
  productGroupOptionValueId: string;
  lineNum: number;
  value: string;
}

// =====================================
// Product Variant
// =====================================

export interface InflowProductVariant {
  productVariantId: string;
  defaultPrice: string;

  productGroupId: string;
  productId: string;

  /**
   * Key = productGroupOptionId
   * Value = productGroupOptionValueId
   *
   * Example:
   * {
   *   "configuration-option-id":
   *   "body-only-value-id"
   * }
   */
  // variantOption: Record<string, string>;
  variantOption: VariantOptionMap;

  product: InflowProduct;

  productGroup?: InflowProductGroupResponse
}

// =====================================
// Product
// =====================================

export interface InflowProduct {
  productId: string;

  sku: string | null;
  name: string;
  description: string | null;

  itemType: string;

  autoAssemble: boolean;
  isActive: boolean;
  isManufacturable: boolean;
  includeQuantityBuildable: boolean;

  standardUomName: string | null;

  trackExpiry: boolean;
  trackLots: boolean;
  trackSerials: boolean;

  shelfLifeDays: number | null;
  sellBeforeExpiryDays: number | null;
  expiryNotificationDays: number | null;

  weight: string | null;
  width: string | null;
  height: string | null;
  length: string | null;

  originCountry: string | null;
  hsTariffNumber: string | null;
  remarks: string | null;

  categoryId: string;

  lastVendorId: string | null;
  lastModifiedById: string | null;

  createdDttm: string;
  lastModifiedDateTime: string;

  timestamp: string;

  purchasingUom: InflowPurchasingUom | null;

  salesUom: InflowSalesUom | null;

  customFields: InflowCustomFields;

  images: InflowProductImage[];

  cost?: InflowProductCost;
  defaultPrice?: InflowProductPrice;

  inventoryLines: InflowInventoryLine[];

  productVariant: InflowProductVariant
}

// =====================================
// Inventory Line
// =====================================

export interface InflowInventoryLine {
  inventoryLineId: string;
  locationId: string;
  lotId: string | null;
  productId: string;
  quantityOnHand: string;
  serial: string;
  sublocation: string;
  timestamp: string;

  location: InflowLocation
}

// =====================================
// Product Cost
// =====================================

export interface InflowProductCost {
  productCostId: string;
  cost: string;
  productId: string;
}

// =====================================
// Product Price
// =====================================

export interface InflowProductPrice {
  productPriceId: string;
  priceType: string;
  pricingSchemeId: string;
  productId: string;
  timestamp: string;
  unitPrice: string;
}


// =====================================
// Custom Fields
// =====================================

export interface InflowCustomFields {
  custom1: string; // Brand
  custom2: string; // Features
  custom3: string; // Tags
  custom4: string;
  custom5: string;
  custom6: string;
  custom7: string;
  custom8: string;
  custom9: string;
  custom10: string;
}

// =====================================
// UOM
// =====================================

export interface InflowPurchasingUom {
  name: string;
  conversionRatio: InflowConversionRatio;
}

export interface InflowSalesUom {
  name: string;
  conversionRatio: InflowConversionRatio;
}

export interface InflowConversionRatio {
  standardQuantity: string;
  uomQuantity: string;
}

// =====================================
// Product Images
// =====================================

export interface InflowProductImage {
  imageId: string;

  largeUrl: string | null;
  mediumUncroppedUrl: string | null;
  mediumUrl: string | null;
  originalUrl: string | null;
  smallUrl: string | null;
  thumbUrl: string | null;
}

// =====================================
// Location Address
// =====================================

export interface InflowLocationAddress {
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  remarks: string;
  addressType: string | null;
}

// =====================================
// Location 
// =====================================

export interface InflowLocation {
  locationId: string;
  address: InflowLocationAddress;

  isActive: boolean;
  isDefault: boolean;
  name: string;

  timestamp: string;
}

// =====================================
// Sublocations
// =====================================


export interface InflowSuggestedSublocations {
  id: string;
  sublocations: string[];
  type: "suggested-sublocations";
}

// =====================================
// Sublocations Inventory
// =====================================

export interface InflowProductLocationSublocation {
  id: string;
  quantity: string;
  sublocation: string;
}


// ======= INFLOW INTEGRATIONS 

// import { 
//   Prisma,
// } from "@/generated/prisma/client";

// // 1. Move the literal array here
// export const INFLOW_EVENTS = [
//   "product.created",
//   "product.updated",
//   "stock.adjusted"
// ] as const;

// // 2. Define the type here
// export type InflowEvent = typeof INFLOW_EVENTS[number];

// export type WebhookProvider = "inflow";

// export interface WebhookSubscription {
//   id: string;
//   provider: WebhookProvider;
//   remoteId: string | null;
//   url: string;
//   event: string;
//   active: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface InflowWebhook {
//   webHookSubscriptionId: string;
//   url: string;
//   events: string[];
//   secret?: string;
//   consecutiveFailureCount: number;
//   isDisabled: boolean;
//   lastFailureMessage?: string;
// }

// export type InflowWebhookEventType =
//   | "customer.created"
//   | "customer.updated"
//   | "vendor.created"
//   | "vendor.updated"
//   | "purchaseOrder.created"
//   | "purchaseOrder.updated"
//   | "salesOrder.created"
//   | "salesOrder.updated"
//   | "product.created"
//   | "product.updated";

// export interface InflowWebhook {
//   id: string;
//   url: string;
//   secret: string | null;
//   events: Prisma.JsonValue;
//   isDisabled: boolean;
//   consecutiveFailureCount: number;
//   lastFailureMessage: string | null;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface InflowIntegration {
//   id: string;
//   webhookId: string | null;
//   webhookUrl: string | null;
//   secret: string | null;
//   isConnected: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface WebhookEvent {
//   id: string;
//   provider: string;
//   eventType: string;
//   payload: Prisma.JsonValue;
//   processed: boolean;
//   receivedAt: Date;
// }

// export interface InflowWebhookEvent {
//   id: string;
//   eventType: string;
//   payload: Prisma.JsonValue;
//   processed: boolean;
//   receivedAt: Date;
// }

// export interface CreateInflowWebhookDto {
//   url: string;
//   secret?: string;
//   events: string[];
// }

// export interface UpdateInflowWebhookDto {
//   url?: string;
//   secret?: string;
//   events?: string[];
//   isDisabled?: boolean;
// }

// export interface ReceiveInflowWebhookDto {
//   eventType: string;
//   payload: Prisma.JsonValue;
// }

// export type CreateInflowWebhookInput =
//   Prisma.InflowWebhookCreateInput;



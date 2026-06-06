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
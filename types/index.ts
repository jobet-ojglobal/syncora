// ======================
// Core
// ======================

export interface SyncJob {
  id: string;
  source: string;
  status: string;
  progress: number;
  data?: unknown;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ======================
// Category
// ======================

export interface Category {
  id: string;
  inflowCategoryId: string;
  name: string;
  isDefault: boolean;
  timestamp?: string | null;

  parentId?: string | null;

  parent?: Category | null;
  children?: Category[];

  productGroups?: ProductGroup[];

  createdAt: Date;
  updatedAt: Date;
}

// ======================
// Product Group
// ======================

export interface ProductGroup {
  id: string;
  inflowProdGroupId: string;
  name: string;
  categoryId?: string | null;
  defaultProductId?: string | null;
  defaultImageId?: string | null;
  isActive: boolean;
  timestamp?: string | null;

  category?: Category | null;
  variants?: ProductVariant[];
  images?: ProductImage[];
  options?: ProductGroupOption[];

  createdAt: Date;
  updatedAt: Date;
}

// ======================
// Product Variant
// ======================

export interface ProductVariant {
  id: string;
  inflowVariantId: string;
  productGroupId: string;
  productId: string;

  defaultPrice: string;

  group?: ProductGroup;
  product?: Product;

  selections?: ProductVariantSelection[];

  createdAt: Date;
  updatedAt: Date;
}

// ======================
// Product
// ======================

export interface Product {
  id: string;
  inflowProductId: string;

  sku?: string | null;
  name: string;
  description?: string | null;

  itemType?: string | null;

  autoAssemble: boolean;
  isActive: boolean;
  isManufacturable: boolean;
  includeQuantityBuildable: boolean;

  standardUomName?: string | null;

  trackExpiry: boolean;
  trackLots: boolean;
  trackSerials: boolean;

  shelfLifeDays?: number | null;
  sellBeforeExpiryDays?: number | null;
  expiryNotificationDays?: number | null;

  weight?: string | null;
  width?: string | null;
  height?: string | null;
  length?: string | null;

  originCountry?: string | null;
  hsTariffNumber?: string | null;
  remarks?: string | null;

  lastVendorId?: string | null;
  lastModifiedById?: string | null;

  createdDttm?: Date | null;
  lastModifiedDateTime?: Date | null;

  timestamp?: string | null;

  purchasingUom?: ProductUom | null;
  salesUom?: ProductSalesUom | null;

  variant?: ProductVariant[];
  images?: ProductImage[];

  brandId?: string | null;
  brand?: Brand | null;

  features?: ProductFeature[];
  tags?: ProductTag[];

  createdAt: Date;
  updatedAt: Date;
}

// ======================
// UOM
// ======================

export interface ProductUom {
  id: string;
  productId: string;

  name: string;

  standardQuantity: string;
  uomQuantity: string;

  product?: Product;
}

export interface ProductSalesUom {
  id: string;
  productId: string;

  name: string;

  standardQuantity: string;
  uomQuantity: string;

  product?: Product;
}

// ======================
// Images
// ======================

export interface ProductImage {
  id: string;
  inflowProdImageId: string;

  groupId?: string | null;
  productId?: string | null;

  position: number;

  largeUrl?: string | null;
  mediumUncroppedUrl?: string | null;
  mediumUrl?: string | null;
  originalUrl?: string | null;
  smallUrl?: string | null;
  thumbUrl?: string | null;

  group?: ProductGroup | null;
  product?: Product | null;
}

// ======================
// Brand / Feature / Tag
// ======================

export interface Brand {
  id: string;
  name: string;

  products?: Product[];

  createdAt: Date;
  updatedAt: Date;
}

export interface Feature {
  id: string;
  name: string;

  products?: ProductFeature[];

  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;

  products?: ProductTag[];

  createdAt: Date;
  updatedAt: Date;
}

// ======================
// Junction Tables
// ======================

export interface ProductFeature {
  productId: string;
  featureId: string;

  product?: Product;
  feature?: Feature;
}

export interface ProductTag {
  productId: string;
  tagId: string;

  product?: Product;
  tag?: Tag;
}

// ======================
// Variant Options
// ======================

export interface ProductGroupOption {
  id: string;
  inflowId: string;

  productGroupId: string;

  lineNum: number;
  name: string;

  productGroup?: ProductGroup;

  values?: ProductGroupOptionValue[];
  variantSelections?: ProductVariantSelection[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ProductGroupOptionValue {
  id: string;
  inflowId: string;

  optionId: string;

  lineNum: number;
  value: string;

  option?: ProductGroupOption;

  variantSelections?: ProductVariantSelection[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantSelection {
  id: string;

  variantId: string;
  optionId: string;
  optionValueId: string;

  variant?: ProductVariant;
  option?: ProductGroupOption;
  optionValue?: ProductGroupOptionValue;

  createdAt: Date;
}
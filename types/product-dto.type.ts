import { BrandDto } from "./brand-dto.type";
import { CategoryDto } from "./category-dto.type";
import { FeatureDto } from "./feature-dto.type";
import { TagDto } from "./tag-dto.type";


export interface ProductGroupDto {
  id: string;
  inflowProdGroupId: string;
  name: string;
  categoryId?: string | null;
  defaultProductId?: string | null;
  defaultImageId?: string | null;
  isActive: boolean;
  timestamp?: string | null;
  category?: CategoryDto | null;
  variants?: ProductVariantDto[];
  images?: ProductImageDto[];
  options?: ProductGroupOptionDto[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantDto {
  id: string;
  inflowVariantId: string;
  productGroupId: string;
  productId: string;
  defaultPrice: number;
  product?: ProductDto;
  selections?: ProductVariantSelectionDto[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDto {
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
  weight?: number | null;
  width?: number | null;
  height?: number | null;
  length?: number | null;
  originCountry?: string | null;
  hsTariffNumber?: string | null;
  remarks?: string | null;
  lastVendorId?: string | null;
  lastModifiedById?: string | null;
  createdDttm?: Date | null;
  lastModifiedDateTime?: Date | null;
  timestamp?: string | null;
  purchasingUom?: ProductUomDto | null;
  salesUom?: ProductSalesUomDto | null;
  variant?: ProductVariantDto | null;
  images?: ProductImageDto[];
  brand?: BrandDto | null;
  features?: FeatureDto[];
  tags?: TagDto[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ProductUomDto {
  id: string;
  productId: string;
  name: string;
  standardQuantity: number;

  uomQuantity: number;
}

export interface ProductSalesUomDto {
  id: string;
  productId: string;
  name: string;
  standardQuantity: number;
  uomQuantity: number;
}

export interface ProductImageDto {
  id: string;
  inflowImageId: string;
  groupId?: string | null;
  productId?: string | null;
  position: number;
  largeUrl?: string | null;
  mediumUncroppedUrl?: string | null;
  mediumUrl?: string | null;
  originalUrl?: string | null;
  smallUrl?: string | null;
  thumbUrl?: string | null;
}


export interface ProductGroupOptionDto {
  id: string;
  inflowId: string;
  productGroupId: string;
  lineNum: number;
  name: string;
  values?: ProductGroupOptionValueDto[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductGroupOptionValueDto {
  id: string;
  inflowId: string;
  optionId: string;
  lineNum: number;
  value: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantSelectionDto {
  id: string;
  variantId: string;
  optionId: string;
  optionValueId: string;
  option?: ProductGroupOptionDto;
  optionValue?: ProductGroupOptionValueDto;

  createdAt: Date;
}

// =================== PRODUCT CARD (FRONTEND) ===================

export interface ProductCardDto {
  inflowProductId: string;
  sku?: string | null;
  name: string;
  brand?: string | null;
  price?: number | null;
  image?: string | null;
  category?: string | null;
  isActive: boolean;
}

export interface ProductSearchResult {
  id: string;
  inflowProductId: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  brand?: string | null;
  image?: string | null;
  active: boolean;
}

export interface ProductBarcodeDto {
  id: string;
  inflowProductBarcodeId: string;
  productId: string;
  barcode: string;
  lineNum: number;
  timestamp?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
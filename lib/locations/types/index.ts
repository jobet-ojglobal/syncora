// lib/locations/types/product-sync.types.ts

export interface LocalProductSerial {
  serialId: string;
  productId: string;
  serialNumber: string;
}

export interface LocalProductPrice {
  productPriceId: number;
  priceType: string;
  pricingSchemeId: number;
  productId: number;
  unitPrice: number;
  fixedMarkup?: number | null;
}

export interface LocalSalesUom {
  soUomName: string;
  soUomRatioStd: string;
  soUomRatio: string;
}

export interface LocalPurchasingUom {
  poUomName: string;
  poUomRatioStd: string;
  poUomRatio: string;
}

export interface LocalProductCost {
  productCostId: string;
  productId: string;
  cost: number;
}

export interface LocalCustomFields {
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  custom5?: string;
  custom6?: string;
  custom7?: string;
  custom8?: string;
  custom9?: string;
  custom10?: string;
}

export interface LocalProduct {
  productId: string;
  categoryId?: string | null;
  itemType: number; // 1 -> StockedProduct, etc.
  isActive: number; // 1 or 0
  isManufacturable: boolean;
  isSellable: number;
  isPurchaseable: number;
  autoAssemble: boolean;
  name: string;
  description?: string | null;
  remarks?: string | null;
  barcode?: string | null;
  customFields?: LocalCustomFields;
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
  weight?: string | number | null;
  defaultLocationId?: number | null;
  defaultSublocationId?: string | number | null;
  reorderPoint?: string | null;
  reorderQuantity?: string | null;
  originCountry?: string | null;
  hsTariffNumber?: string | null;
  includeQuantityBuildable: boolean;
  lastVendorId?: number | null;
  lastModifiedById?: number | null;
  lastModifiedDateTime?: string | null;
  standardUomName?: string | null;
  salesUom?: LocalSalesUom;
  purchasingUom?: LocalPurchasingUom;
  taxingSchemeId?: number | null;
  pictureFileAttachmentId?: number | null;
  trackExpiry?: boolean;
  trackLots?: boolean;
  trackSerials?: boolean | number;
  expiryNotificationDays?: number | null;
  sellBeforeExpiryDays?: number | null;
  shelfLifeDays?: number | null;
  itemBoms?: any[];
  attachments?: any[];
  prices?: LocalProductPrice[];
  serials?: LocalProductSerial[];
  cost: string | null;
  inventoryLines?: LocalInventoryLine[];
}

export interface LocalInventoryLine {
  locationId: string | null;
  lotId: string | null;
  productId: string;
  quantityOnHand: number;
  serial: boolean;
  sublocation: string | null;
}

export interface LocalLocation {
  locationId: string;
  name: string;
  isActive: number;
  lastModUserId: string;
  lastModDttm: string;
  timestamp: string;
}

export type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};
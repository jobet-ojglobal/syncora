export interface FormattedInventoryProduct {
  inflowId: string | null;
  name: string;
  sku: string;
  slug: string;
  thumbnail: string | null;
  trackSerials: boolean;
}

export interface FormattedInventoryBin {
  id: string;
  sublocationName: string;
  quantity: number;
}

export interface FormattedInventoryItem {
  id: string;
  product: FormattedInventoryProduct;
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityInTransit: number;
  isAutoReorderEnabled: boolean;
  reorderThreshold: number;
  reorderQuantity: number;
  preferredSourceLocationId: string | null;
  bins: FormattedInventoryBin[];
}

export type FormattedInventoryList = FormattedInventoryItem[];
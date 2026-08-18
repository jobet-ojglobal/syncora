// ==========================================
// Location
// ==========================================

import { Product } from "./product.type";

export interface Location {
  id: string;
  inflowId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  timestamp: string | null;

  createdAt: Date;
  updatedAt: Date;
}



export interface LocationAddress {
  id: string;
  locationId: string;

  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  remarks: string | null;
  addressType: string | null;
}

export interface LocationWithRelations extends Location {
  address?: LocationAddress | null;
  sublocations?: Sublocation[];
  inventories?: Inventory[];
}

// ==========================================
// Sublocation
// ==========================================

export interface Sublocation {
  id: string;
  locationId: string;
  name: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface SublocationWithRelations extends Sublocation {
  location?: Location;
  inventoryBins?: InventoryBin[];
}

// ==========================================
// Inventory
// ==========================================

export interface Inventory {
  id: string;

  productId: string;
  locationId: string;

  quantityOnHand: string;
  quantityAvailable: string | null;
  quantityReserved: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryWithRelations extends Inventory {
  product?: Product;
  location?: Location;
  bins?: InventoryBin[];
}

// ==========================================
// Inventory Bin
// ==========================================

export interface InventoryBin {
  id: string;

  inventoryId: string;
  productId: string;
  sublocationId: string;

  quantity: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryBinWithRelations extends InventoryBin {
  inventory?: Inventory;
  product?: Product;
  sublocation?: Sublocation;
}

export interface LocationTableRow {
  id: string;
  inflowId: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;

  sublocationCount: number;
  inventoryCount: number;

  isActive: boolean;
  isDefault: boolean;
}

export interface InventoryTableRow {
  id: string;

  sku: string;
  productName: string;

  locationName: string;

  quantityOnHand: string;
  quantityAvailable: string;
  quantityReserved: string;

  binCount: number;
}

export interface InventoryBinTableRow {
  id: string;

  productName: string;
  locationName: string;
  sublocationName: string;

  quantity: string;
}

export interface BasicLocationResponse {
  id: string;
  inflowId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  formattedAddress: string | null;
  sublocationsCount: number;
  inventoryItemsCount: number;
  teamMembersCount: number;
  totalSalesOrdersCount: number;
  activeSalesOrdersCount: number;
  address: {
    id: string;
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  } | null;
  sublocationsList: Array<{
    id: string;
    name: string;
  }>;
  mappings: {
    taxingSchemesCount: number;
    currenciesCount: number;
    paymentTermsCount: number;
    costAdjustmentsCount: number;
    barcodesCount: number;
    categoriesCount: number;
    pricingSchemesCount: number;
    customerBalancesCount: number;
    vendorCreditsCount: number;
    
    locationsCount: number;
    customersCount: number;
    vendorsCount: number;
    productsCount: number;
  };
}
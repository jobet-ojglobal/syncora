import { LocationClient } from "../location-client.limit";
import { BranchClient } from "../location.client";

export interface InflowProduct {
  productId: string;
  itemType: number;  // stockedProduct, nonstockedProduct, service
  name: string;
  description: string;
  remarks: string;
  barcode: string;
  categoryId: string;
  defaultLocationId: string | null;
  defaultSublocation: string | null;

  reorderPoint: number;
  reorderQuantity: number;

  uom: string;
  masterPackQty: number;
  innerPackQty: number;

  dimensions: {
    caseLength: number,
    caseWidth: number,
    caseHeight: number,
    caseWeight: number,
    productLength: number,
    productWidth: number,
    productHeight: number,
    productWeight: number
  }

  customFields: InflowCustomFields;

  productImageId?: string | null;
  
  isSellable: boolean;
  isPurchaseable: boolean;
  isActive: boolean;
  trackSerials: boolean,

  dateIntroduced: string;
  dateUpdated: string | null;

  lastModifiedById: string | null;
  lastModifiedDttm: string | null;

  pictureFileAttachmentId: string | null;

  salesUom: {
    name: string;
    ratioStd: number;
    ratio: number;
  };

  purchaseUom: {
    name: string;
    ratioStd: number;
    ratio: number;
  }
}

//  productBarcodes?: InflowProductBarcode[];
//   taxCodes?: InflowProductTaxCode[];
//   prices?: InflowProductPrice[];
//   cost?: InflowProductCost | null;
//   itemBoms?: InflowItemBom[];
//   attachments?: InflowProductAttachment[];
  
  /**
   * Nested Include Array Interfaces
   */
  export interface InflowProductBarcode {
    productBarcodeId: string;
    barcode: string;
    lineNum: number | string; // Handled as number or string from variations
    productId: string;
    timestamp: string;
    product?: InflowProduct;
  }
  
  export interface InflowProductTaxCode {
    productTaxCodeId: string;
    productId: string;
    taxCodeId: string;
    taxingSchemeId: string;
    timestamp: string;
    product?: InflowProduct;
    taxCode?: InflowTaxCode;
    taxingScheme?: InflowTaxingScheme;
  }

  export interface InflowOperationType {
    operationTypeId: string;
    name: string;
    estimatedPerHourCost: string;
    isActive: boolean;
    isDefault: boolean;
    timestamp: string;
    trackTime: boolean;
  }
  
  export interface InflowProductOperation {
    productOperationId: string;
    productId: string;
    operationTypeId: string;
    cost: string;
    estimatedPerHourCost: string;
    estimatedSeconds: string;
    instructions: string | null;
    lineNum: number | string;
    timestamp: string;
    trackTime: boolean;
    operationType?: InflowOperationType;
    product?: InflowProduct;
  }
  
  export interface InflowProductPrice {
    productPriceId: string;
    productId: string;
    pricingSchemeId: string;
    priceType: "fixedPrice" | "FixedPrice" | string;
    fixedMarkup?: string | null;
    unitPrice: string;
    timestamp: string;
    pricingScheme?: InflowPricingScheme;
    product?: InflowProduct;
  }
  
  export interface InflowProductCost {
    productCostId: string;
    productId: string;
    cost: string;
    product?: InflowProduct;
  }
  
  export interface InflowBomQuantity {
    standardQuantity: string;
    uomQuantity: string;
    uom: string | null;
    serialNumbers?: string[];
  }
  
  export interface InflowItemBom {
    itemBomId: string;
    productId: string;
    childProductId: string;
    quantity: InflowBomQuantity;
    timestamp: string;
    childProduct?: InflowProduct;
    product?: InflowProduct;
  }
  
  export interface InflowProductAttachment {
    attachmentId: string;
    attachmentUrl: string;
    fileName: string;
    fileSize: any; // Object or number variations across payloads
    lastModDttm: string;
    lastModifiedById: string;
    lastModifiedBy?: InflowTeamMember;
  }

  
//  TEAM MEMBERS

export interface InflowTeamMember {
  teamMemberId: string;
  accessAllLocations: boolean;
  accessLocationIds: string[];
  accessRights: AccessRight[];
  canBeSalesRep: boolean;
  email: string;
  isActive: boolean;
  name: string;
}

export type AccessRight =
  | "SalesOrderView"
  | "SalesOrderEdit"
  | "SalesOrderPick"
  | "SalesOrderPrioritization"
  | "CustomerView"
  | "CustomerEdit"
  | "SalesPriceEdit"
  | "PurchaseOrderView"
  | "PurchaseOrderEdit"
  | "PurchaseOrderReceive"
  | "VendorView"
  | "VendorEdit"
  | "ReorderStock"
  | "CountSheetView"
  | "CountSheetEdit"
  | "CountSheetOnly"
  | "TransferStockView"
  | "TransferStockEdit"
  | "AdjustStockView"
  | "AdjustStockEdit"
  | "CurrentStockView"
  | "MovementHistoryView"
  | "ProductView"
  | "ProductEdit"
  | "ProductCostingView"
  | "ProductCostingEdit"
  | "ProductCategoryEdit"
  | "ManufacturingOrderView"
  | "ManufacturingOrderEdit"
  | "ManufacturingOrderPrioritization"
  | "StockroomScanView"
  | "StockroomScanEdit"
  | "EstimatedLaborHoursView"
  | "EstimatedLaborHoursEdit"
  | "ActualLaborHoursView"
  | "ActualLaborHoursEdit"
  | "CurrentOperationsView"
  | "CurrentOperationsEdit"
  | "SettingsView"
  | "SettingsEdit"
  | "ImportData"
  | "ExportData"
  | "BackupData"
  | "PrintSettingsView"
  | "PrintSettingsEdit"
  | "ResetAllData"
  | "Integrations"
  | "Reports";

// TAXING CODES

export interface InflowTaxCode {
  taxCodeId: string;
  taxingSchemeId: string;
  name: string;
  isActive: boolean;
  tax1Rate: string;
  tax2Rate: string;
  timestamp: string;
}


export interface InflowTaxingScheme {
  taxingSchemeId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  calculateTax2OnTax1: boolean;
  tax1Name: string | null;
  tax1OnShipping: boolean;
  tax2Name: string | null;
  tax2OnShipping: boolean;
  defaultTaxCodeId: string | null;
  timestamp: string;
  defaultTaxCode?: InflowTaxCode;
  taxCodes?: InflowTaxCode[];
}


export interface InflowCurrency {
  currencyId: string;
  decimalPlaces: number;
  decimalSeparator: string;
  isoCode: string;
  isSymbolFirst: boolean;
  name: string;
  negativeType: string;
  symbol: string;
  thousandsSeparator: string;
  timestamp: string;
}

//  ADJUSTMENT REASON

export interface InflowAdjustmentReason {
  adjustmentReasonId: string;
  isActive: boolean;
  isInternal: boolean;
  name: string;
}

// PRICING SCHEMES

export interface InflowPricingScheme {
  pricingSchemeId: string;
  currencyId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  isTaxInclusive: boolean;
  timestamp: string;
  currency?: InflowCurrency;
  productPrices?: InflowProductPrice[];
}

interface InflowCustomFields {
  custom1?: string; // Brand
  custom2?: string; // Features
  custom3?: string; // Tags
  custom4?: string;
  custom5?: string;
  custom6?: string;
  custom7?: string;
  custom8?: string;
  custom9?: string;
  custom10?: string;
}

export async function getProducts(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowProduct[]>(
    `/inflow-local/products`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertProduct(
  payload: InflowProduct,
  url: string
) {
  const apiClient = new LocationClient(url)
  return await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "productLocal",
        "transactionType": "PRODUCT",
        "batch_id": `PRDCT-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.productId,
        "payload": payload 
      }
  );
}

export async function upsertProductImage(
  payload: InflowProduct,
  url: string
) {
  const apiClient = new LocationClient(url)
  return await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "imageLocal",
        "transactionType": "IMAGE",
        "batch_id": `IMAGE-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.productImageId,
        "payload": payload 
      }
  );
}

// {
//   "productId": "100",
//   "version": 3,
//   "itemType": 1,
//   "name": "1 SPOT MC5",
//   "description": "Truetone 1 Spot Pedalboard Multi-Plug Daisy Chain with 5 Multiple Plugs Cable",
//   "remarks": "",
//   "barcode": "694336000102",

//   "categoryId": "101",

//   "defaultLocationId": null,
//   "defaultSublocation": "",

//   "reorderPoint": "1.0000",
//   "reorderQuantity": "1.0000",

//   "uom": "",
//   "masterPackQty": null,
//   "innerPackQty": null,

//   
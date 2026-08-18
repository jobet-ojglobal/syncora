
// =====================================
// Root
// =====================================

export interface InflowProductGroup {
  productGroupId: string;
  categoryId: string | null;
  defaultImageId: string | null;
  defaultProductId: string | null;
  isActive: boolean;
  name: string;
  timestamp?: string;

  category?: InflowCategory;
  images?: InflowProductGroupImage[];
  options?: InflowProductGroupOption[];
  productVariants?: InflowProductVariant[];
  defaultImage?: InflowProductImage;
  defaultProduct?: InflowProduct;
}

// =====================================
// Category
// =====================================

export interface InflowCategory {
  categoryId: string;
  isDefault: boolean;
  name: string;
  parentCategoryId: string | null;
  parentCategory?: InflowCategory;
  timestamp?: string;
}

// =====================================
// Product Group Images
// =====================================

export interface InflowProductGroupImage {
  imageId: string;
  productGroupId: string;
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

  productGroup?: InflowProductGroup
}

// =====================================
// Product
// =====================================

export interface InflowProduct {
  productId: string;
  sku: string;
  name: string;
  description: string | null;
  itemType: "stockedProduct" | "serializedProduct" | "service" | string;
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
  categoryId: string | null;
  lastVendorId: string | null;
  lastModifiedById: string | null;
  lastModifiedDateTime: string;
  
  purchasingUom: InflowPurchasingUom | null;
  salesUom: InflowSalesUom | null;
  customFields: InflowCustomFields;


  images?: InflowProductImage[];
  defaultImage?: InflowDefaultImage;
  defaultPrice?: InflowProductPrice;
  inventoryLines?: InflowInventoryLine[];
  productVariant?: InflowProductVariant;
  category?: InflowCategory;
  productBarcodes?: InflowProductBarcode[];
  taxCodes?: InflowProductTaxCode[];
  reorderSettings?: InflowReorderSetting[];
  productOperations?: InflowProductOperation[];
  prices?: InflowProductPrice[];
  cost?: InflowProductCost;
  itemBoms?: InflowItemBom[];
  attachments?: InflowProductAttachment[];
  lastVendor?: InflowVendor;
  lastModifiedBy?: InflowTeamMember;

  createdDttm: string;
  timestamp?: string;
}

export interface InflowDefaultImage {
  imageId: string;
  largeUrl: string,
  mediumUncroppedUrl: string,
  mediumUrl: string,
  originalUrl: string,
  smallUrl: string,
  thumbUrl: string
}

/**
 * Nested Include Array Interfaces
 */
export interface InflowProductBarcode {
  productBarcodeId: string;
  barcode: string;
  lineNum: number | string; // Handled as number or string from variations
  productId: string;
  timestamp?: string;
  product?: InflowProduct;
}

export interface InflowProductTaxCode {
  productTaxCodeId: string;
  productId: string;
  taxCodeId: string;
  taxingSchemeId: string;
  timestamp?: string;
  product?: InflowProduct;
  taxCode?: InflowTaxCode;
  taxingScheme?: InflowTaxingScheme;
}

export interface InflowReorderSetting {
  reorderSettingsId: string;
  productId: string;
  locationId: string;
  defaultSublocation: string | null;
  enableReordering: boolean;
  fromLocationId: string | null;
  reorderMethod: "purchaseOrder" | "PurchaseOrder" | string;
  reorderPoint: string;
  reorderQuantity: string;
  timestamp?: string;
  vendorId: string | null;
  fromLocation?: InflowLocation;
  location?: InflowLocation;
  product?: any;
  vendor?: InflowVendor;
}

export interface InflowOperationType {
  operationTypeId: string;
  name: string;
  estimatedPerHourCost: string;
  isActive: boolean;
  isDefault: boolean;
  timestamp?: string;
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
  timestamp?: string;
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
  timestamp?: string;
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
  timestamp?: string;
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

// =====================================
// Inventory Line
// =====================================

export interface InflowInventoryLine {
  inventoryLineId: string;
  lotId: string | null;
  locationId: string;
  productId: string;
  quantityOnHand: string;
  serial: string;
  sublocation: string; // ex. "Rack A" or "" if floor stock
  timestamp?: string;
  location?: InflowLocation;
  lot?: inflowLot;
}

export interface inflowLot {
  lotId: string;
  lotNumber: string;
  productId: string;
  customFields: InflowCustomFields;
  manufactureDate: string | null;
  sellByDate: string | null;
  createdDate: string;
}

// =====================================
// Product Cost
// =====================================

// export interface InflowProductCost {
//   productCostId: string;
//   cost: string;
//   productId: string;
// }

// =====================================
// Product Price
// =====================================

// export interface InflowProductPrice {
//   productPriceId: string;
//   priceType: string;
//   pricingSchemeId: string;
//   productId: string;
//   timestamp: string;
//   unitPrice: string;
// }

// export interface InflowProductPrice {
//   productPriceId: string;
//   pricingSchemeId: string;
//   productId: string;
//   priceType: ProductPriceType;
//   unitPrice?: string;
//   fixedMarkup?: string;
//   timestamp: string;

//   product?: InflowProduct
// }

// =====================================
// Product Summary
// =====================================

export interface InflowProductSummary {
  productId: string;
  locationId: string;
  imageSmallUrl: string | null;
  quantityOnHand: number;
  quantityOnOrder: number;
  quantityOnPurchaseOrder: number;
  quantityOnWorkOrder: number;
  quantityOnTransferOrder: number;
  quantityReserved: number;
  quantityReservedForSales: number;
  quantityReservedForManufacturing: number;
  quantityReservedForTransfers: number;
  quantityReservedForBuilds: number;
  quantityAvailable: number;
  rawQuantityAvailable: number;
  quantityPicked: number;
  quantityInTransit: number;
  quantityBuildable: number;
  quantityExpiring: number;
  quantityAnticipated: number;
}


// =====================================
// Custom Fields
// =====================================

export interface InflowCustomFields {
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

  timestamp?: string | null;
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


//  TEAM MEMBERS

export interface InflowTeamMember {
  teamMemberId: string;
  accessAllLocations: boolean;
  accessLocationIds: string[];
  accessRights: AccessRight[];
  canBeSalesRep: boolean;
  email: string;
  isActive: boolean;
  isInternal: boolean;
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
  timestamp?: string;
  taxingScheme?: InflowTaxingScheme;
}

// TAXING SCHEMES

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
  timestamp?: string;
  defaultTaxCode?: InflowTaxCode;
  taxCodes?: InflowTaxCode[];
}

// CURRENCIES

export interface InflowCurrencyConversion {
  currencyConversionId: string;
  currencyId: string;
  exchangeRate: number;
  isManual: boolean;
  timestamp?: string;
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
  timestamp?: string;
  currencyConversions?: InflowCurrencyConversion[];
}

//  ADJUSTMENT REASON

export interface InflowAdjustmentReason {
  adjustmentReasonId: string;
  isActive: boolean;
  isInternal: boolean;
  name: string;
}

// Stock Adjustment

// "adjustmentNumber": "SA-000123",
// "adjustmentReasonId": "00000000-0000-0000-0000-000000000000",
// "customFields": {},
// "date": "2020-01-31",
// "isCancelled": true,
// "lastModifiedById": "00000000-0000-0000-0000-000000000000",
// "lastModifiedDateTime": "2020-01-31",
// "locationId": "00000000-0000-0000-0000-000000000000",
// "remarks": "string",
// "stockAdjustmentId": "00000000-0000-0000-0000-000000000000",
// "timestamp": "0000000000310AB6",

export interface InflowStockAdjustment {
  adjustmentNumber: string;
  adjustmentReasonId: string;
  locationId: string;
  isCancelled: boolean;
  date: string;
  remarks?: string;
  customFields: string;
  stockAdjustmentId: string;
  lastModifiedById: string;
  lastModifiedDateTime: string;
  timestamp?: string;
  attachments?: InflowAttachment[];
  lastModifiedBy?: InflowTeamMember;
  lines: InflowStockAdjustmentLine[];
  location?: InflowLocation;
}


export interface InflowQuantity {
  standardQuantity: string | null;
  uomQuantity: string | null;
  uom: string;
  serialNumbers: string[];
}

export interface InflowStockAdjustmentLine {
  productId: string;
  stockAdjustmentLineId: string | null;
  quantity: InflowQuantity;
  sublocation: string | null;
  description?: string;
  timestamp?: string;
  product?: InflowProduct;
}

export interface InflowStockAdjustInput {
  adjustmentNumber: string;
  adjustmentReasonId: string;
  stockAdjustmentId: string;
  date: string;
  isCancelled: boolean;
  lastModifiedById: string;
  locationId: string;
  remarks: string;
  lines: InflowStockAdjustmentLine[]
  customFields?: InflowCustomFields | null;
  lastModifiedDateTime?: string;
  timestamp?: string;
  attachments?: InflowAttachment[];
  lastModifiedBy?: InflowTeamMember;
  location?: InflowLocation;
  adjustmentReason?: InflowAdjustmentReason;
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

// PRODUCT COST ADJUSTMENT

export interface InflowProductCostAdjustment {
  productCostAdjustmentId: string;
  dateTime: string;
  lastModifiedById?: string | null;
  productId: string;
  serial?: string | null;
  timestamp?: string;
  unitCost: string;
  lastModifiedBy?: InflowTeamMember;
  product?: InflowProduct;
}

// PAYMENT TERM
export interface InflowPaymentTerms {
  paymentTermsId: string;
  name: string;
  daysDue: number;
  isActive: boolean;
  timestamp?: string;
}


// ========== GLOBAL ============

export interface InflowAttachment {
  inflowId: string;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  contentType: string | null;
  timestamp?: string | null;
}


export interface InflowCustomFields {
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

export interface InflowAddress {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  remarks?: string;
  addressType?: string | null;
}

// ========== x GLOBAL x ============

// Customer 

export interface InflowCustomer {
  customerId: string;
  contactName?: string | null;
  customFields?: InflowCustomFields;
  defaultBillingAddressId?: string | null;
  defaultCarrier?: string | null;
  defaultLocationId?: string | null;
  defaultPaymentMethod?: string | null;
  defaultPaymentTermsId?: string | null;
  defaultSalesRep?: string | null;
  defaultSalesRepTeamMemberId?: string | null;
  defaultShippingAddressId?: string | null;
  discount?: string | null;
  email?: string | null;
  fax?: string | null;
  isActive: boolean;
  lastModifiedById?: string | null;
  lastModifiedDttm?: string | null;
  name: string;
  phone?: string | null;
  pricingSchemeId?: string | null;
  remarks?: string | null;
  taxExemptNumber?: string | null;
  taxingSchemeId?: string | null;
  timestamp?: string | null;
  website?: string | null;
  addresses?: InflowCustomerAddress[];
  balances?: InflowCustomerBalance[];
  credits?: InflowCustomerCredit[];
  dues?: InflowCustomerDue[];
  attachments?: InflowAttachment[];

  orderHistory?: {
    id: string;
    lastOrderDate: string
  } | null

  defaultBillingAddress?: InflowCustomerAddress | null;
  defaultShippingAddress?: InflowCustomerAddress | null;
  defaultLocation?: InflowLocation | null;
  
  defaultPaymentTerms?: InflowPaymentTerms | null;
  defaultSalesRepTeamMember?: InflowTeamMember | null;
  lastModifiedBy?: InflowTeamMember | null;
  pricingScheme?: InflowPricingScheme | null;
  taxingScheme?: InflowTaxingScheme | null;

}

export interface InflowCustomerAddress {
  customerAddressId: string;
  customerId: string;
  name?: string;
  timestamp?: string;
  address: InflowAddress;
}

export interface InflowCustomerDue {
  customerDueId: string;
  currencyId?: string;
  amountCurrent: string;
  amount1To30: string;
  amount31To60: string;
  amount61Plus: string;
}

export interface InflowCustomerBalance {
  customerBalanceId: string;
  customerId?: string;
  currencyId: string;
  balance: string;
}

export interface InflowCustomerCredit {
  customerCreditId: string;
  customerId?: string;
  currencyId: string;
  credit: string;
}


// Vendor 

export interface InflowVendorAddress {
  vendorAddressId: string;
  vendorId: string;
  name?: string;
  timestamp?: string;
  address: InflowAddress;
}

export interface InflowVendorBalance {
  vendorBalanceId: string;
  vendorId: string;
  currencyId: string;
  balance: string;
  currency?: InflowCurrency | null;
}

export interface InflowVendorCredit {
  vendorCreditId: string;
  vendorId: string;
  currencyId: string;
  credit: string;
  currency?: InflowCurrency | null;
}

export interface InflowVendorDue {
  vendorDueId: string;
  currencyId: string;

  amountCurrent: string;
  amount1To30: string;
  amount31To60: string;
  amount61Plus: string;

  currency?: InflowCurrency | null;
}

export interface InflowVendorItem {
  vendorItemId: string;
  cost: string | null;
  leadTimeDays: number | null;
  lineNum: number | null;
  productId: string;
  timestamp?: string;
  vendorId: string;
  vendorItemCode: string | null; // Maps to Prisma vendorSku
  product: InflowProduct
}

export interface InflowVendor {
  vendorId: string;
  name: string;
  contactName: string | null;
  currencyId: string | null;
  customFields: InflowCustomFields | null;
  defaultAddressId: string | null;
  defaultCarrier: string | null;
  defaultPaymentMethod: string | null;
  defaultPaymentTermsId: string | null;
  discount: string | null;
  email: string | null;
  fax: string | null;
  isActive: boolean;
  isTaxInclusivePricing: boolean;
  lastModifiedById: string | null;
  lastModifiedDttm: string | null;
  leadTimeDays: number | null;
  phone: string | null;
  remarks: string | null;
  taxingSchemeId: string | null;
  timestamp: string;
  website: string | null;
  
  // Included relations via API payload definition parameters
  addresses?: InflowVendorAddress[];
  attachments?: InflowAttachment[];
  balances?: InflowVendorBalance[];
  credits?: any[]; // Array structure following balance formatting rules if used
  currency?: InflowCurrency | null;
  dues?: InflowVendorDue[];
  lastModifiedBy?: InflowTeamMember | null;
  taxingScheme?: InflowTaxingScheme| null;
  vendorItems?: InflowVendorItem[];
  defaultPaymentTerms?: InflowPaymentTerms

}

// ==========================================
// Reusable Shared Types / JSON Sub-structures
// ==========================================

export interface InflowDiscount {
  value: string; // "0.00000"
  isPercent: boolean;
}

export interface InflowQuantity {
  standardQuantity: string | null;
  uomQuantity: string | null;
  uom: string;
  serialNumbers: string[];
}

export interface InflowValueItem {
  value: string;
  isPercent: boolean;
}

export interface InflowUOMConversion {
  name: string;
  conversionRatio: {
    standardQuantity: string;
    uomQuantity: string;
  };
}

// ==========================================
// Order Sub-Line Interfaces
// ==========================================

export interface InflowSalesOrderLine {
  salesOrderLineId: string;
  description: string | null;
  discount: InflowDiscount;
  isDiscarded: boolean;
  productId: string;
  quantity: InflowQuantity;
  returnDate: string | null;
  serviceCompleted: boolean | null;
  subTotal: string;
  tax1Rate: string;
  tax2Rate: string;
  taxCodeId: string | null;
  timestamp?: string;
  unitPrice: string;
  product?: Partial<InflowProduct>;
}

export interface InflowPackLine {
  salesOrderPackLineId: string;
  containerNumber: string | null;
  description: string | null;
  productId: string;
  quantity: Partial<InflowQuantity>;
  timestamp?: string;
  product?: Partial<InflowProduct>;
}

export interface InflowPickLine {
  salesOrderPickLineId: string;
  lineNum: string | null;
  locationId: string | null;
  sublocation: string | null;
  pickDate: string | null;
  productId: string;
  quantity: InflowQuantity;
  timestamp?: string;
  description?: string | null;
}

export interface InflowSalesPaymentLine {
  salesOrderPaymentHistoryLineId: string;
  lineNum: number;
  amount: string;
  datePaid: string | null;
  paymentMethod: string | null;
  paymentType: string | null;
  referenceNumber: string | null;
  remarks: string | null;
  timestamp?: string;
}

export interface InflowShipLine {
  salesOrderShipLineId: string;
  carrier: string | null;
  shippedDate: string | null;
  trackingNumber: string | null;
  easyPostShipmentId: string | null;
  easyPostShipmentStatus: string | null;
  easyPostConfirmationEmailAddress: string | null;
  containers: any[]; 
  timestamp?: string;
}

export interface InflowAllocationLine {
  salesOrderPickAllocationLineId: string;
  productId: string;
  lineNum?: string | number | null;
  locationId?: string | null;
  sublocation?: string | null;
  quantity?: any | null;
  timestamp?: string;
}

export interface InflowAllocationFailure {
  salesOrderPickAllocationFailureId: string;
  productId: string;
  lineNum?: string | number | null;
  hasExpiredLotsInStock: boolean;
  quantity?: any | null;
  timestamp?: string;
}

export interface InflowRestockLine {
  salesOrderRestockLineId: string;
  productId: string;
  description?: string | null;
  locationId?: string | null;
  sublocation?: string | null;
  restockDate?: string | null;
  quantity?: any | null;
  timestamp?: string;
}

export interface InflowCostOfGoodsSold {
  salesOrderCostOfGoodsSoldId: string;
  costOfGoodsSold: string;
}

// ==========================================
// Root Sales Order Interface
// ==========================================

export interface InflowSalesOrder {
  salesOrderId: string;
  orderNumber: string;
  poNumber: string | null;
  externalId: string | null;
  source: string | null;
  
  // Financials
  subTotal: string;
  total: string;
  amountPaid: string;
  balance: string;
  orderFreight: string;
  returnFee: string;
  returnFreight: string;
  exchangeRate: number;
  exchangeRateAutoPulled: string | null;
  
  // Statuses & Flags
  paymentStatus: string;
  inventoryStatus: string;
  isCancelled: boolean;
  isCompleted: boolean;
  isFullyPicked: boolean;
  isInvoiced: boolean;
  isPicking: boolean;
  isPrioritized: boolean;
  isQuote: boolean;
  isTaxInclusive: boolean;
  needsConfirmation: boolean;
  
  // Dates
  orderDate: string | null;
  dueDate: string | null;
  invoicedDate: string | null;
  paidDate: string | null;
  requestedShipDate: string | null;
  shippedDate: string | null;
  
  // Contacts & Remarks
  contactName: string | null;
  email: string | null;
  phone: string | null;
  orderRemarks: string | null;
  packRemarks: string | null;
  pickRemarks: string | null;
  restockRemarks: string | null;
  returnRemarks: string | null;
  shipRemarks: string | null;
  shipToCompanyName: string | null;
  showShipping: boolean;
  timestamp?: string;
  
  // Addresses & Custom Data
  billingAddress: InflowAddress | null;
  shippingAddress: InflowAddress | null;
  customFields: InflowCustomFields;
  nonCustomerCost: InflowValueItem | null;
  sameBillingAndShipping: boolean;

  // Foreign Identifiers
  customerId: string;
  locationId: string | null;
  assignedToTeamMemberId: string | null;
  confirmerTeamMemberId: string | null;
  salesRepTeamMemberId: string | null;
  salesRep: string | null;
  paymentTermsId: string | null;
  pricingSchemeId: string | null;
  taxingSchemeId: string | null;
  currencyId: string | null;
  lastModifiedById: string | null;

  // Tax Setup
  calculateTax2OnTax1: boolean;
  tax1: string;
  tax1Name: string | null;
  tax1OnShipping: boolean;
  tax1Rate: string;
  tax2: string;
  tax2Name: string | null;
  tax2OnShipping: boolean;
  tax2Rate: string;

  // Nested Arrays (from full response document)
  // customer?: Partial<InflowCustomer>;
  // lines: InflowSalesOrderLine[];
  // packLines?: InflowPackLine[];
  // paymentLines?: InflowPaymentLine[];
  // pickLines?: InflowPickLine[];
  // shipLines?: InflowShipLine[];
  // location?: Partial<InflowLocation>;
  lines: InflowSalesOrderLine[];
  packLines: InflowPackLine[];
  pickLines: InflowPickLine[];
  pickAllocationLines: InflowAllocationLine[];
  pickAllocationFailures: InflowAllocationFailure[];
  restockLines: InflowRestockLine[];
  shipLines: InflowShipLine[];
  paymentLines: InflowSalesPaymentLine[];
  costOfGoodsSold?: InflowCostOfGoodsSold | null;

  currency: InflowCurrency;
  lastModifiedBy: InflowTeamMember;
}


// ==========================================
// Reusable Sub-structures
// ==========================================

export interface InflowPurchaseUOMDetails {
  name: string;
  conversionRatio: {
    standardQuantity: string;
    uomQuantity: string;
  };
}

// ==========================================
// Lines array items
// ==========================================

export interface InflowPurchaseOrderLine {
  purchaseOrderLineId: string;
  description: string | null;
  discount: InflowDiscount;
  productHeight: string | null;
  productId: string;
  productLength: string | null;
  productWeight: string | null;
  productWidth: string | null;
  quantity: InflowQuantity;
  returnDate: string | null;
  serviceCompleted: boolean | null;
  subTotal: string;
  tax1Rate: string;
  tax2Rate: string;
  taxCodeId: string | null;
  timestamp?: string;
  unitPrice: string;
  vendorItemCode: string | null;
  product?: InflowProduct;
  taxCode?: InflowTaxCode | null;
}

export interface InflowPurchaseReceiveLine {
  purchaseOrderReceiveLineId: string;
  description: string | null;
  locationId: string | null;
  lotId: string | null;
  productHeight: string | null;
  productId: string;
  productLength: string | null;
  productWeight: string | null;
  productWidth: string | null;
  quantity: InflowQuantity;
  receiveDate: string | null;
  sublocation: string | null; // e.g., "A-01"
  timestamp?: string;
  vendorItemCode: string | null;
  location?: Record<string, any> | null;
  product?: Record<string, any> | null;
}


// ==========================================
// Root Inflow Purchase Order Payload
// ==========================================

export interface InflowPurchaseOrder {
  purchaseOrderId: string;
  amountPaid: string;
  approverTeamMemberId: string | null;
  assignedToTeamMemberId: string | null;
  balance: string;
  calculateTax2OnTax1: boolean;
  carrier: string;
  contactName: string;
  currencyId: string;
  customFields: InflowCustomFields;
  dueDate: string | null;
  email: string;
  exchangeRate: string;
  exchangeRateAutoPulled: string | null;
  freight: string;
  inventoryStatus: 'fulfilled' | 'unfulfilled' | string;
  isCancelled: boolean;
  isCompleted: boolean;
  isQuote: boolean;
  isTaxInclusive: boolean;
  lastModifiedById: string;
  locationId: string;
  nonVendorCosts: InflowDiscount;
  orderDate: string | null;
  orderNumber: string;
  orderRemarks: string;
  paidDate: string | null;
  paymentStatus: 'unpaid' | 'paid' | 'partial' | string;
  paymentTermsId: string;
  phone: string;
  receiveRemarks: string;
  requestShipDate: string | null;
  returnExtra: string;
  returnFee: string;
  returnRemarks: string;
  shipToAddress: InflowAddress;
  shipToCompanyName: string;
  showShipping: boolean;
  subTotal: string;
  tax1: string;
  tax1Name: string;
  tax1OnShipping: boolean;
  tax1Rate: string;
  tax2: string;
  tax2Name: string;
  tax2OnShipping: boolean;
  tax2Rate: string;
  taxingSchemeId: string;
  timestamp?: string;
  total: string;
  unstockRemarks: string;
  vendorAddress: InflowAddress;
  vendorId: string;
  vendorOrderNumber: string;

  // Relationship blocks from data layout
  approverTeamMember?: InflowTeamMember | null;
  assignedToTeamMember?: InflowTeamMember | null;
  attachments?: InflowAttachment[];
  currency?: InflowCurrency;
  lastModifiedBy?: InflowTeamMember | null;
  lines?: InflowPurchaseOrderLine[];
  location?: InflowLocation;
  paymentLines?: InflowPurchasePaymentLine[];
  paymentTerms?: InflowPaymentTerms;
  receiveLines?: InflowPurchaseReceiveLine[];
  taxingScheme?: InflowTaxingScheme;
  unstockLines?: InflowPurchaseUnstockLine[];
  vendor?: InflowVendor | null;
}

export interface InflowPurchasePaymentLine {
  purchaseOrderPaymentHistoryLineId: string;
  amount: string;
  datePaid: string | null;
  paymentMethod: string | null;
  paymentType: string | null;
  referenceNumber: string | null;
  remarks: string | null;
  timestamp?: string;
}

export interface InflowPurchaseUnstockLine {
  purchaseOrderUnstockLineId: string;
  locationId: string;
  productId: string;
  description: string;
  quantity: InflowQuantity;
  sublocation: string;
  vendorItemCode: string;
  unstockDate: string;
  timestamp?: string;
  location?: InflowLocation;
  product?: InflowProduct;
}


// "amount": "19.99",
// "datePaid": "2020-01-31",
// "paymentMethod": "string",
// "paymentType": "Payment",
// "purchaseOrderPaymentHistoryLineId": "00000000-0000-0000-0000-000000000000",
// "referenceNumber": "string",
// "remarks": "string",
// "timestamp": "0000000000310AB6"


// Shared Attachment


// export interface InflowVendor {
//   vendorId: string;
//   contactName?: string | null;
//   currencyId: string;
//   customFields?: InflowVendorCustomFields;
//   defaultAddressId?: string | null;
//   defaultCarrier?: string | null;
//   defaultPaymentMethod?: string | null;
//   defaultPaymentTermsId?: string | null;
//   discount?: string | null;
//   email?: string | null;
//   fax?: string | null;
//   isActive: boolean;
//   isTaxInclusivePricing: false;
//   lastModifiedById?: string | null;
//   lastModifiedDttm?: string | null;
//   leadTimeDays: number;
//   name: string;
//   phone?: string | null;
//   remarks?: string | null;
//   taxingSchemeId?: string | null;
//   timestamp?: string | null;
//   website?: string | null;
//   addresses?: InflowVendorAddress[];
//   // attachments?: InflowAttachments[];
//   balances?: InflowVendorBalance[];
//   credits?: InflowVendorCredit[];
//   currency: InflowCurrency;
//   dues?: InflowVendorDue[];
//   defaultBillingAddress?: InflowVendorAddress | null;
//   defaultShippingAddress?: InflowVendorAddress | null;
//   defaultLocation?: InflowLocation | null;
//   defaultPaymentTerms?: {
//     paymentTermsId: string;
//     name: string;
//   } | null;
//   defaultSalesRepTeamMember?: {
//     teamMemberId: string;
//     name: string;
//   } | null;
//   lastModifiedBy?: {
//     teamMemberId: string;
//     name: string;
//   } | null;
//   pricingScheme?: {
//     pricingSchemeId: string;
//     name: string;
//   } | null;
//   taxingScheme?: {
//     taxingSchemeId: string;
//     name: string;
//   } | null;
// }

// export interface InflowVendorCustomFields {
//   custom1?: string;
//   custom2?: string;
//   custom3?: string;
//   custom4?: string;
//   custom5?: string;
//   custom6?: string;
//   custom7?: string;
//   custom8?: string;
//   custom9?: string;
//   custom10?: string;
// }

// export interface InflowVendorAddress {
//   vendorAddressId: string;
//   vendorId: string;
//   name?: string | null;
//   timestamp?: string | null;
//   address?: {
//     address1?: string | null;
//     address2?: string | null;
//     city?: string | null;
//     state?: string | null;
//     country?: string | null;
//     postalCode?: string | null;
//     remarks?: string | null;
//     addressType?: string | null;
//   };
  
// }

// export interface InflowVendorDue {
//   vendorDueId: string;
//   currencyId?: string;
//   amountCurrent: string;
//   amount1To30: string;
//   amount31To60: string;
//   amount61Plus: string;
// }

// export interface InflowVendorBalance {
//   vendorBalanceId: string;
//   vendorId?: string;
//   currencyId: string;
//   balance: string;
// }

// export interface InflowVendorCredit {
//   vendorCreditId: string;
//   vendorId?: string;
//   currencyId: string;
//   credit: string;
// }

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




// =====================================
// Root
// =====================================

import { ProductPriceType } from "@/generated/prisma/enums";

export interface InflowProductGroup {
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
  defaultProduct?: InflowProduct
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

  productGroup?: InflowProductGroup
}

// =====================================
// Product
// =====================================

export interface InflowProduct {
  productId: string;

  sku: string | null;
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
  categoryId: string;
  lastVendorId: string | null;
  lastModifiedById: string | null;
  createdDttm: string;
  lastModifiedDateTime: string;
  timestamp: string;
  category: InflowCategory | null;
  purchasingUom: InflowPurchasingUom | null;
  salesUom: InflowSalesUom | null;
  customFields: InflowCustomFields;
  images: InflowProductImage[];
  defaultPrice?: InflowProductPrice;
  inventoryLines: InflowInventoryLine[];
  productVariant: InflowProductVariant

  productBarcodes?: InflowProductBarcode[];
  taxCodes?: InflowProductTaxCode[];
  reorderSettings?: InflowReorderSetting[];
  productOperations?: InflowProductOperation[];
  prices?: InflowProductPrice[];
  cost?: InflowProductCost | null;
  itemBoms?: InflowItemBom[];
  attachments?: InflowProductAttachment[];

}

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
  timestamp: string;
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
  timestamp: string;
  defaultTaxCode?: InflowTaxCode;
  taxCodes?: InflowTaxCode[];
}

// CURRENCIES

export interface InflowCurrencyConversion {
  currencyConversionId: string;
  currencyId: string;
  exchangeRate: number;
  isManual: boolean;
  timestamp: string;
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
  currencyConversions?: InflowCurrencyConversion[];
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
  currency: InflowCurrency;
  productPrices?: InflowProductPrice[];
}

// PRODUCT COST ADJUSTMENT

export interface InflowProductCostAdjustment {
  productCostAdjustmentId: string;
  dateTime: string;
  lastModifiedById?: string | null;
  productId: string;
  serial?: string | null;
  timestamp: string;
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
  timestamp: string;
}


// ========== GLOBAL ============

export interface InflowAttachment {
  inflowId: string;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  contentType: string | null;
  timestamp: string | null;
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
  timestamp: string;
  vendorId: string;
  vendorItemCode: string | null; // Maps to Prisma vendorSku
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
}

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



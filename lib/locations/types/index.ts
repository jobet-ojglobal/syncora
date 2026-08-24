// lib/locations/types/product-sync.types.ts

import { InflowCurrency } from "@/lib/inflow/types";

export interface LocalCurrency {
  currencyId: string;
  code: string;
  description: string;
  symbol: string;
  timestamp: string;
  isActive: number;
  decimalPlaces: number;
  decimalSeparator: string;
  thousandsSeparator: string;
  cRCurrencyPositionType: string;
  cRNegativeType: string;
  syncedAt: string;
}

export interface LocalPaymentTerm {
  paymentTermsId: string;
  name: string;
  daysDue: number;
  isActive: number;
  timestamp: string;
}


export interface LocalPricingScheme {
  pricingSchemeId: string;
  name: string;
  lastModUserId: number;
  lastModDttm: string;
  isActive: number;
  isTaxInclusive: number;
  currencyId: string;
  timestamp: string;
  syncedAt: string;
}

export interface LocalTaxCode {
  taxCodeId: string;
  taxingSchemeId: string;
  name: string;
  isActive: boolean;
  tax1Rate: string;
  tax2Rate: string;
  syncedAt: string;
}


export interface LocalTaxingScheme {
  taxingSchemeId: string;
  name: string;
  tax1Name: string;
  tax2Name: string;
  calculateTax2OnTax1: number;
  lastModUserId: number;
  lastModDttm: string;
  timestamp: string;
  isActive: number;
  tax1OnShipping: number;
  defaultTaxCodeId: number;
  tax2OnShipping: number;
  syncedAt: string;
  taxCodes?: LocalTaxCode[]
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
  image?: string | null;
}

export interface LocalProductSerial {
  serialId: string;
  productId: string;
  locationId: string;
  serialNumber: string;
}

export interface LocalProductInventory {
  productId: string;
  name: string;
  inventoryLines: LocalInventoryLine[];
}

export interface LocalInventoryLine {
  locationId: string | null;
  productId: string;
  quantityOnHand: number;
  serials: string[];
}

export interface LocalLocation {
  locationId: string;
  name: string;
  isActive: number;
  lastModUserId: string;
  lastModDttm: string;
  timestamp: string;
}


export interface LocalCustomer {
  customerId: string;
  contactName: string;
  customFields: LocalCustomFields;
  defaultBillingAddressId: string | null;
  defaultCarrier: string | null;
  defaultLocationId: string | null;
  defaultPaymentMethod: string | null;
  defaultPaymentTermsId: string | null;
  defaultSalesRep: string | null;
  defaultSalesRepTeamMemberId: string | null;
  defaultShippingAddressId: string | null;
  discount: string;
  email: string | null;
  fax: string | null;
  isActive: boolean;
  lastModifiedById: string | null;
  lastModifiedDttm: string;
  name: string;
  phone: string | null;
  pricingSchemeId: string | null;
  remarks: string | null;
  taxExemptNumber: string | null;
  taxingSchemeId: string | null;
  timestamp: string | null;
  website: string | null;
  addresses: LocalCustomerAddress[];
  attachments: InflowAttachment[];
  balances: LocalCustomerBalance[];
  credits: LocalCustomerCredit[];
  defaultBillingAddress: LocalCustomerAddress | null;
  defaultLocation: InflowLocation | null;
  defaultPaymentTerms: InflowPaymentTerms | null;
  defaultSalesRepTeamMember: InflowTeamMember | null;
  defaultShippingAddress: LocalCustomerAddress | null;
  dues: LocalCustomerDue[];
  lastModifiedBy: InflowTeamMember | null;
  orderHistory: LocalCustomerOrderHistory | null;
  pricingScheme: InflowPricingScheme | null;
  taxingScheme: InflowTaxingScheme | null;
}

export interface LocalCustomerAddress {
  customerAddressId: string;
  customerId: string;
  name: string;
  timestamp: string | null;
  address: InflowAddress;
}

export interface InflowAddress {
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  remarks: string;
  addressType: string;
}

export interface InflowLocation {
  locationId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  timestamp: string | null;
  address: InflowAddress;
}

export interface InflowPaymentTerms {
  paymentTermsId: string;
  daysDue: number;
  isActive: boolean;
  name: string;
  timestamp: string | null;
}

export interface InflowTeamMember {
  teamMemberId: string;
  accessAllLocations: boolean;
  canBeSalesRep: boolean;
  email: string;
  isInternal: boolean;
  name: string;
}

export interface InflowPricingScheme {
  pricingSchemeId: string;
  currencyId: string | null;
  isActive: boolean;
  isDefault: boolean;
  isTaxInclusive: boolean;
  name: string;
  timestamp: string | null;
}

export interface InflowTaxingScheme {
  taxingSchemeId: string;
  calculateTax2OnTax1: boolean;
  defaultTaxCodeId: string | null;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  tax1Name: string;
  tax1OnShipping: boolean;
  tax2Name: string;
  tax2OnShipping: boolean;
  timestamp: string | null;
  taxCodes: InflowTaxCode[];
}

export interface InflowTaxCode {
  taxCodeId: string;
  name: string;
  rate?: number;
}

export interface LocalCustomerOrderHistory {
  id: string;
  lastOrderDate: string | null;
}

export interface InflowAttachment {
  attachmentId?: string;
  fileName?: string;
  url?: string;
}

export interface LocalCustomerDue {
  customerDueId: string;
  currencyId?: string;
  amountCurrent: string;
  amount1To30: string;
  amount31To60: string;
  amount61Plus: string;
}

export interface LocalCustomerBalance {
  customerBalanceId: string;
  customerId?: string;
  currencyId: string;
  balance: string;
}

export interface LocalCustomerCredit {
  customerCreditId: string;
  customerId?: string;
  currencyId: string;
  credit: string;
}


export interface CustomerPayload {
  customerId: number;
  version: number;
  name: string;
  vendorPermitNumber: string;
  remarks: string;
  defaultPricingSchemeId: number | null;
  discount: string;
  defaultPaymentTermsId: number | null;
  taxingSchemeId: number | null;
  defaultCarrier: string;
  defaultPaymentMethod: string;
  contactName: string;
  phone: string;
  fax: string;
  email: string;
  taxExemptNumber?: string | null;
  
  // Primary Address
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  addressRemarks: string;
  addressType: number | string | null;
  
  // Billing Address
  usingBillingAddress: number; // 0 | 1 boolean flag
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingCountry: string;
  billingPostalCode: string;
  billingAddressRemarks: string;
  billingAddressType: number | string | null;
  
  // Shipping Address
  usingShippingAddress: number; // 0 | 1 boolean flag
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  shippingPostalCode: string;
  shippingAddressRemarks: string;
  shippingAddressType: number | string | null;
  
  
  // Custom Fields
  custom1: string;
  custom2: string;
  custom3: string;
  custom4: string;
  custom5: string;
  custom6: string;
  custom7: string;
  custom8: string;
  custom9: string;
  custom10: string;

  dues: [],
  balances: [],
  credits: [],
  
  // Metadata & System Info
  lastModUserId: number;
  lastModDttm: string;
  timestamp: string;
  isActive: number; // 0 | 1 boolean flag
  website: string;
  defaultSalesRep: string;
  defaultLocationId: number | null;
  syncedAt: string;
}


export interface VendorPayload {
  vendorId: number;
  version: number;
  name: string;
  remarks: string;
  defaultPaymentTermsId: number | null;
  taxingSchemeId: number | null;
  defaultCarrier: string;
  
  // Primary Address
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  addressRemarks: string;
  addressType: number | string | null;
  
  // Contact Info
  contactName: string;
  phone: string;
  fax: string;
  email: string;
  
  // Financial & Commerce
  currencyId: number | null;
  discount: string;
  isTaxInclusivePricing: number; // 0 | 1 boolean flag
  defaultPaymentMethod: string;
  
  // Custom Fields
  custom1: string;
  custom2: string;
  custom3: string;
  custom4: string;
  custom5: string;
  custom6: string;
  custom7: string;
  custom8: string;
  custom9: string;
  custom10: string;

  dues: InflowVendorDue[],
  balances: InflowVendorBalance[],
  credits: InflowVendorCredit[],
  vendorItems: InflowVendorItem[],
  attachments: InflowAttachment[],
  
  // Metadata & System Info
  lastModUserId: number;
  lastModDttm: string;
  timestamp: string;
  isActive: number; // 0 | 1 boolean flag
  website: string;
  syncedAt: string;
}

export interface InflowVendorItem {
  vendorItemId: string;
  cost: string | null;
  leadTimeDays: number | null;
  lineNum: number | null;
  productId: string;
  timestamp?: string;
  vendorId: string;
  vendorItemCode: string | null; 
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

// export interface InflowAttachment {
//   inflowId: string;
//   fileName: string | null;
//   fileUrl: string | null;
//   fileSize: number | null;
//   contentType: string | null;
//   timestamp?: string | null;
// }
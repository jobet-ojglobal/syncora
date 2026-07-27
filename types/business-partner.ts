import { Prisma } from "@/generated/prisma/client";

export interface BusinessPartner {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  fax?: string | null;
  website?: string | null;
  remarks?: string | null;
  isActive: boolean;

  customer?: Customer | null;
//   vendor?: Vendor | null;
  addresses: BusinessPartnerAddress[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface BusinessPartnerAddress {
  id: string;
  inflowId?: string | null;
  localId?: number | null;

  businessPartnerId: string;

  name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  remarks?: string | null;

  addressType?: AddressType | null;

  businessPartner?: BusinessPartner;

  billingCustomers?: Customer[];
  shippingCustomers?: Customer[];

//   addressVendors?: Vendor[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export enum AddressType {
  Commercial = "Commercial",
  Residential = "Residential",
}

export interface Customer {
  id: string;
  businessPartnerId: string;
  inflowId: string;

  taxExemptNumber?: string | null;
  defaultCarrier?: string | null;
  defaultPaymentMethod?: string | null;

  discount?: Prisma.Decimal | null;

  defaultLocationId?: string | null;
  defaultPaymentTermsId?: string | null;
  pricingSchemeId?: string | null;
  taxingSchemeId?: string | null;

  defaultSalesRepTeamMemberId?: string | null;
  lastModifiedById?: string | null;

  defaultBillingAddressId?: string | null;
  defaultShippingAddressId?: string | null;

  businessPartner: BusinessPartner;

  defaultLocation?: Location | null;
  defaultPaymentTerms?: PaymentTerm | null;
  pricingScheme?: PricingScheme | null;
  taxingScheme?: TaxingScheme | null;

//   defaultSalesRep?: TeamMember | null;
//   lastModifiedBy?: TeamMember | null;

  defaultBillingAddress?: BusinessPartnerAddress | null;
  defaultShippingAddress?: BusinessPartnerAddress | null;

  dues?: CustomerDue[];
  balances?: CustomerBalance[];
  credits?: CustomerCredit[];

//   salesOrders?: SalesOrder[];

//   user?: User | null;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CustomerDue {
  id: string;
  inflowId: string;

  customerId: string;
  currencyId: string;

  amountCurrent: Prisma.Decimal;
  amount1To30: Prisma.Decimal;
  amount31To60: Prisma.Decimal;
  amount61Plus: Prisma.Decimal;

  customer?: Customer;
  currency?: Currency;

  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerBalance {
  id: string;
  inflowId: string;

  customerId: string;
  currencyId: string;

  balance: Prisma.Decimal;

  customer?: Customer;
  currency?: Currency;

  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerCredit {
  id: string;
  inflowId: string;

  customerId: string;
  currencyId: string;

  credit: Prisma.Decimal;

  customer?: Customer;
  currency?: Currency;

  createdAt: Date;
  updatedAt: Date;
}

export enum CurrencyNegativeType {
  Leading = "Leading",
  Trailing = "Trailing",
  Parentheses = "Parentheses",
}

export interface PaymentTerm {
  id: string;
  inflowId: string;

  name: string;
  daysDue?: number | null;
  isActive: boolean;

  customers?: Customer[];
//   vendors?: Vendor[];
//   salesOrders?: SalesOrder[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface TaxingScheme {
  id: string;
  inflowId: string;

  name: string;

  isActive: boolean;
  isDefault: boolean;

  calculateTax2OnTax1: boolean;

  tax1Name?: string | null;
  tax1OnShipping: boolean;

  tax2Name?: string | null;
  tax2OnShipping: boolean;

  defaultTaxCodeId?: string | null;

  defaultTaxCode?: TaxCode | null;
  taxCodes?: TaxCode[];

//   productTaxCodes?: ProductTaxCode[];

  customers?: Customer[];
//   vendors?: Vendor[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface TaxCode {
  id: string;
  inflowId: string;

  taxingSchemeId: string;

  name: string;
  isActive: boolean;

  tax1Rate?: Prisma.Decimal | null;
  tax2Rate?: Prisma.Decimal | null;

  taxingScheme?: TaxingScheme;
  defaultForSchemes?: TaxingScheme[];

//   productTaxCodes?: ProductTaxCode[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Currency {
  id: string;
  inflowId: string;

  name: string;
  isoCode: string;

  symbol?: string | null;

  decimalPlaces: number;
  decimalSeparator?: string | null;
  thousandsSeparator?: string | null;

  isSymbolFirst: boolean;

  negativeType?: CurrencyNegativeType | null;

  conversions?: CurrencyConversion[];
  pricingSchemes?: PricingScheme[];

  customerDues?: CustomerDue[];
  customerBalances?: CustomerBalance[];
  customerCredits?: CustomerCredit[];

//   vendorDues?: VendorDue[];
//   vendorBalances?: VendorBalance[];
//   vendorCredits?: VendorCredit[];

//   vendors?: Vendor[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CurrencyConversion {
  id: string;
  inflowId: string;

  currencyId: string;

  exchangeRate: Prisma.Decimal;
  isManual: boolean;

  currency?: Currency;

  createdAt: Date;
  updatedAt: Date;
}

export interface PricingScheme {
  id: string;
  inflowId: string;

  currencyId: string;

  name: string;

  isActive: boolean;
  isDefault: boolean;
  isTaxInclusive: boolean;

  currency?: Currency;

//   productPrices?: ProductPrice[];

  customers?: Customer[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
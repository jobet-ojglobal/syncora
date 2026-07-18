

export interface CustomerAddress {
  name: string | null;
  customerAddressId: string | null;
  customerId: string | null;
  address: {
    addressType: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    remarks: string | null;
  };
}

export interface VendorAddress {
  name: string | null;
  vendorAddressId: string | null;
  vendorId: string | null;
  address: {
    addressType: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    remarks: string | null;
  };
}

// Minimal core business partner info shared by both payloads
export interface BPBaseContext {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  website: string | null;
  remarks: string | null;
  isActive: boolean;
}

export interface CustomerSyncPayload {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  website: string | null;
  remarks: string | null;
  isActive: boolean;
  
  addresses: CustomerAddress[];
  customerId: string;
  taxExemptNumber: string | null;
  defaultCarrier: string | null;
  defaultPaymentMethod: string | null;
  discount: string | null;
  defaultLocationId: string | null;
  defaultPaymentTermsId: string | null;
  pricingSchemeId: string | null;
  taxingSchemeId: string | null;
  defaultSalesRepTeamMemberId: string | null;
  defaultBillingAddressId: string | null;
  defaultShippingAddressId: string | null;
  balances: Array<{ currencyId: string; customerBalanceId: string; customerId: string; balance: string }>;
  credits: Array<{ customerId: string; customerCreditId: string; currencyId: string; credit: string }>;
  dues: Array<{ customerDueId: string; currencyId: string; amountCurrent: string; amount1To30: string; amount31To60: string; amount61Plus: string }>;
}

export interface VendorSyncPayload {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  website: string | null;
  remarks: string | null;
  isActive: boolean;

  addresses: VendorAddress[];
  vendorId: string;
  defaultCarrier: string | null;
  defaultPaymentMethod: string | null;
  discount: string | null;
  isTaxInclusivePricing: boolean;
  leadTimeDays: number | null;
  currencyId: string | null;
  defaultPaymentTermsId: string | null;
  taxingSchemeId: string | null;
  defaultAddressId: string | null;
  balances: Array<{ currencyId: string; vendorBalanceId: string; vendorId: string; balance: string }>;
  credits: Array<{ vendorId: string; vendorCreditId: string; currencyId: string; credit: string }>;
  dues: Array<{ vendorDueId: string; currencyId: string; amountCurrent: string; amount1To30: string; amount31To60: string; amount61Plus: string }>;
  ratings?: any;
}

export interface SplitSyncPayloads {
  customer: CustomerSyncPayload | null;
  vendor: VendorSyncPayload | null;
}

export function splitBusinessPartnerPayload(result: any): SplitSyncPayloads {
  // 1. Build basic demographic baseline
  const coreContext: BPBaseContext = {
    id: result.businessPartner.id,
    name: result.businessPartner.name,
    contactName: result.businessPartner.contactName,
    email: result.businessPartner.email,
    phone: result.businessPartner.phone,
    fax: result.businessPartner.fax,
    website: result.businessPartner.website,
    remarks: result.businessPartner.remarks,
    isActive: result.businessPartner.isActive,
  };

  const rawAddresses = result.savedAddresses || [];

  let customer: CustomerSyncPayload | null = null;
  let vendor: VendorSyncPayload | null = null;

  // 2. Process Customer Payload Data & Filter Customer Addresses
  if (result.customerPayloadData) {
    const cData = result.customerPayloadData;
    
    const customerAddresses: CustomerAddress[] = rawAddresses
      .filter((addr: any) => addr.customerId) // Only grab rows meant for customer profiles
      .map((addr: any) => ({
        name: addr.name,
        customerAddressId: addr.inflowId || null,
        customerId: addr.customerId || null,
        address: {
          addressType: addr.addressType,
          address1: addr.address1,
          address2: addr.address2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
          remarks: addr.remarks,
        }
      }));

    customer = {
      ...coreContext, 
      addresses: customerAddresses,
      customerId: cData.inflowId,
      taxExemptNumber: cData.taxExemptNumber,
      defaultCarrier: cData.defaultCarrier,
      defaultPaymentMethod: cData.defaultPaymentMethod,
      discount: cData.discount ? cData.discount.toString() : '0.00',
      defaultLocationId: cData.defaultLocationId,
      defaultPaymentTermsId: cData.defaultPaymentTermsId,
      pricingSchemeId: cData.pricingSchemeId,
      taxingSchemeId: cData.taxingSchemeId,
      defaultSalesRepTeamMemberId: cData.defaultSalesRepTeamMemberId,
      defaultBillingAddressId: cData.defaultBillingAddressId,
      defaultShippingAddressId: cData.defaultShippingAddressId,
      balances: (cData.balances || []).map((b: any) => ({
        currencyId: b.currencyId,
        customerBalanceId: b.inflowId || b.id,
        customerId: b.customerId,
        balance: b.balance.toString(),
      })),
      credits: (cData.credits || []).map((c: any) => ({
        customerId: c.customerId,
        customerCreditId: c.inflowId || c.id,
        currencyId: c.currencyId,
        credit: c.credit.toString(),
      })),
      dues: (cData.dues || []).map((d: any) => ({
        customerDueId: d.inflowId || d.id,
        currencyId: d.currencyId,
        amountCurrent: d.amountCurrent.toString(),
        amount1To30: d.amount1To30?.toString() || '0',
        amount31To60: d.amount31To60?.toString() || '0',
        amount61Plus: d.amount61Plus?.toString() || '0',
      })),
    };
  }

  // 3. Process Vendor Payload Data & Filter Vendor Addresses
  if (result.vendorPayloadData) {
    const vData = result.vendorPayloadData;

    const vendorAddresses: VendorAddress[] = rawAddresses
      .filter((addr: any) => addr.vendorId) // Only grab rows meant for vendor profiles
      .map((addr: any) => ({
        name: addr.name,
        vendorAddressId: addr.inflowId || null,
        vendorId: addr.vendorId || null,
        address: {
          addressType: addr.addressType,
          address1: addr.address1,
          address2: addr.address2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
          remarks: addr.remarks,
        }
      }));

    vendor = {
      ...coreContext, 
      addresses: vendorAddresses,
      vendorId: vData.inflowId,
      defaultCarrier: vData.defaultCarrier,
      defaultPaymentMethod: vData.defaultPaymentMethod,
      discount: vData.discount ? vData.discount.toString() : '0.00',
      isTaxInclusivePricing: vData.isTaxInclusivePricing ?? false,
      leadTimeDays: vData.leadTimeDays,
      currencyId: vData.currencyId,
      defaultPaymentTermsId: vData.defaultPaymentTermsId,
      taxingSchemeId: vData.taxingSchemeId,
      defaultAddressId: vData.defaultAddressId,
      balances: (vData.balances || []).map((b: any) => ({
        currencyId: b.currencyId,
        vendorBalanceId: b.inflowId || b.id,
        vendorId: b.vendorId,
        balance: b.balance.toString(),
      })),
      credits: (vData.credits || []).map((c: any) => ({
        vendorId: c.vendorId,
        vendorCreditId: c.inflowId || c.id,
        currencyId: c.currencyId,
        credit: c.credit.toString(),
      })),
      dues: (vData.dues || []).map((d: any) => ({
        vendorDueId: d.inflowId || d.id,
        currencyId: d.currencyId,
        amountCurrent: d.amountCurrent.toString(),
        amount1To30: d.amount1To30?.toString() || '0',
        amount31To60: d.amount31To60?.toString() || '0',
        amount61Plus: d.amount61Plus?.toString() || '0',
      })),
      ratings: vData.ratings,
    };
  }

  return { customer, vendor };
}
import { BranchClient } from "../location.client";
import { InflowCustomer as CloudCustomerType } from "@/lib/inflow/types";

export interface InflowCustomer {
  customerId: string;
  contactName: string;

  customFields: InflowCustomerCustomFields;

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

  addresses: InflowCustomerAddress[];

  attachments: InflowAttachment[];

  balances: InflowCustomerBalance[];

  credits: InflowCustomerCredit[];

  defaultBillingAddress: InflowCustomerAddress | null;

  defaultLocation: InflowLocation | null;

  defaultPaymentTerms: InflowPaymentTerms | null;

  defaultSalesRepTeamMember: InflowTeamMember | null;

  defaultShippingAddress: InflowCustomerAddress | null;

  dues: InflowCustomerDue[];

  lastModifiedBy: InflowTeamMember | null;

  orderHistory: InflowCustomerOrderHistory | null;

  pricingScheme: InflowPricingScheme | null;

  taxingScheme: InflowTaxingScheme | null;
}

export interface InflowCustomerCustomFields {
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
}

export interface InflowCustomerAddress {
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

export interface InflowCustomerOrderHistory {
  id: string;
  lastOrderDate: string | null;
}

export interface InflowAttachment {
  attachmentId?: string;
  fileName?: string;
  url?: string;
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

// export interface InflowCustomerBalance {
//   balanceId?: string;
//   amount?: string;
//   currencyId?: string;
// }

// export interface InflowCustomerCredit {
//   creditId?: string;
//   amount?: string;
// }

// export interface InflowCustomerDue {
//   dueId?: string;
//   amount?: string;
//   dueDate?: string;
// }


export async function getCustomer(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<CloudCustomerType>(
    `/inflow-local/payload/${batchId}`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertCustomer(
  payload: InflowCustomer,
  url: string
) {
  const apiClient = new BranchClient(url)
  const { success, ...data } = await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "customerLocal",
        "transactionType": "CUSTOMER",
        "batch_id": `CSTMR-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.customerId,
        "payload": payload
      }
  );
  return { success, data };
}

export async function getCustomers(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowCustomer[]>(
    `/inflow-local/customers`,
  );
}


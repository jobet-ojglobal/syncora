import { AddressType } from "@/generated/prisma/client"; // Native enum import from Prisma

/**
 * Unified interface representing the complete structure of a Customer 
 * flatly mixed with its core BusinessPartner attributes.
 * Useful for form state initialization, view models, and API responses.
 */
export interface ICustomerMasterInput {
  id?: string; // Optional during creation, required on edit
  
  // Shared BusinessPartner attributes
  name: string;
  contactName: string;
  email: string;
  phone: string;
  fax: string;
  website: string;
  remarks: string;
  isActive: boolean;

  // Distinct Customer attributes
  taxExemptNumber: string;
  defaultCarrier: string;
  defaultPaymentMethod: string;
  discount: number; // Sanitized from Prisma.Decimal to standard JavaScript Number
  
  // Relational Foreign Key Identifiers (mapped mostly via inflowId)
  defaultLocationId: string;
  defaultPaymentTermsId: string;
  pricingSchemeId: string;
  taxingSchemeId: string;
  defaultSalesRepTeamMemberId: string;

  // Managed embedded collection
  addresses: ICustomerAddressInput[];
}

/**
 * Interface for managing individual address sub-documents inside the 
 * customer configuration lifecycle. Includes context flags for structural layouts.
 */
export interface ICustomerAddressInput {
  id?: string; // Present for existing addresses, undefined for newly added ones
  inflowId?: string | null;
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  remarks: string;
  addressType: AddressType | null; // Commercial or Residential

  // Context flags used dynamically by the frontend to link back 
  // to the parent Customer's billing/shipping relation fields.
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
}

/**
 * API response format wrapper for standardize JSON responses.
 */
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}
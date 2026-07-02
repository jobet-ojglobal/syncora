import { z } from "zod";

// Enum reflecting the Prisma AddressType
export const AddressTypeEnum = z.enum(["Commercial", "Residential"]);

export const businessPartnerAddressSchema = z.object({
  id: z.string().optional(), // Optional for new addresses
  name: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  remarks: z.string().optional(),
  addressType: AddressTypeEnum.optional(),
  isDefaultAddress: z.boolean(),
});

export const vendorFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Vendor name is required"),
  contactName: z.string().min(1, "Primary contact name required"),
  email: z.string().email("Invalid email").or(z.literal("")),
  phone: z.string().min(1, "Phone number required"),
  website: z.string().url("Invalid web address").or(z.literal("")).optional(),
  isActive: z.boolean(),
  fax: z.string().optional(),
  remarks: z.string().optional(),

  defaultCarrier: z.string().optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  
  // Vendor Fields
  defaultPaymentTermsId: z.string().optional(),
  discount: z.coerce.number().min(0).max(100).optional(),
  currencyId: z.string().optional(),
  defaultPaymentMethod: z.string().optional(),
  taxingSchemeId: z.string().optional(),
  isTaxInclusivePricing: z.boolean().default(false),
  
  // Relations
  addresses: z.array(businessPartnerAddressSchema).default([]),
});

export type VendorFormData = z.infer<typeof vendorFormSchema>;


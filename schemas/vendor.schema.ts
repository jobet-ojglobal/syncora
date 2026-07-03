import { z } from "zod";

export const businessPartnerAddressSchema = z.object({
  inflowId: z.string().optional(),
  name: z.string().min(1, "Location name is required"),
  address1: z.string().min(1, "Street address is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Zip/Postal code is required"),
  remarks: z.string().optional(),
  addressType: z.enum(["Commercial", "Residential"]).nullable(),
  isDefaultAddress: z.boolean(),
});

export const vendorFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Legal name is required"),
  contactName: z.string().min(1, "Primary contact name required"),
  email: z.string().email("Invalid email").or(z.literal("")),
  phone: z.string().min(1, "Phone number required"),
  website: z.string().url("Invalid web address").or(z.literal("")).optional(),
  isActive: z.boolean(),
  fax: z.string().optional(),

  defaultCarrier: z.string().optional(),
  
  // Vendor Fields
  defaultPaymentTermsId: z.string().optional(),
  currencyId: z.string().min(1, "Currency is required"),
  defaultPaymentMethod: z.string().optional(),
  taxingSchemeId: z.string().min(1, "Taxing scheme is required"),
  discount: z.number().min(0).max(100).optional(),

  isTaxInclusivePricing: z.boolean(),
  leadTimeDays: z.number().int().min(0).optional(),

  
  // Relations
  addresses: z.array(businessPartnerAddressSchema).min(1, "At least one address is required"),

  remarks: z.string().optional(),
});

export type VendorFormData = z.infer<typeof vendorFormSchema>;


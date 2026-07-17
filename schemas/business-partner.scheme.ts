import * as z from "zod";

export const addressSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Address descriptor name is required"),
  address1: z.string().min(1, "Street address is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  country: z.string().min(1, "Country designation is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  addressType: z.enum(["Commercial", "Residential"]).nullable(),
  isDefaultBilling: z.boolean(),
  isDefaultShipping: z.boolean(),
  isDefaultVendorAddress: z.boolean(),
  remarks: z.string().optional(),
});

export const businessPartnerFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Partner name must contain at least 2 characters"),
  contactName: z.string().optional().nullable(),
  email: z.string().email("Invalid email address formatting").or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  website: z.string().url("Invalid web path formatting").or(z.literal("")).nullable(),
  remarks: z.string().optional().nullable(),
  isActive: z.boolean(),

  // Operational Type Flags
  isCustomer: z.boolean(),
  isVendor: z.boolean(),

  // Conditional Customer Properties Matrix
  customerConfig: z.object({
    taxExemptNumber: z.string().optional().nullable(),
    defaultCarrier: z.string().optional().nullable(),
    defaultPaymentMethod: z.string(),
    discount: z.number().min(0).max(100),
    defaultLocationId: z.string().optional().nullable(),
    defaultPaymentTermsId: z.string().optional().nullable(),
    pricingSchemeId: z.string().optional().nullable(),
    taxingSchemeId: z.string().optional().nullable(),
    defaultSalesRepTeamMemberId: z.string().optional().nullable(),
  }).optional(),

  // Conditional Vendor Properties Matrix
  vendorConfig: z.object({
    defaultCarrier: z.string().optional().nullable(),
    defaultPaymentMethod: z.string(),
    discount: z.number().min(0).max(100),
    isTaxInclusivePricing: z.boolean(),
    leadTimeDays: z.number().int().min(0),
    currencyId: z.string().optional().nullable(),
    defaultPaymentTermsId: z.string().optional().nullable(),
    taxingSchemeId: z.string().optional().nullable(),
  }).optional(),

  addresses: z.array(addressSchema).min(1, "At least one address identity must be configured"),
}).refine((data) => data.isCustomer || data.isVendor, {
  message: "The entity must be registered as a Customer, a Vendor, or both.",
  path: ["isCustomer"],
});

export type BusinessPartnerFormData = z.infer<typeof businessPartnerFormSchema>;

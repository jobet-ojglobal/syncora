// schemas/customer.schema.ts
import { z } from "zod";

export const addressFormSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address1: z.string().min(1, "Street address is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Zip/Postal code is required"),
  remarks: z.string().optional(),
  addressType: z.enum(["Commercial", "Residential"]).nullable().optional(),
  isDefaultBilling: z.boolean(),
  isDefaultShipping: z.boolean()
});

export const customerFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Legal name is required"),
  contactName: z.string().min(1, "Primary contact name required"),
  email: z.string().email("Invalid email").or(z.literal("")),
  phone: z.string().min(1, "Phone number required"),
  website: z.string().url("Invalid web address").or(z.literal("")).optional(),
  isActive: z.boolean(),
  fax: z.string().optional(),
  remarks: z.string().optional(),

  taxExemptNumber: z.string().optional(),
  defaultCarrier: z.string().optional(),
  defaultPaymentMethod: z.string().optional(),
  
  // Coerce string input to number safely
  discount: z.coerce.number().min(0).max(100).optional(),
  
  defaultLocationId: z.string().optional(),
  defaultPaymentTermsId: z.string().optional(),
  pricingSchemeId: z.string().min(1, "Pricing scheme is required"),
  taxingSchemeId: z.string().min(1, "Taxing scheme is required"),
  defaultSalesRepTeamMemberId: z.string().optional(),

  addresses: z.array(addressFormSchema).min(1, "At least one address is required")
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

// export interface CustomerInitialData extends Omit<CustomerMasterInput, 'addresses'> {
//   id: string;
//   addresses: {
//     id: string; // Prisma IDs usually include the DB ID
//     name: string;
//     address1: string;
//     address2?: string | null;
//     city: string;
//     state: string;
//     country: string;
//     postalCode: string;
//     isDefaultBilling: boolean;
//     isDefaultShipping: boolean;
//     addressType?: "Commercial" | "Residential" | null;
//   }[];
//   // Add other fields returned by your API that aren't in the form
//   updatedAt?: string;
// }




// schemas/address.schema.ts
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
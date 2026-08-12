import { z } from "zod";

export const addressSchema = z
  .object({
    address1: z.string().min(1, "Street address is required"),
    address2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State/Province is required"),
    country: z.string().min(1, "Country designation is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    addressType: z.string().optional().or(z.literal("")),
    remarks: z.string().optional().or(z.literal("")),
  })
  .optional()
  .nullable();

export const locationSchema = z.object({
  inflowId: z.string().optional(),
  name: z.string().min(1, "Location name is required (e.g., East Warehouse)"),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  address: addressSchema,
  sublocations: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Sublocation identifier label cannot be empty"),
    })
  ),
});

export type LocationInput = z.infer<typeof locationSchema>;


  // 📍 Nesting the 1:1 Location Address Relation
  // address: z.object({

  //   address1: z.string().min(1, "Street address is required"),
  //   address2: z.string().optional(),
  //   city: z.string().min(1, "City is required"),
  //   state: z.string().min(1, "State/Province is required"),
  //   country: z.string().min(1, "Country is required"),
  //   postalCode: z.string().min(1, "Zip/Postal code is required"),
  //   remarks: z.string().optional(),
  //   addressType: z.string().optional(),
  // }),

    // address1: z.string().min(1, "Street address is required").nullable().optional(),
    // address2: z.string().nullable().optional(),
    // city: z.string().min(1, "City is required").nullable().optional(),
    // state: z.string().nullable().optional(),
    // country: z.string().min(1, "Country designation is required").nullable().optional(),
    // postalCode: z.string().nullable().optional(),
    // remarks: z.string().nullable().optional(),

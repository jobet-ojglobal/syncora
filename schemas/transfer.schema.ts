import { z } from "zod";

// Helper for optional string fields that normalizes empty string / undefined to null
const optionalSublocation = z
  .string()
  .nullish()
  .transform((val) => (val === "" || val === undefined ? null : val));

export const transferOrderSchema = z
  .object({
    id: z.string().optional(),
    sourceLocationId: z.string().min(1, "Please choose a departure source terminal"),
    targetLocationId: z.string().min(1, "Please choose an arrival destination hub"),
    status: z.enum(["DRAFT", "PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"]),
    remarks: z.string().nullish(),

    lines: z
      .array(
        z.object({
          id: z.string().optional(),
          productId: z.string().min(1, "Must assign a product SKU for relocation"),
          sourceSublocationId: optionalSublocation,
          targetSublocationId: optionalSublocation,
          quantity: z.number().gt(0, "Transfer volume quantity must be greater than zero"),
        })
      )
      .min(1, "You must include at least one product transfer item line"),
  })
  .superRefine((data, ctx) => {
    // 1. Core Rule: Parent Location Match Prevention
    if (data.sourceLocationId && data.targetLocationId && data.sourceLocationId === data.targetLocationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The departure source location cannot match the arrival target location.",
        path: ["targetLocationId"],
      });
    }

    const seenPathways = new Set<string>();

    data.lines.forEach((line, index) => {
      const srcBin = line.sourceSublocationId || "BULK_FLOOR";
      const tgtBin = line.targetSublocationId || "BULK_FLOOR";

      // 2. Core Rule: Prevent identical source-to-target sublocation loops
      if (data.sourceLocationId === data.targetLocationId && srcBin === tgtBin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source bin and target bin cannot be identical within the same facility cluster.",
          path: ["lines", index, "targetSublocationId"],
        });
      }

      // 3. Core Rule: Deduplicate product rows traveling along identical nodes
      if (line.productId) {
        const pathwayToken = `${line.productId}::${srcBin}->${tgtBin}`;
        if (seenPathways.has(pathwayToken)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "This product item assignment pathway is already registered on another line.",
            path: ["lines", index, "productId"],
          });
        } else {
          seenPathways.add(pathwayToken);
        }
      }
    });
  });

// Important: Use z.input for React Hook Form types!
export type TransferOrderInput = z.input<typeof transferOrderSchema>;
export type TransferOrderOutput = z.output<typeof transferOrderSchema>;

// export const transferOrderSchema = z.object({
//   id: z.string().min(1),
//   transferNumber: z.string().min(1, "Transfer tracking sequence number is required"),
//   sourceLocationId: z.string().min(1, "Please choose a departure source terminal"),
//   targetLocationId: z.string().min(1, "Please choose an arrival destination hub"),
//   status: z.enum(["DRAFT", "PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"]),
//   remarks: z.string().nullable().optional(),

//   lines: z.array(
//     z.object({
//       id: z.string().optional(),
//       productId: z.string().min(1, "Must assign a product SKU for relocation"),
//       sourceSublocationId: z.string().transform(v => v === "" ? null : v).nullable().optional(),
//       targetSublocationId: z.string().transform(v => v === "" ? null : v).nullable().optional(),
//       quantity: z.number().gt(0, "Transfer volume quantity must be greater than zero"),
//     })
//   ).min(1, "You must include at least one product transfer item line"),
// }).superRefine((data, ctx) => {
//   // 1. Core Rule: Parent Location Match Prevention
//   if (data.sourceLocationId === data.targetLocationId) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       message: "The departure source location cannot match the arrival target location.",
//       path: ["targetLocationId"],
//     });
//   }

//   const seenPathways = new Set<string>();

//   data.lines.forEach((line, index) => {
//     const srcBin = line.sourceSublocationId || "BULK_FLOOR";
//     const tgtBin = line.targetSublocationId || "BULK_FLOOR";

//     // 2. Core Rule: Prevent identical source-to-target sublocation loops
//     if (data.sourceLocationId === data.targetLocationId && srcBin === tgtBin) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message: "Source bin and target bin cannot be identical within the same facility cluster.",
//         path: ["lines", index, "targetSublocationId"],
//       });
//     }

//     // 3. Core Rule: Deduplicate product rows traveling along identical nodes
//     if (line.productId) {
//       const pathwayToken = `${line.productId}::${srcBin}->${tgtBin}`;
//       if (seenPathways.has(pathwayToken)) {
//         ctx.addIssue({
//           code: z.ZodIssueCode.custom,
//           message: "This product item assignment pathway is already registered on another line.",
//           path: ["lines", index, "productId"],
//         });
//       } else {
//         seenPathways.add(pathwayToken);
//       }
//     }
//   });
// });

// export type TransferOrderInput = z.infer<typeof transferOrderSchema>;

// import { z } from "zod";

// export const transferOrderSchema = z.object({
//   id: z.string().optional(),
//   transferNumber: z.string().min(1, "Transfer tracking sequence number is required"),
//   sourceLocationId: z.string().min(1, "Please choose a departure source terminal"),
//   targetLocationId: z.string().min(1, "Please choose an arrival destination hub"),
//   status: z.enum(["DRAFT", "PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"]),
//   remarks: z.string().nullable().optional(),

//   lines: z.array(
//     z.object({
//       id: z.string().optional(),
//       productId: z.string().min(1, "Must assign a product SKU for relocation"),
//       sourceSublocationId: z.string().transform(v => v === "" ? null : v).nullable().optional(),
//       targetSublocationId: z.string().transform(v => v === "" ? null : v).nullable().optional(),
//       quantity: z.number().gt(0, "Transfer volume quantity must be greater than zero"),
//     })
//   ).min(1, "You must include at least one product transfer item line"),
// }).superRefine((data, ctx) => {
//   // 1. Core Rule: Parent Location Match Prevention
//   if (data.sourceLocationId === data.targetLocationId) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       message: "The departure source location cannot match the arrival target location.",
//       path: ["targetLocationId"],
//     });
//   }

//   // Set to keep track of uniquely identified directional movement pathways
//   const seenPathways = new Set<string>();

//   data.lines.forEach((line, index) => {
//     const srcBin = line.sourceSublocationId || "BULK_FLOOR";
//     const tgtBin = line.targetSublocationId || "BULK_FLOOR";

//     // 2. Core Rule: Prevent identical source-to-target sublocation loops
//     if (data.sourceLocationId === data.targetLocationId && srcBin === tgtBin) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message: "Source bin and target bin cannot be identical within the same facility cluster.",
//         path: ["lines", index, "targetSublocationId"],
//       });
//     }

//     // 3. Core Rule: Deduplicate product rows traveling along identical nodes
//     if (line.productId) {
//       const pathwayToken = `${line.productId}::${srcBin}->${tgtBin}`;
//       if (seenPathways.has(pathwayToken)) {
//         ctx.addIssue({
//           code: z.ZodIssueCode.custom,
//           message: "This product item assignment pathway is already registered on another line.",
//           path: ["lines", index, "productId"],
//         });
//       } else {
//         seenPathways.add(pathwayToken);
//       }
//     }
//   });
// });

// export type TransferOrderInput = z.infer<typeof transferOrderSchema>;

// // schemas/transfer.schema.ts
// import { z } from "zod";

// export const transferOrderSchema = z.object({
//   id: z.string().optional(), // Present during updates
//   transferNumber: z.string().min(1, "Transfer tracking sequence number is required"),
//   sourceLocationId: z.string().min(1, "Please choose a departure source terminal"),
//   targetLocationId: z.string().min(1, "Please choose an arrival destination hub"),
//   status: z.enum(["DRAFT", "PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"]),
//   remarks: z.string().nullable().optional(),

//   // 📦 1:Many Nested Order Line Items Matrix
//   lines: z.array(
//     z.object({
//       id: z.string().optional(),
//       productId: z.string().min(1, "Must assign a product SKU for relocation"),
//       sourceSublocationId: z.string().nullable().optional().or(z.literal("")),
//       targetSublocationId: z.string().nullable().optional().or(z.literal("")),
//       quantity: z.number().gt(0, "Transfer volume quantity must be greater than zero"),
//     })
//   ).min(1, "You must include at least one product transfer item line"),
// }).refine(
//   (data) => data.sourceLocationId !== data.targetLocationId,
//   {
//     message: "The departure source location cannot match the arrival target location.",
//     path: ["targetLocationId"], // Attaches the error boundary outline onto the target dropdown select
//   }
// );

// export type TransferOrderInput = z.infer<typeof transferOrderSchema>;
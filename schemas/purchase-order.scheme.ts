import { z } from "zod";

export const purchaseOrderPaymentStatusEnum = z.enum([
  "OWING",
  "UNPAID",
  "PAID",
  "PARTIAL",
  "QUOTE",
]);

export const purchaseOrderInventoryStatusEnum = z.enum([
  "STARTED",
  "UNFULFILLED",
  "FULFILLED",
  "QUOTE",
]);

export const purchaseOrderLineSchema = z.object({
  purchaseOrderLineId: z.string().optional(),
  productId: z.string().min(1, "Product selection is required"),
  vendorItemCode: z.string().optional(),
  description: z.string().optional(),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  quantity: z.number().min(0.0001, "Quantity must be greater than 0"),
  uom: z.string().optional().default("PCS"),
  discountValue: z.number().min(0),
  discountIsPercent: z.boolean(),
  subTotal: z.number(),
  tax1Rate: z.number().min(0),
  tax2Rate: z.number().min(0),
  taxCodeId: z.string().optional(),
});

export const purchaseOrderSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().min(1, "Order number is required"),
  vendorOrderNumber: z.string().optional(),
  vendorId: z.string().min(1, "Vendor is required"),
  locationId: z.string().optional(),
  assignedToTeamMemberId: z.string().optional(),
  approverTeamMemberId: z.string().optional(),
  currencyId: z.string().optional(),
  paymentTermsId: z.string().optional(),
  taxingSchemeId: z.string().optional(),

  paymentStatus: purchaseOrderPaymentStatusEnum,
  inventoryStatus: purchaseOrderInventoryStatusEnum,

  isCancelled: z.boolean(),
  isCompleted: z.boolean(),
  isQuote: z.boolean(),
  isTaxInclusive: z.boolean(),
  showShipping: z.boolean(),
  carrier: z.string().optional(),

  orderDate: z.string().optional(),
  dueDate: z.string().optional(),
  requestShipDate: z.string().optional(),

  contactName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  shipToCompanyName: z.string().optional(),

  subTotal: z.number(),
  freight: z.number().min(0),
  amountPaid: z.number().min(0),
  balance: z.number(),
  total: z.number(),
  exchangeRate: z.number().min(0.000001),

  orderRemarks: z.string().optional(),
  receiveRemarks: z.string().optional(),

  shipToAddress: z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),

  vendorAddress: z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),

  lines: z.array(purchaseOrderLineSchema).min(1, "At least one line item is required"),
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;
export type PurchaseOrderLineFormData = z.infer<typeof purchaseOrderLineSchema>;
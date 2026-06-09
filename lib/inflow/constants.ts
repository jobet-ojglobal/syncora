export type InflowEvent =
  | "customer.created"
  | "customer.updated"
  | "vendor.created"
  | "vendor.updated"
  | "purchaseOrder.created"
  | "purchaseOrder.updated"
  | "salesOrder.created"
  | "salesOrder.updated"
  | "product.created"
  | "product.updated";

export const INFLOW_EVENTS: InflowEvent[] = [
  "customer.created",
  "customer.updated",
  "vendor.created",
  "vendor.updated",
  "purchaseOrder.created",
  "purchaseOrder.updated",
  "salesOrder.created",
  "salesOrder.updated",
  "product.created",
  "product.updated",
];
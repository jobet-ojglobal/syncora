// lib/inflow/types/inflow.ts

export type InflowEvent =
  | "customer.created" | "customer.updated"
  | "vendor.created" | "vendor.updated"
  | "purchaseOrder.created" | "purchaseOrder.updated"
  | "salesOrder.created" | "salesOrder.updated"
  | "product.created" | "product.updated";

export const INFLOW_EVENTS: InflowEvent[] = [
  // "customer.created", 
  "customer.updated",
  // "vendor.created", 
  "vendor.updated",
  // "purchaseOrder.created", 
  "purchaseOrder.updated",
  // "salesOrder.created", 
  "salesOrder.updated",
  // "product.created", 
  "product.updated",
];

export interface InflowWebhook {
  webHookSubscriptionId: string;
  url: string;
  events: string[];
  secret?: string;
  consecutiveFailureCount: number;
  isDisabled: boolean;
  lastFailureMessage?: string;
}

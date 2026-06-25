// lib/partner/types/inflow.ts

export type InflowEvent =
  | "customer.created" | "customer.updated"
  | "salesOrder.created" | "salesOrder.updated";

export const INFLOW_EVENTS: InflowEvent[] = [
  "customer.created", "customer.updated",
  "salesOrder.created", "salesOrder.updated",
];

export interface PartnerWebhook {
  webHookSubscriptionId: string;
  url: string;
  events: string[];
  secret?: string;
  consecutiveFailureCount: number;
  isDisabled: boolean;
  lastFailureMessage?: string;
}

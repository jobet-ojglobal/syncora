// lib/partner/types/inflow.ts

export type InflowEvent =
  "customer" 
  | "salesOrder" ;

export const INFLOW_EVENTS: InflowEvent[] = [
  "customer", "salesOrder",
];

export interface LocationWebhook {
  webHookSubscriptionId: string;
  url: string;
  events: string[];
  secret?: string;
  consecutiveFailureCount: number;
  isDisabled: boolean;
  lastFailureMessage?: string;
}

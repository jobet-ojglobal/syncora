// lib/partner/types/inflow.ts

export type InflowEvent =
  "customer" | "salesOrder" | "taxingScheme" | "pricingScheme" | "adjustmentStock" |
   "customerLocal" | "salesOrderLocal" | "taxingSchemeLocal" | "pricingSchemeLocal" | "adjustmentStockLocal" | "categoryLocal" | "productLocal";

export const INFLOW_EVENTS: InflowEvent[] = [
  "customer", "salesOrder", "taxingScheme", "pricingScheme", "adjustmentStock", 
  "customerLocal", "salesOrderLocal", "taxingSchemeLocal", "pricingSchemeLocal", "adjustmentStockLocal", "categoryLocal", "productLocal"
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

// lib/partner/types/inflow.ts

export type InflowEvent =
  "customer" | "salesOrder" | "taxingScheme" | "pricingScheme" | "currency" | "adjustmentStock" |
   "customerLocal" | "salesOrderLocal" | "taxingSchemeLocal" | "pricingSchemeLocal" | "currencyLocal" | "adjustmentStockLocal" | "categoryLocal";

export const INFLOW_EVENTS: InflowEvent[] = [
  "customer", "salesOrder", "taxingScheme", "pricingScheme", "currency", "adjustmentStock", 
  "customerLocal", "salesOrderLocal", "taxingSchemeLocal", "pricingSchemeLocal", "currencyLocal", "adjustmentStockLocal", "categoryLocal"
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

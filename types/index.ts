
// lib/inflow/types/status.ts
export type WebhookStatus = "online" | "degraded" | "offline" | "disconnected";

export interface WebhookDisplayData {
  id?: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  consecutiveFailureCount: number;
  lastFailureMessage?: string | null;
}
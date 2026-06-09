import { 
  Prisma,
} from "@/generated/prisma/client";

// 1. Move the literal array here
export const INFLOW_EVENTS = [
  "product.created",
  "product.updated",
  "stock.adjusted"
] as const;

// 2. Define the type here
export type InflowEvent = typeof INFLOW_EVENTS[number];

export type WebhookProvider = "inflow";

export interface WebhookSubscription {
  id: string;
  provider: WebhookProvider;
  remoteId: string | null;
  url: string;
  event: string;
  active: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface InflowWebhook {
  id: string;
  url: string;

  secret: string | null;
  events: Prisma.JsonValue;

  isDisabled: boolean;
  consecutiveFailureCount: number;
  lastFailureMessage: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface InflowIntegration {
  id: string;

  webhookId: string | null;
  webhookUrl: string | null;
  secret: string | null;

  isConnected: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;

  provider: string;
  eventType: string;

  payload: Prisma.JsonValue;

  processed: boolean;
  receivedAt: Date;
}

export interface InflowWebhookEvent {
  id: string;

  eventType: string;
  payload: Prisma.JsonValue;

  processed: boolean;
  receivedAt: Date;
}

export interface CreateInflowWebhookDto {
  url: string;
  secret?: string;
  events: string[];
}

export interface UpdateInflowWebhookDto {
  url?: string;
  secret?: string;
  events?: string[];
  isDisabled?: boolean;
}

export interface ReceiveInflowWebhookDto {
  eventType: string;
  payload: Prisma.JsonValue;
}

export type CreateInflowWebhookInput =
  Prisma.InflowWebhookCreateInput;
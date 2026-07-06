// lib/validations/webhook.ts
import * as z from "zod";

export const webhookSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
  secret: z.string().min(16, { message: "Secret should be at least 16 characters for security." }).optional().or(z.literal("")),
  events: z.array(z.string()).min(1, { message: "Select at least one event to subscribe to." }),
});

export type WebhookFormValues = z.infer<typeof webhookSchema>;
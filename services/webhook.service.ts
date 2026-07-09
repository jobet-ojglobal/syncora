'use server only';

import { prisma } from "@/lib/prisma";

export class WebhookService {
  static async getLocationWebhookURLs(event: string) {
    // 1. Fetch all active webhooks from the database
    const webhooks = await prisma.locationWebhook.findMany({
      where: {
        isDisabled: false,
      },
      select: {
        locationId: true,
        events: true, // Make sure to select the JSON field
        location: {
          select: {
            name: true,
            url: true
          },
        },
      },
    });

    // 2. Filter the array in-memory using native JavaScript
    return webhooks.filter((webhook) => {
      // Cast events to an array of strings safely
      const eventArray = webhook.events as string[];
      
      // Ensure it's an array and contains the target event token
      return Array.isArray(eventArray) && eventArray.includes(event);
    });
  }

  static async getCloudWebhookURL(event: string) {
    const webhook = await prisma.inflowWebhook.findFirst({
      where: {
        isDisabled: false,
      },
      select: {
        url: true,
        events: true,
      },
    });

    if (!webhook) return null;

    const eventArray = webhook.events as string[];

    return Array.isArray(eventArray) && eventArray.includes(event)
      ? webhook.url
      : null;
  }
}
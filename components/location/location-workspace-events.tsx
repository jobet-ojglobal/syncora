"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { INFLOW_EVENTS } from "@/lib/locations/types/webhook.type";

interface WebhookEventsTabProps {
  locationId: string;
  webhook: {
    webHookSubscriptionId: string;
    events: string[];
    [key: string]: any;
  } | null;
  /** Pass SWR's mutate function or a parent setter to update the webhook state */
  onWebhookUpdate: (updatedWebhook: any) => void;
}

export const WebhookEventsTab = ({
  locationId,
  webhook,
  onWebhookUpdate,
}: WebhookEventsTabProps) => {
  const [isPending, startTransition] = useTransition();

  const handleToggleEvent = (event: string, checked: boolean) => {
    if (!webhook) return;

    // 1. Calculate new events array
    const previousEvents = [...(webhook.events || [])];
    const updatedEvents = checked
      ? [...previousEvents, event]
      : previousEvents.filter((e) => e !== event);

    // 2. Optimistically update local state immediately
    onWebhookUpdate({
      ...webhook,
      events: updatedEvents,
    });

    // 3. Persist changes to server
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/webhooks/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_events",
            locationId,
            events: updatedEvents,
          }),
        });

        const data = await res.json();

        if (data.success) {
          onWebhookUpdate(data.webhook);
          toast.success(
            `${checked ? "Subscribed to" : "Unsubscribed from"} ${event}`
          );
        } else {
          // Revert on API error
          onWebhookUpdate({ ...webhook, events: previousEvents });
          toast.error(data.error || "Failed to update event subscriptions.");
        }
      } catch {
        // Revert on network failure
        onWebhookUpdate({ ...webhook, events: previousEvents });
        toast.error("Network error while updating event subscription.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscribed Topics</CardTitle>
        <CardDescription>
          Toggle the topics you want this location to report to your system context hook payload.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {INFLOW_EVENTS.map((event) => {
          const isSubscribed = webhook?.events?.includes(event) ?? false;
          const entityName = event.split(".")[0] || "resource";

          return (
            <div
              key={event}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="space-y-0.5">
                <span className="text-sm font-medium font-mono">{event}</span>
                <p className="text-xs text-muted-foreground">
                  Triggers whenever a {entityName} is modified.
                </p>
              </div>
              <Switch
                checked={isSubscribed}
                disabled={isPending || !webhook}
                onCheckedChange={(checked) => handleToggleEvent(event, checked)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
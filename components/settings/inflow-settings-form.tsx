"use client";

import { useState, useTransition } from "react";
import { connectIntegration, disconnectIntegration, triggerManualSync } from "@/actions/inflow";
import { INFLOW_EVENTS, InflowEvent } from "@/lib/inflow/services/webhook.service";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner"; // Switched to shadcn sonner
import { CheckCircle2, RefreshCw, XCircle, AlertTriangle, Radio } from "lucide-react";
import { InflowIntegration, InflowWebhook } from "@/generated/prisma/client";

interface Props {
  integration: InflowIntegration;
  syncedWebhooks: InflowWebhook[];
}

export function InflowSettingsForm({ integration, syncedWebhooks }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();

  const handleConnectionToggle = async (checked: boolean) => {
    startTransition(async () => {
      if (checked) {
        const res = await connectIntegration();
        if (res.success) {
          toast.success("Connected", {
            description: "Successfully bound system webhook pipelines.",
          });
        } else {
          toast.error("Connection Failed", {
            description: res.error,
          });
        }
      } else {
        const res = await disconnectIntegration(integration.webhookId);
        if (res.success) {
          toast.success("Disconnected", {
            description: "Webhooks torn down cleanly.",
          });
        } else {
          toast.error("Disconnection Failed", {
            description: res.error,
          });
        }
      }
    });
  };

  const handleManualSync = () => {
    startSyncTransition(async () => {
      const res = await triggerManualSync();
      if (res.success) {
        toast.success("Sync Complete", {
          description: "Local database tables matched with upstream.",
        });
      } else {
        toast.error("Sync Failed", {
          description: res.error,
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Active Pipeline Toggle Status Card */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/40">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">Connection Status</Label>
            {integration.isConnected ? (
              <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3.5 w-3.5" /> Offline
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {integration.isConnected 
              ? `Listening on routing terminal: ${integration.webhookUrl}`
              : "No active hooks deployed. Turn on status to spin up automated pipelines."}
          </p>
        </div>
        <Switch 
          disabled={isPending}
          checked={integration.isConnected}
          onCheckedChange={handleConnectionToggle}
        />
      </div>

      {integration.isConnected && (
        <>
          {/* Operations Toolbar */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Synced Subscriptions Pipeline
            </h4>
            <Button 
              size="sm" 
              variant="outline" 
              disabled={isSyncing} 
              onClick={handleManualSync}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              Refresh Webhook States
            </Button>
          </div>

          {/* Active Webhook Registry Subgrid */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Subscribed Targets</TableHead>
                  <TableHead>Status Indicators</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncedWebhooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      No deployed webhooks pulled from the directory. Click refresh to query upstream.
                    </TableCell>
                  </TableRow>
                ) : (
                  syncedWebhooks.map((hook) => {
                    const activeEvents = hook.events as InflowEvent[];
                    return (
                      <TableRow key={hook.id}>
                        <TableCell className="font-mono text-xs max-w-[180px] truncate">
                          {hook.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {INFLOW_EVENTS.map((event) => {
                              const isSubbed = activeEvents.includes(event);
                              return (
                                <Badge 
                                  key={event} 
                                  variant={isSubbed ? "default" : "outline"}
                                  className={`text-[10px] px-1.5 py-0.5 ${
                                    isSubbed ? "bg-indigo-600/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-600/10" : "opacity-40"
                                  }`}
                                >
                                  {event}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {hook.isDisabled ? (
                              <div className="flex items-center gap-1.5 text-xs text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5" /> Broken Pipeline
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                                <Radio className="h-3 w-3 animate-pulse" /> Live Polling
                              </div>
                            )}
                            {hook.consecutiveFailureCount > 0 && (
                              <span className="text-[11px] text-amber-500 font-medium">
                                Failures: {hook.consecutiveFailureCount}/10
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
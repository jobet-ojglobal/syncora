"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, CloudLightning, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

type WebhookStatus = "online" | "degraded" | "offline" | "disconnected";

interface WebhookInfo {
  id?: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  consecutiveFailureCount: number;
  lastFailureMessage?: string | null;
}

const statusConfig: Record<WebhookStatus, { label: string; variant: string; icon: React.ComponentType<any> }> = {
  online: { label: "Connected & Healthy", variant: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  degraded: { label: "Degraded Performance", variant: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: CloudLightning },
  offline: { label: "Disabled / Dead Target", variant: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  disconnected: { label: "Disconnected", variant: "bg-muted text-muted-foreground border-transparent", icon: AlertCircle },
};

export function InflowWebhookStatusCard() {
  const [data, setData] = React.useState<WebhookInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mutating, setMutating] = React.useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/inflow/status");
      const json = await res.json();
      if (json.success) setData(json.webhook);
    } catch {
      toast.error("Failed to download diagnostic status data.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnection = async (action: "connect" | "disconnect") => {
    setMutating(true);
    try {
      const res = await fetch("/api/settings/inflow/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, webhookId: data?.id }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(action === "connect" ? "Webhook successfully connected!" : "Webhook integration disabled.");
        fetchStatus();
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      toast.error(err.message || "An action processing fault occurred.");
    } finally {
      setMutating(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl animate-pulse">
        <div className="h-40 bg-muted rounded-xl" />
      </Card>
    );
  }

  const currentStatus = data?.status ?? "disconnected";
  const config = statusConfig[currentStatus];
  const StatusIcon = config.icon;

  return (
    <Card className="w-full max-w-2xl shadow-sm border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1.5">
          <CardTitle>InFlow Engine Webhook</CardTitle>
          <CardDescription>Synchronize remote store parameters and events</CardDescription>
        </div>
        
        {/* Connection Status Badge Row */}
        <div className="flex items-center gap-2">
          {currentStatus === "online" && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
          <Badge variant="outline" className={cn("px-2.5 py-1 font-medium gap-1.5 flex items-center", config.variant)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        <div className="rounded-md bg-muted/50 p-3 font-mono text-xs break-all border">
          <span className="text-muted-foreground select-none">Target URL: </span>
          {data?.url}
        </div>

        {currentStatus !== "disconnected" && (
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Subscriptions</span>
            <div className="flex flex-wrap gap-1.5">
              {data?.events.map((evt) => (
                <Badge key={evt} variant="secondary" className="font-mono text-[11px]">
                  {evt}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {currentStatus === "degraded" && data?.lastFailureMessage && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-amber-700 dark:text-amber-400 text-xs space-y-1">
            <p className="font-semibold">Warning: Endpoint experiencing delivery pressure</p>
            <p className="font-mono">Consecutive drops: {data.consecutiveFailureCount} | Reason: {data.lastFailureMessage}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t bg-muted/20 px-6 py-4 rounded-b-xl">
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={mutating}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-2", mutating && "animate-spin")} />
          Sync Diagnostics
        </Button>

        {currentStatus === "disconnected" ? (
          <Button size="sm" onClick={() => handleConnection("connect")} disabled={mutating}>
            Establish Connection
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={() => handleConnection("disconnect")} disabled={mutating}>
            Disconnect Webhook
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
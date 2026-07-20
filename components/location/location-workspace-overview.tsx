"use client";

import { useState, useEffect, useTransition } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncButtonPreviewOptions } from "./sync-button-preview";

interface LocationWorkspaceOverviewProps {
  selectedLocationInflowId: string;
}

// Fetcher helper for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to load webhook configuration state.");
  }
  return data;
};

export function LocationWorkspaceOverview({
  selectedLocationInflowId,
}: LocationWorkspaceOverviewProps) {
  const [pending, startTransition] = useTransition();

  // Track browser offline/online status
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof window !== "undefined" ? window.navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Use SWR for declarative data fetching, polling, and auto-revalidation
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    selectedLocationInflowId
      ? `/api/settings/webhooks/locations?locationId=${selectedLocationInflowId}`
      : null,
    fetcher,
    {
      refreshInterval: isBrowserOnline ? 10000 : 0, // Poll every 10 seconds if online
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onError: () => {
        toast.error("Could not read configuration state.");
      },
    }
  );

  const webhook = data?.webhook || null;
  const hasUrl = Boolean(data?.hasUrl);

  // Connection Handlers
  const handleConnect = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/webhooks/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "connect", locationId: selectedLocationInflowId }),
        });
        const result = await res.json();
        if (result.success) {
          toast.success("Webhook Workspace active for this location.");
          mutate(); // Trigger revalidation to pull latest server state
        } else {
          toast.error(result.error || "Failed to connect local app.");
        }
      } catch {
        toast.error("Failed to connect local app.");
      }
    });
  };

  const handleDisconnect = () => {
    if (!webhook) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/webhooks/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "disconnect",
            locationId: selectedLocationInflowId,
            webhookId: webhook.webHookSubscriptionId,
          }),
        });
        const result = await res.json();
        if (result.success) {
          toast.success("Workspace location channel disabled.");
          mutate(); // Optimistically or explicitly trigger revalidation
        } else {
          toast.error(result.error || "Failed to disconnect channel.");
        }
      } catch {
        toast.error("Failed to disconnect channel.");
      }
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading workspace configuration...</div>;
  }

  // Determine active status configurations
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let badgeLabel = "Offline";

  if (!isBrowserOnline) {
    badgeVariant = "destructive";
    badgeLabel = "Network Offline";
  } else if (webhook) {
    badgeVariant = "default";
    badgeLabel = isValidating ? "Syncing..." : "Active Stream";
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Main Webhook Controller Card */}
      <Card className="md:col-span-2 flex flex-col justify-between">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Live Event Stream</CardTitle>
            <CardDescription>Remote validation configuration settings</CardDescription>
          </div>

          {/* Dynamic real-time badge indicator */}
          <div className="flex items-center gap-2">
            {webhook && isBrowserOnline && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            <Badge variant={badgeVariant}>{badgeLabel}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm pt-4 flex-1 flex justify-center items-center">
          {!isBrowserOnline ? (
            <div className="text-sm py-4 text-center space-y-1">
              <p className="text-destructive font-semibold">Local Environment Disconnected</p>
              <p className="text-muted-foreground max-w-sm mx-auto text-xs">
                Your internet connection dropped. Re-establishing channel pipeline as soon as connection recovers.
              </p>
            </div>
          ) : webhook ? (
            <div className="w-full space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium text-muted-foreground">Endpoint Target:</span>
                <span className="font-mono text-xs max-w-[250px] truncate">{webhook.url}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium text-muted-foreground">Subscription ID:</span>
                <span className="font-mono text-xs">{webhook.webHookSubscriptionId}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium text-muted-foreground">Active Subscriptions:</span>
                <span className="font-semibold">{webhook.events?.length || 0} event types</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Failure Status Counter:</span>
                <span className={webhook.consecutiveFailureCount > 0 ? "text-destructive font-bold" : "text-emerald-600"}>
                  {webhook.consecutiveFailureCount} consecutive drops
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm py-4 text-center space-y-1">
              <p className="text-destructive font-semibold">
                {!hasUrl ? "Integration API URL Missing" : "Connection Stream Offline"}
              </p>
              <p className="text-muted-foreground max-w-sm mx-auto text-xs">
                {!hasUrl
                  ? "Please configure your location's partner base URL endpoint settings prior to enabling automation pipelines."
                  : "The partner workspace link is broken or remote webhook registration was removed on the destination server."}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t p-4 bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isValidating || !isBrowserOnline}
          >
            {isValidating ? "Refreshing..." : "Refresh State"}
          </Button>

          {webhook ? (
            <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={pending}>
              Disconnect Instance
            </Button>
          ) : hasUrl ? (
            <Button size="sm" onClick={handleConnect} disabled={pending}>
              Connect Local App
            </Button>
          ) : (
            <Button size="sm" disabled>
              Awaiting Configuration
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* BATCH ENGINE SYNC UTILITIES SIDEBAR */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Batch Diagnostics</CardTitle>
          <CardDescription>Force historical inventory execution sweeps manually.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 max-h-[300px] overflow-y-auto">
          <SyncButtonPreviewOptions source="categories_local" title="Categories" locationId={selectedLocationInflowId} isDisabled={!webhook} />
          <SyncButtonPreviewOptions source="currencies_local" title="Currency" locationId={selectedLocationInflowId} isDisabled={!webhook} />
          <SyncButtonPreviewOptions source="taxing_schemes_local" title="Taxing Schemes" locationId={selectedLocationInflowId} isDisabled={!webhook} />
          <SyncButtonPreviewOptions source="pricing_schemes_local" title="Pricing Schemes" locationId={selectedLocationInflowId} isDisabled={!webhook} />
          <SyncButtonPreviewOptions source="payment_terms_local" title="Payment Terms" locationId={selectedLocationInflowId} isDisabled={!webhook} />
          <SyncButtonPreviewOptions source="customers_local" title="Customers" locationId={selectedLocationInflowId} isDisabled={!webhook} />
          <SyncButtonPreviewOptions source="locations_local" title="Locations" locationId={selectedLocationInflowId} isDisabled={!webhook} />
        </CardContent>
      </Card>
    </div>
  );
}
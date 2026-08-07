"use client";

import { useState, useEffect, useTransition } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { toast } from "sonner";

import { INFLOW_EVENTS } from "@/lib/locations/types/webhook.type";
import { SyncButtonPreviewOptions } from "./sync-button-preview-paginated";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { FilterX, RefreshCw } from "lucide-react";
import { DataTablePagination } from "../shared/data-table-pagination";

interface LocationWebhookWorkspaceProps {
  selectedLocationInflowId: string;
}

// Fetcher utility for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch response data");
  }
  return res.json();
};

export const LocationWebhookWorkspace = ({ selectedLocationInflowId }: LocationWebhookWorkspaceProps) => {
  const [pending, startTransition] = useTransition();

  // Track browser connectivity for UI warnings
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof window !== "undefined" ? window.navigator.onLine : true
  );

  // Filtering and Paginated Matrix States
  const [selectedEvent, setSelectedEvent] = useState<string>("ALL");
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  // --- SWR: Status / Webhook Configuration ---
  const statusEndpoint = selectedLocationInflowId
    ? `/api/settings/webhooks/locations?locationId=${selectedLocationInflowId}`
    : null;

  const {
    data: statusData,
    isLoading: loadingStatus,
    isValidating: isRefreshingStatus,
    mutate: mutateStatus,
  } = useSWR(statusEndpoint, fetcher, {
    refreshInterval: 10000, // Background polling every 10s
    revalidateOnReconnect: true,
    onError: () => {
      toast.error("Could not read configuration state.");
    },
  });

  const webhook = statusData?.success ? statusData.webhook : null;
  const hasUrl = statusData?.success ? statusData.hasUrl : false;

  // --- SWR: Activity Logs ---
  const eventParam = selectedEvent === "ALL" ? "" : selectedEvent;
  const logsEndpoint = selectedLocationInflowId
    ? `/api/settings/webhooks/locations/logs?locationId=${selectedLocationInflowId}&eventType=${eventParam}&page=${pageIndex}&limit=${PAGE_SIZE}`
    : null;

  const {
    data: logsData,
    isLoading: loadingLogs,
    isValidating: isRefreshingLogs,
    mutate: mutateLogs,
  } = useSWR(logsEndpoint, fetcher, {
    revalidateOnFocus: true,
    onError: () => {
      toast.error("Failed to load audit logs matching dynamic context routing criteria.");
    },
  });

  const logs = logsData?.success ? logsData.data || [] : [];
  const totalRecords = logsData?.success ? logsData.totalRecords || 0 : 0;
  const pageCount = logsData?.success ? logsData.pageCount || 0 : 0;

  // Browser Offline/Online Listeners
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

  // Handlers using SWR mutate triggers
  const handleConnect = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/webhooks/locations", {
          method: "POST",
          body: JSON.stringify({ action: "connect", locationId: selectedLocationInflowId }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Webhook Workspace active for this location.");
          mutateStatus(); // Revalidate status cache
        }
      } catch {
        toast.error("Failed to connect location workspace.");
      }
    });
  };

  const handleDisconnect = () => {
    if (!webhook) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/webhooks/locations", {
          method: "POST",
          body: JSON.stringify({
            action: "disconnect",
            locationId: selectedLocationInflowId,
            webhookId: webhook.webHookSubscriptionId,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Workspace location channel disabled.");
          mutateStatus(); // Revalidate status cache
        }
      } catch {
        toast.error("Failed to disconnect workspace channel.");
      }
    });
  };

  const handleToggleEvent = (event: string, checked: boolean) => {
    if (!webhook) return;
    let updatedEvents = [...webhook.events];
    if (checked) {
      updatedEvents.push(event);
    } else {
      updatedEvents = updatedEvents.filter((e) => e !== event);
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/webhooks/locations", {
          method: "POST",
          body: JSON.stringify({
            action: "update_events",
            locationId: selectedLocationInflowId,
            events: updatedEvents,
          }),
        });
        const data = await res.json();
        if (data.success) {
          mutateStatus(); // Refresh webhook configuration
        }
      } catch {
        toast.error("Failed to update event subscriptions.");
      }
    });
  };

  const handleFilterChange = (value: string) => {
    setSelectedEvent(value);
    setPageIndex(0);
  };

  if (loadingStatus && !statusData) {
    return <div className="p-8 text-center text-sm">Loading config...</div>;
  }

  // Determine active status badge UI
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let badgeLabel = "Offline";

  if (!isBrowserOnline) {
    badgeVariant = "destructive";
    badgeLabel = "Network Offline";
  } else if (webhook) {
    badgeVariant = "default";
    badgeLabel = isRefreshingStatus ? "Syncing..." : "Active Stream";
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webhook Integration</h1>
        <p className="text-muted-foreground">Manage webhook automation.</p>
      </div>

      <Tabs
        defaultValue="overview"
        className="space-y-4"
        onValueChange={(value) => {
          if (value === "logs") {
            mutateLogs();
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="overview">Overview & Health</TabsTrigger>
          <TabsTrigger value="events">Event Subscriptions</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Main Webhook Controller Card */}
            <Card className="md:col-span-2">
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

              <CardContent className="space-y-3 text-sm pt-4 h-full flex justify-center items-center">
                {!isBrowserOnline ? (
                  <div className="text-sm py-4 text-center space-y-1">
                    <p className="text-destructive font-semibold">Local Environment Disconnected</p>
                    <p className="text-muted-foreground max-w-sm mx-auto text-xs">
                      Your internet connection dropped. Re-establishing channel pipeline as soon as connection recovers.
                    </p>
                  </div>
                ) : webhook ? (
                  <div className="w-full">
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
                      <span
                        className={
                          webhook.consecutiveFailureCount > 0 ? "text-destructive font-bold" : "text-emerald-600"
                        }
                      >
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
                  onClick={() => mutateStatus()}
                  disabled={isRefreshingStatus || !isBrowserOnline}
                >
                  {isRefreshingStatus ? "Refreshing..." : "Refresh State"}
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
                <SyncButtonPreviewOptions source="products_local" title="Products" locationId={selectedLocationInflowId} isDisabled={!webhook} />
                <SyncButtonPreviewOptions source="inventory_lines_local" title="Inventory Lines" locationId={selectedLocationInflowId} isDisabled={!webhook} />
                <SyncButtonPreviewOptions source="payment_terms_local" title="Payment Terms" locationId={selectedLocationInflowId} isDisabled={!webhook} />
                <SyncButtonPreviewOptions source="customers_local" title="Customers" locationId={selectedLocationInflowId} isDisabled={!webhook} />
                <SyncButtonPreviewOptions source="locations_local" title="Locations" locationId={selectedLocationInflowId} isDisabled={!webhook} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Subscribed Topics</CardTitle>
              <CardDescription>
                Toggle the topics you want location to report to your system context hook payload.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {INFLOW_EVENTS.map((event) => {
                const isSubscribed = webhook?.events?.includes(event) ?? false;
                return (
                  <div key={event} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium font-mono">{event}</span>
                      <p className="text-xs text-muted-foreground">
                        Triggers whenever a {event.split(".")[0]} is modified.
                      </p>
                    </div>
                    <Switch
                      checked={isSubscribed}
                      disabled={pending || !webhook}
                      onCheckedChange={(checked) => handleToggleEvent(event, checked)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 text-xs">
          <Card className="shadow-2xs border-border/60">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 border-b">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  Recent Activity Log
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Live processing timeline evaluating structural inbound mutations received from your local hardware hook configurations channels.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 pt-1 sm:pt-0">
                <Select value={selectedEvent} onValueChange={handleFilterChange}>
                  <SelectTrigger className="h-8 w-[190px] text-[11px] font-medium bg-background">
                    <SelectValue placeholder="All Incoming Topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">
                      All Event System Operations
                    </SelectItem>
                    {INFLOW_EVENTS.map((event) => (
                      <SelectItem key={event} value={event} className="text-xs font-mono">
                        {event}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutateLogs()}
                  disabled={loadingLogs || isRefreshingLogs}
                  className="h-8 gap-1.5 font-medium text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs || isRefreshingLogs ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-5">
              {loadingLogs && logs.length === 0 ? (
                <div className="text-center py-16 text-xs text-muted-foreground italic animate-pulse">
                  Querying database indexes and aggregating location historical runtime telemetry lines...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-14 border border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/10">
                  <FilterX className="w-8 h-8 text-muted-foreground/40 stroke-[1.5]" />
                  <p className="text-xs font-medium">No event records match your parameters choice filters boundaries.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-3xs">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase border-b">
                          <th className="p-3 pl-4">Event Topic Context</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Received Timestamp</th>
                          <th className="p-3 text-right pr-4">Payload Inspection</th>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs font-medium">
                        {logs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-muted/5 transition-colors border-b last:border-b-0">
                            <td className="p-3 pl-4 font-mono text-[11px] font-semibold text-foreground">
                              {log.eventType}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={log.processed ? "default" : "secondary"}
                                className={`text-[9px] font-bold tracking-wide rounded-sm border px-1.5 py-0 ${
                                  log.processed
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10"
                                }`}
                              >
                                {log.processed ? "Processed" : "Logged"}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(log.receivedAt).toLocaleString()}
                            </td>
                            <td className="p-3 text-right pr-4">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-medium shadow-3xs">
                                    Inspect JSON
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col text-xs">
                                  <DialogHeader className="border-b pb-3">
                                    <DialogTitle className="font-mono text-sm tracking-tight text-foreground flex items-center gap-2">
                                      <span>Inspector Log Context:</span>
                                      <span className="text-primary font-bold">{log.eventType}</span>
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="bg-muted/60 border mt-2 p-4 rounded-xl overflow-y-auto font-mono text-xs text-foreground/95 flex-1 select-all whitespace-pre-wrap shadow-inner max-h-[500px]">
                                    {JSON.stringify(log.payload, null, 2)}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </td>
                          </tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <DataTablePagination
                    pageIndex={pageIndex}
                    pageSize={PAGE_SIZE}
                    pageCount={pageCount}
                    totalRecords={totalRecords}
                    loading={loadingLogs || isRefreshingLogs}
                    onPageChange={(nextIndex: number) => setPageIndex(nextIndex)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
 
export default LocationWebhookWorkspace;
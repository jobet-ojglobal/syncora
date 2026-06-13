"use client";

import { useState, useEffect, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";
import { INFLOW_EVENTS } from "@/lib/inflow/types/inflow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { SyncButton } from "../shared/sync-button";

const InflowWorkspace = () => {
  const [pending, startTransition] = useTransition();
  const [webhook, setWebhook] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/settings/inflow/logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch {
      toast.error("Failed to load audit logs.");
    } finally {
      setLoadingLogs(false);
    }
  };

  const refreshStatus = async () => {
    try {
      const res = await fetch("/api/settings/inflow");
      const data = await res.json();
      if (data.success) setWebhook(data.webhook);
    } catch {
      toast.error("Could not read data from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);
  
  const handleConnect = () => {
    startTransition(async () => {
      const res = await fetch("/api/settings/inflow", {
        method: "POST",
        body: JSON.stringify({ action: "connect" }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhook(data.webhook);
        toast.success( "inFlow Workspace active.");
      }
    });
  };

  const handleDisconnect = () => {
    if (!webhook) return;
    startTransition(async () => {
      const res = await fetch("/api/settings/inflow", {
        method: "POST",
        body: JSON.stringify({ action: "disconnect", webhookId: webhook.webHookSubscriptionId }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhook(null);
        toast.success("Workspace disabled.");
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
      const res = await fetch("/api/settings/inflow", {
        method: "POST",
        body: JSON.stringify({ action: "update_events", events: updatedEvents }),
      });
      const data = await res.json();
      if (data.success) setWebhook(data.webhook);
    });
  };

  if (loading) return <div className="p-8 text-center text-sm">Loading config...</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">inFlow Cloud Integration</h1>
        <p className="text-muted-foreground">Manage inventory syncing and webhook automation.</p>
      </div>

      <Tabs 
        defaultValue="overview" 
        className="space-y-4" 
        onValueChange={(value) => {
          if (value === "logs") {
            fetchLogs();
          }
        }}>
        <TabsList>
          <TabsTrigger value="overview">Overview & Health</TabsTrigger>
          <TabsTrigger value="events">Event Subscriptions</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" >
        
          <div className="grid gap-6 md:grid-cols-3">
              
            {/* Main Webhook Controller Card */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Live Event Stream</CardTitle>
                  <CardDescription>Remote validation configuration settings</CardDescription>
                </div>
                <Badge variant={webhook ? "default" : "secondary"}>
                  {webhook ? "Active Stream" : "Offline"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pt-4">
                {webhook ? (
                  <>
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium text-muted-foreground">Endpoint Target:</span>
                      <span className="font-mono text-xs max-w-[250px] truncate">{webhook.url}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium text-muted-foreground">Subscription ID:</span>
                      <span className="font-mono text-xs ">{webhook.webHookSubscriptionId}</span>
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
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Webhooks are currently uninitialized. Connect your instance to subscribe to real-time mutation events.
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4 bg-muted/30">
                <Button variant="outline" size="sm" onClick={refreshStatus}>Refresh State</Button>
                {webhook ? (
                  <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={pending}>Disconnect Instance</Button>
                ) : (
                  <Button size="sm" onClick={handleConnect} disabled={pending}>Connect inFlow Cloud</Button>
                )}
              </CardFooter>
            </Card>

            {/* BATCH ENGINE SYNC UTILITIES SIDEBAR */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Batch Diagnostics</CardTitle>
                <CardDescription>Force historical inventory execution sweeps manually.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <SyncButton source="products" title="Sync Entire Catalog" />
                <SyncButton source="categories" title="Sync Categories" />
                <SyncButton source="inventory" title="Sync Inventory" />
                <SyncButton source="customers" title="Sync All Customers" />
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Subscribed Topics</CardTitle>
              <CardDescription>
                Toggle the topics you want inFlow to report to your system context hook payload.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {INFLOW_EVENTS.map((event) => {
                const isSubscribed = webhook?.events.includes(event) ?? false;
                return (
                  <div key={event} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium font-mono">{event}</span>
                      <p className="text-xs text-muted-foreground">
                        Triggers whenever a {event.split('.')[0]} is modified.
                      </p>
                    </div>
                    <Switch
                      checked={isSubscribed}
                      disabled={pending}
                      onCheckedChange={(checked) => handleToggleEvent(event, checked)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Recent Activity Log</CardTitle>
                <CardDescription>The last 50 events received from your inFlow Cloud hooks hook context.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loadingLogs}>
                {loadingLogs ? "Refreshing..." : "Refresh Logs"}
              </Button>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No recent webhook events detected. Try performing an action inside your inFlow workspace dashboard.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Topic</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Received Timestamp</TableHead>
                        <TableHead className="text-right">Payload Inspection</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs font-medium text-foreground">
                            {log.eventType}
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.processed ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                              {log.processed ? "Processed" : "Logged"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(log.receivedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                  Inspect JSON
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                                <DialogHeader>
                                  <DialogTitle className="font-mono text-sm">{log.eventType}</DialogTitle>
                                </DialogHeader>
                                <div className="bg-muted p-4 rounded-md overflow-y-auto font-mono text-xs text-muted-foreground flex-1 select-all whitespace-pre-wrap">
                                  {JSON.stringify(log.payload, null, 2)}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InflowWorkspace;

  // <Card>
  //           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
  //             <div className="space-y-1">
  //               <CardTitle>Integration Status</CardTitle>
  //               <CardDescription>Remote listener configurations</CardDescription>
  //             </div>
  //             <Badge variant={webhook ? (webhook.isDisabled ? "destructive" : "default") : "secondary"}>
  //               {webhook ? (webhook.isDisabled ? "Attention Required" : "Active & Healthy") : "Not Setup"}
  //             </Badge>
  //           </CardHeader>
  //           <CardContent className="space-y-4">
  //             <div className="flex items-center justify-between text-sm">
  //               <span className="font-medium">Connection State</span>
  //               <span className="text-muted-foreground">{webhook ? "Connected" : "Disconnected"}</span>
  //             </div>
              
  //             {webhook && (
  //               <>
  //                 <div className="flex items-center justify-between text-sm">
  //                   <span className="font-medium">Target URL</span>
  //                   <code className="text-xs bg-muted p-1 rounded max-w-[280px] truncate">{webhook.url}</code>
  //                 </div>
  //                 <div className="flex items-center justify-between text-sm">
  //                   <span className="font-medium">Consecutive Delivery Failures</span>
  //                   <span className={webhook.consecutiveFailureCount > 0 ? "text-destructive" : "text-emerald-600"}>
  //                     {webhook.consecutiveFailureCount}
  //                   </span>
  //                 </div>
  //                 <div className="flex items-center justify-between text-sm">
  //                   <span className="font-medium">Subscription ID</span>
  //                   <code className="text-xs">{webhook.webHookSubscriptionId}</code>
  //                 </div>
  //               </>
  //             )}
  //           </CardContent>
  //           <CardFooter className="flex justify-between border-t p-4 mt-2">
  //             <Button variant="outline" size="sm" onClick={refreshStatus} disabled={pending}>
  //               Refresh Sync Status
  //             </Button>
  //             {webhook ? (
  //               <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={pending}>
  //                 Disconnect Integration
  //               </Button>
  //             ) : (
  //               <Button size="sm" onClick={handleConnect} disabled={pending}>
  //                 Setup/Connect Webhooks
  //               </Button>
  //             )}
  //           </CardFooter>
  //         </Card>
{/* <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>inFlow Live Sync</CardTitle>
                <CardDescription>Remote listener details</CardDescription>
              </div>
              <Badge variant={webhook ? "default" : "secondary"}>
                {webhook ? "Active" : "Offline"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm pt-4">
              {webhook && (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">URL:</span>
                    <span className="text-muted-foreground truncate max-w-[200px]">{webhook.url}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Failures:</span>
                    <span>{webhook.consecutiveFailureCount}</span>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <Button variant="outline" size="sm" onClick={refreshStatus}>Refresh</Button>
              {webhook ? (
                <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={pending}>Disconnect</Button>
              ) : (
                <Button size="sm" onClick={handleConnect} disabled={pending}>Connect</Button>
              )}
            </CardFooter>
          </Card> */}

          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                InFlow Cloud

                {result?.connected &&
                  result?.subscribed &&
                  !result?.disabled && (
                    <Badge>
                      Healthy
                    </Badge>
                )}

                {result?.disabled && (
                  <Badge variant="destructive">
                    Attention Needed
                  </Badge>
                )}
              </CardTitle>

              <CardDescription>
                Inventory sync and webhook integration
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge
                  variant={
                    pending
                      ? "secondary"
                      : result?.connected
                      ? "default"
                      : "secondary"
                  }
                >
                  {pending
                    ? "Testing..."
                    : result?.connected
                    ? "Connected"
                    : "Unknown"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span>Webhook</span>

                <Badge
                  variant={
                    result?.subscribed
                      ? "default"
                      : "secondary"
                  }
                >
                  {result?.subscribed
                    ? "Subscribed"
                    : "Not Subscribed"}
                </Badge>
              </div>

              {result && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Webhook Status</span>

                    <Badge
                      variant={
                        result.disabled
                          ? "destructive"
                          : "default"
                      }
                    >
                      {result.disabled
                        ? "Disabled"
                        : "Active"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Delivery Failures</span>

                    <span>{result.failures}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Webhook ID</span>

                    <code className="text-xs">
                      {result.webhookId.slice(0, 8)}
                      ...
                      {result.webhookId.slice(-4)}
                    </code>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Webhook URL
                </p>

                <code className="block break-all text-xs">
                  {process.env.APP_URL}
                  /api/webhooks/inflow
                </code>
              </div>

              {result?.success && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
                  <p>✓ API Authentication Successful</p>
                  <p>✓ Webhook Registered</p>

                  <p>
                    {result.disabled
                      ? "⚠ Webhook Disabled"
                      : "✓ Webhook Active"}
                  </p>

                  <p>
                    Consecutive Failures:{" "}
                    {result.failures}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-md border border-destructive p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </CardContent>

            <CardFooter className="gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={pending}
              >
                {pending
                  ? "Testing..."
                  : "Test Connection"}
              </Button>

              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={pending}
              >
                Refresh
              </Button>
            </CardFooter>
          </Card> */}
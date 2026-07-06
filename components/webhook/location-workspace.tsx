"use client";

import { useState, useEffect, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { toast } from "sonner";

import { INFLOW_EVENTS } from "@/lib/locations/types/webhook.type";

interface PartnerWorkspaceProps {
  selectedLocationInflowId: string;
}

const PartnerWorkspace = ({ selectedLocationInflowId }: PartnerWorkspaceProps) => {
  const [pending, startTransition] = useTransition();
  const [webhook, setWebhook] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // FIX 1: Pass the location context to fetch dynamic, location-segregated logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/settings/webhooks/locations/logs?locationId=${selectedLocationInflowId}`);
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
      const res = await fetch(`/api/settings/webhooks/locations?locationId=${selectedLocationInflowId}`);
      const data = await res.json();
      if (data.success) setWebhook(data.webhook);
    } catch {
      toast.error("Could not read configuration state.");
    } finally {
      setLoading(false);
    }
  };

  // FIX 2: Trigger state re-hydration whenever dynamic route updates
  useEffect(() => {
    setLoading(true);
    refreshStatus();
  }, [selectedLocationInflowId]);
  
  const handleConnect = () => {
    startTransition(async () => {
      const res = await fetch("/api/settings/webhooks/locations", {
        method: "POST",
        body: JSON.stringify({ action: "connect", locationId: selectedLocationInflowId }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhook(data.webhook);
        toast.success("Partner Workspace active for this location.");
      }
    });
  };

  const handleDisconnect = () => {
    if (!webhook) return;
    startTransition(async () => {
      const res = await fetch("/api/settings/webhooks/locations", {
        method: "POST",
        body: JSON.stringify({ 
          action: "disconnect", 
          locationId: selectedLocationInflowId,
          webhookId: webhook.webHookSubscriptionId 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhook(null);
        toast.success("Workspace location channel disabled.");
      }
    });
  };

  const handleToggleEvent = (event: string, checked: boolean) => {
    if (!webhook) return;
    let updatedEvents = [...webhook.events];
    if (checked) { updatedEvents.push(event); } 
    else { updatedEvents = updatedEvents.filter((e) => e !== event); }

    startTransition(async () => {
      const res = await fetch("/api/settings/webhooks/locations", {
        method: "POST",
        body: JSON.stringify({ 
          action: "update_events", 
          locationId: selectedLocationInflowId, 
          events: updatedEvents 
        }),
      });
      const data = await res.json();
      if (data.success) setWebhook(data.webhook);
    });
  };

  if (loading) return <div className="p-8 text-center text-sm">Loading config...</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Partner App Integration</h1>
        <p className="text-muted-foreground">Manage webhook automation.</p>
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
                  <Button size="sm" onClick={handleConnect} disabled={pending}>Connect Partner App</Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Subscribed Topics</CardTitle>
              <CardDescription>
                Toggle the topics you want PartnerApp to report to your system context hook payload.
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
                      disabled={pending || !webhook}
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
                <CardDescription>The last 50 events received from your Partner App hooks hook context.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loadingLogs}>
                {loadingLogs ? "Refreshing..." : "Refresh Logs"}
              </Button>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No recent webhook events detected. Try performing an action inside your Partner App workspace dashboard.
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

export default PartnerWorkspace;

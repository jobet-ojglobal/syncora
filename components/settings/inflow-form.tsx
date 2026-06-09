// "use client";

// import { useTransition } from "react";
// import { useRouter } from "next/navigation";
// import { INFLOW_EVENTS, type InflowEvent } from "@/lib/inflow/constants";
// import { 
//   connectIntegration, 
//   disconnectIntegration, 
//   triggerManualSync 
// } from "@/actions/inflow";

// import { Button } from "@/components/ui/button";
// import { Switch } from "@/components/ui/switch";
// import { Badge } from "@/components/ui/badge";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { toast } from "sonner";

// import { 
//   CheckCircle2, 
//   RefreshCw, 
//   XCircle, 
//   AlertTriangle, 
//   Radio, 
//   Webhook, 
//   Link2 
// } from "lucide-react";

// interface InflowIntegrationType {
//   id: string;
//   isConnected: boolean;
//   webhookId: string | null;
//   webhookUrl: string | null;
// }

// interface InflowWebhookType {
//   id: string;
//   url: string;
//   events: any; // string[] stored in DB
//   isDisabled?: boolean;
//   consecutiveFailureCount?: number;
// }

// interface Props {
//   integration: InflowIntegrationType;
//   syncedWebhooks: InflowWebhookType[];
// }

// export function InflowSettingsForm({ integration, syncedWebhooks }: Props) {
//   const router = useRouter();
//   const [isPending, startTransition] = useTransition();
//   const [isSyncing, startSyncTransition] = useTransition();

//   const handleConnectionToggle = async (checked: boolean) => {
//     startTransition(async () => {
//       if (checked) {
//         const res = await connectIntegration();
//         if (res.success) {
//           toast.success("Connected to inFlow Cloud", {
//             description: "Successfully mounted automated webhook infrastructure.",
//           });
//           router.refresh();
//         } else {
//           toast.error("Connection Failed", { description: res.error });
//         }
//       } else {
//         const res = await disconnectIntegration(integration.webhookId);
//         if (res.success) {
//           toast.success("Disconnected from inFlow Cloud", {
//             description: "Webhooks torn down from directory cleanly.",
//           });
//           router.refresh();
//         } else {
//           toast.error("Disconnection Failed", { description: res.error });
//         }
//       }
//     });
//   };

//   const handleManualSync = () => {
//     startSyncTransition(async () => {
//       const res = await triggerManualSync();
//       if (res.success) {
//         toast.success("Directory Re-synchronized", {
//           description: "Local database tracking records accurately match upstream.",
//         });
//         router.refresh();
//       } else {
//         toast.error("Sync Failed", { description: res.error });
//       }
//     });
//   };

//   return (
//     <div className="space-y-6">
//       {/* Configuration Status Card */}
//       <Card>
//         <CardHeader>
//           <div className="flex items-center justify-between">
//             <div className="space-y-1">
//               <CardTitle className="flex items-center gap-2 text-xl font-semibold">
//                 <Webhook className="h-5 w-5 text-indigo-500" />
//                 Connection Gateway
//               </CardTitle>
//               <CardDescription>
//                 Toggle automated messaging channels and link mapping tools.
//               </CardDescription>
//             </div>
//             <div className="flex items-center space-x-2">
//               <Label htmlFor="pipeline-toggle" className="text-sm font-medium text-muted-foreground">
//                 {integration.isConnected ? "Active" : "Offline"}
//               </Label>
//               <Switch
//                 id="pipeline-toggle"
//                 disabled={isPending}
//                 checked={integration.isConnected}
//                 onCheckedChange={handleConnectionToggle}
//               />
//             </div>
//           </div>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
//             {integration.isConnected ? (
//               <>
//                 <Radio className="h-4 w-4 animate-pulse text-emerald-500" />
//                 <div className="space-y-0.5">
//                   <span className="font-medium text-foreground">Listening Terminal Configured</span>
//                   <p className="text-xs text-muted-foreground break-all font-mono mt-0.5">
//                     {integration.webhookUrl}
//                   </p>
//                 </div>
//               </>
//             ) : (
//               <>
//                 <XCircle className="h-4 w-4 text-muted-foreground" />
//                 <span className="text-muted-foreground">
//                   No active hooks deployed. Turn on status to spin up automated pipelines.
//                 </span>
//               </>
//             )}
//           </div>
//         </CardContent>
//       </Card>

//       {/* Synchronized Directories / Webhook Monitoring Matrix */}
//       {integration.isConnected && (
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
//             <div className="space-y-1">
//               <CardTitle className="text-lg font-medium flex items-center gap-2">
//                 <Link2 className="h-4 w-4 text-muted-foreground" />
//                 Active Pipeline Subscription Logs
//               </CardTitle>
//               <CardDescription>
//                 Verifies registered sync streams managed by your application.
//               </CardDescription>
//             </div>
//             <Button
//               size="sm"
//               variant="outline"
//               disabled={isSyncing}
//               onClick={handleManualSync}
//               className="gap-2 h-9"
//             >
//               <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
//               Refresh States
//             </Button>
//           </CardHeader>
//           <CardContent>
//             <div className="rounded-md border">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead className="w-[240px]">Subscription ID</TableHead>
//                     <TableHead>Subscribed Registry Events</TableHead>
//                     <TableHead className="w-[160px] text-right">Status Indicator</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {syncedWebhooks.length === 0 ? (
//                     <TableRow>
//                       <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
//                         No deployed webhooks pulled from the directory. Click refresh to query upstream.
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     syncedWebhooks.map((hook) => {
//                       const activeEvents = (hook.events || []) as InflowEvent[];
//                       return (
//                         <TableRow key={hook.id}>
//                           <TableCell className="font-mono text-xs font-medium max-w-[240px] truncate">
//                             {hook.id}
//                           </TableCell>
//                           <TableCell>
//                             <div className="flex flex-wrap gap-1.5 max-w-2xl">
//                               {INFLOW_EVENTS.map((event) => {
//                                 const isSubbed = activeEvents.includes(event);
//                                 return (
//                                   <Badge
//                                     key={event}
//                                     variant={isSubbed ? "default" : "outline"}
//                                     className={`text-[10px] px-2 py-0.5 font-mono transition-all ${
//                                       isSubbed 
//                                         ? "bg-indigo-600/10 text-indigo-600 border-indigo-500/30 hover:bg-indigo-600/15" 
//                                         : "opacity-30 line-through select-none"
//                                     }`}
//                                   >
//                                     {event}
//                                   </Badge>
//                                 );
//                               })}
//                             </div>
//                           </TableCell>
//                           <TableCell className="text-right">
//                             <div className="flex flex-col items-end gap-1">
//                               {hook.isDisabled ? (
//                                 <Badge variant="destructive" className="gap-1 flex items-center">
//                                   <AlertTriangle className="h-3 w-3" /> Broken Pipeline
//                                 </Badge>
//                               ) : (
//                                 <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 flex items-center">
//                                   <CheckCircle2 className="h-3 w-3" /> Live Channel
//                                 </Badge>
//                               )}
                              
//                               {hook.consecutiveFailureCount && hook.consecutiveFailureCount > 0 ? (
//                                 <span className="text-[11px] text-destructive font-medium">
//                                   Failures: {hook.consecutiveFailureCount}/10
//                                 </span>
//                               ) : null}
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       );
//                     })
//                   )}
//                 </TableBody>
//               </Table>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// }
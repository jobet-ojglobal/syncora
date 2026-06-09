// // components/settings/inflow-settings-form.tsx
// "use client";

// import { useState, useTransition } from "react";
// import { useRouter } from "next/navigation";

// import { Button } from "@/components/ui/button";
// import { Switch } from "@/components/ui/switch";
// import { Badge } from "@/components/ui/badge";
// import { Label } from "@/components/ui/label";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { toast } from "sonner";
// import { CheckCircle2, RefreshCw, XCircle, AlertTriangle, Radio, Webhook, Key, ShieldCheck, HelpCircle } from "lucide-react";
// import { Card, CardContent } from "@/components/ui/card";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import { InflowIntegration, InflowWebhook } from "@/types/settings-inflow.type";

// interface Props {
//   integration: InflowIntegration;
//   syncedWebhooks: InflowWebhook[];
// }

// // lib/inflow/constants.ts

// // 1. Move the literal array here
// export const INFLOW_EVENTS = [
//   "product.created",
//   "product.updated",
//   "stock.adjusted"
// ] as const;

// // 2. Define the type here
// export type InflowEvent = typeof INFLOW_EVENTS[number];

// export function InflowSettingsForm({ integration, syncedWebhooks }: Props) {
//   const router = useRouter();
//   const [isPending, startTransition] = useTransition();
//   const [isSyncing, startSyncTransition] = useTransition();
//   const [activeEventMutator, setActiveEventMutator] = useState<string | null>(null);

//   // 1. Connection Toggle Action
//   const handleConnectionToggle = async (checked: boolean) => {
//     startTransition(async () => {
//       const action = checked ? "connect" : "disconnect";
      
//       try {
//         const response = await fetch("/api/inflow", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ 
//             action, 
//             webhookId: integration.webhookId 
//           }),
//         });
        
//         const res = await response.json();

//         if (res.success) {
//           toast.success(checked ? "Connected" : "Disconnected");
//           router.refresh(); // Triggers server data pull cleanly without blowing away react state
//         } else {
//           toast.error(`${checked ? "Connection" : "Disconnection"} Failed`, { description: res.error });
//         }
//       } catch (err) {
//         toast.error("Network request failed");
//       }
//     });
//   };

//   // 2. Manual Resync Action
//   const handleManualSync = () => {
//     startSyncTransition(async () => {
//       try {
//         const response = await fetch("/api/inflow", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ action: "sync" }),
//         });
        
//         const res = await response.json();

//         if (res.success) {
//           toast.success("Sync Complete");
//           router.refresh();
//         } else {
//           toast.error("Sync Failed", { description: res.error });
//         }
//       } catch (err) {
//         toast.error("Network request failed");
//       }
//     });
//   };

//   // 3. Granular Webhook Event Toggle Action
//   const handleEventToggle = async (webhookId: string, currentEvents: InflowEvent[], event: InflowEvent) => {
//     const mutatorKey = `${webhookId}-${event}`;
//     setActiveEventMutator(mutatorKey);
    
//     try {
//       const response = await fetch("/api/inflow", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           action: "toggle-event",
//           webhookId,
//           currentEvents,
//           targetEvent: event
//         })
//       });

//       const res = await response.json();

//       if (res.success) {
//         toast.success(`Routing Modified`, {
//           description: `Successfully modified bindings for ${event}`,
//         });
//         router.refresh();
//       } else {
//         toast.error("Mutation failed", { description: res.error });
//       }
//     } catch (err) {
//       toast.error("Network mutation stream failed");
//     } finally {
//       setActiveEventMutator(null);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* Primary Gateway Router Config Card */}
//       <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
//         <CardContent className="p-6 bg-slate-50/50 dark:bg-slate-900/30">
//           <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//             <div className="space-y-1">
//               <div className="flex items-center gap-2">
//                 <Label className="text-base font-semibold tracking-tight">System Gateway Pipeline</Label>
//                 {integration.isConnected ? (
//                   <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 px-2.5">
//                     <CheckCircle2 className="h-3 w-3" /> Active Gateway
//                   </Badge>
//                 ) : (
//                   <Badge variant="secondary" className="gap-1 px-2.5">
//                     <XCircle className="h-3 w-3" /> Offline Mode
//                   </Badge>
//                 )}
//               </div>
//               <p className="text-sm text-muted-foreground max-w-xl">
//                 {integration.isConnected
//                   ? "Your middleware core is actively listening for inFlow payload relays."
//                   : "Turn on connection to automatically provision secure webhook web pathways."}
//               </p>
//             </div>
//             <div className="flex items-center gap-2 sm:self-center">
//               <Switch
//                 disabled={isPending}
//                 checked={integration.isConnected}
//                 onCheckedChange={handleConnectionToggle}
//                 className="data-[state=checked]:bg-emerald-500"
//               />
//             </div>
//           </div>

//           {integration.isConnected && integration.webhookUrl && (
//             <div className="mt-4 pt-4 border-t border-dashed space-y-2">
//               <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-white dark:bg-slate-950 p-2.5 rounded-md border">
//                 <Webhook className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
//                 <span className="text-slate-400 select-none">ENDPOINT:</span>
//                 <span className="truncate text-slate-700 dark:text-slate-300">{integration.webhookUrl}</span>
//               </div>
//               {integration.secret && (
//                 <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-white dark:bg-slate-950 p-2.5 rounded-md border">
//                   <Key className="h-3.5 w-3.5 text-amber-500 shrink-0" />
//                   <span className="text-slate-400 select-none">SIGNING SECRET:</span>
//                   <span className="truncate password-mask">••••••••••••••••••••••••••••••••</span>
//                   <Badge variant="outline" className="ml-auto text-[10px] h-4 bg-slate-50 px-1 py-0 border-slate-200">SHA-256 Verified</Badge>
//                 </div>
//               )}
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {integration.isConnected && (
//         <div className="space-y-3">
//           {/* Operations Toolbar Header Block */}
//           <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//             <div>
//               <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
//                 <ShieldCheck className="h-4 w-4 text-indigo-500" /> Live Data-Stream Routing Registry
//               </h4>
//               <p className="text-xs text-muted-foreground">
//                 Toggle active triggers to selectively stream specific ERP domain modifications into your core engine.
//               </p>
//             </div>
//             <Button
//               size="sm"
//               variant="outline"
//               disabled={isSyncing}
//               onClick={handleManualSync}
//               className="gap-2 shadow-sm border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium self-start sm:self-center"
//             >
//               <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isSyncing ? "animate-spin" : ""}`} />
//               Refresh Subscriptions
//             </Button>
//           </div>

//           {/* Active Webhook Registry Subgrid Container */}
//           <div className="rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
//             <TooltipProvider>
//               <Table>
//                 <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
//                   <TableRow>
//                     <TableHead className="w-[200px] text-xs font-semibold text-slate-600 dark:text-slate-400">Subscription ID</TableHead>
//                     <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Subscribed Target Matrix</TableHead>
//                     <TableHead className="w-[160px] text-xs font-semibold text-slate-600 dark:text-slate-400 text-right">Pipeline Health</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {syncedWebhooks.length === 0 ? (
//                     <TableRow>
//                       <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
//                         <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
//                           <AlertTriangle className="h-5 w-5 text-amber-500" />
//                           <p className="font-medium text-slate-800 dark:text-slate-200">No Upstream State Discovered</p>
//                           <p className="text-xs">No active hook parameters could be parsed from the local cache storage layers. Trigger an explicit sync query sequence above.</p>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     syncedWebhooks.map((hook) => {
//                       const activeEvents = (hook.events as InflowEvent[]) || [];
//                       return (
//                         <TableRow key={hook.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
//                           <TableCell className="font-mono text-[11px] font-medium text-slate-600 dark:text-slate-400 vertical-top">
//                             <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[170px] inline-block select-all" title={hook.id}>
//                               {hook.id}
//                             </span>
//                           </TableCell>
//                           <TableCell className="py-3">
//                             <div className="flex flex-wrap gap-1.5 max-w-xl">
//                               {INFLOW_EVENTS.map((event) => {
//                                 const isSubbed = activeEvents.includes(event);
//                                 const isMutating = activeEventMutator === `${hook.id}-${event}`;
//                                 return (
//                                   <button
//                                     key={event}
//                                     disabled={isMutating || isPending}
//                                     onClick={() => handleEventToggle(hook.id, activeEvents, event)}
//                                     className={`text-[10px] font-medium tracking-tight px-2 py-0.5 rounded transition-all outline-none border focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 select-none ${
//                                       isSubbed
//                                         ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 shadow-sm hover:bg-indigo-100/70"
//                                         : "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-600 hover:bg-slate-100"
//                                     }`}
//                                   >
//                                     <span className="flex items-center gap-1">
//                                       {isSubbed && <span className="h-1 w-1 rounded-full bg-indigo-500 animate-pulse" />}
//                                       {isMutating ? "Updating..." : event}
//                                     </span>
//                                   </button>
//                                 );
//                               })}
//                             </div>
//                           </TableCell>
//                           <TableCell className="text-right vertical-top py-3">
//                             <div className="flex flex-col items-end gap-1">
//                               {hook.isDisabled ? (
//                                 <Badge variant="destructive" className="gap-1 text-[11px] font-medium px-2 py-0 h-5">
//                                   <AlertTriangle className="h-3 w-3" /> Defunct Circuit
//                                 </Badge>
//                               ) : (
//                                 <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 gap-1 text-[11px] font-medium px-2 py-0 h-5">
//                                   <Radio className="h-2.5 w-2.5 animate-pulse" /> Listening Live
//                                 </Badge>
//                               )}
                              
//                               {hook.consecutiveFailureCount > 0 && (
//                                 <Tooltip>
//                                   <TooltipTrigger asChild>
//                                     <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold cursor-help flex items-center gap-0.5">
//                                       {hook.consecutiveFailureCount} Errors Detected
//                                       <HelpCircle className="h-3 w-3" />
//                                     </span>
//                                   </TooltipTrigger>
//                                   <TooltipContent side="left" className="text-xs max-w-xs bg-slate-900 text-slate-100 p-2.5">
//                                     This data pipe has failed {hook.consecutiveFailureCount} consecutive transmissions. Circuit will safely break automatically if error threshold passes 10.
//                                   </TooltipContent>
//                                 </Tooltip>
//                               )}
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       );
//                     })
//                   )}
//                 </TableBody>
//               </Table>
//             </TooltipProvider>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
<<<<<<< HEAD
import { Warehouse, RefreshCw, CloudSync, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
=======
import { CloudSyncButton } from "@/components/integration/cloud-sync-button";
>>>>>>> f774fa4d46540598445552ff7ba82d06bcdf5aad
=======
import { Warehouse, RefreshCw } from "lucide-react";
>>>>>>> 496b01c6048d1dc95608ee6ccc0a0cb9d255882c

import { Button } from "@/components/ui/button";
import { StorageInspectionModalEnhance, InspectionItem } from "@/components/inventory/storage-inspection-modal";
import { InboundTransitMonitor } from "@/components/transfer/inbound-pipeline-card";
import { CloudSyncSublocationButton } from "@/components/integration/cloud-sync-sublocation-button";

import { InventoryTable } from "./InventoryTable";
import { InventorySummaryCards } from "./SummaryCards";
import { Location, LocationWithRelations } from "@/types/location.type";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LocationInventoryPage() {
  const { id: locationId } = useParams() as { id: string };

<<<<<<< HEAD
  // Local Modal States
  const [activeInspectionItem, setActiveInspectionItem] = useState<InspectionItem | null>(null);
  const [selectedReplenishItem, setSelectedReplenishItem] = useState<any | null>(null);
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState<boolean>(false);

  // Sync Modal & State
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

=======
>>>>>>> 496b01c6048d1dc95608ee6ccc0a0cb9d255882c
  // 1. Fetch Location Metadata
  const { data: location, mutate: mutateLocation } = useSWR<LocationWithRelations>(
    locationId ? `/api/admin/locations/${locationId}/lookup` : null,
    fetcher
  );

  // 2. Fetch Locations Lookup for Replenishment Modal
  const { data: locations = [] } = useSWR<Location[]>(
    "/api/locations/lookup",
    fetcher
  );

  const refreshAllData = async () => {
    await mutateLocation();
  };

<<<<<<< HEAD
<<<<<<< HEAD
  const handleCloudSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/admin/locations/${locationId}/inventory/sync`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger cloud sync");
      }

      toast.success(data.message || "Cloud sync jobs queued successfully!");
      await refreshAllData();
    } catch (err: any) {
      toast.error(err.message || "Cloud sync failed");
    } finally {
      setIsSyncing(false);
      setIsSyncConfirmOpen(false);
    }
  };
=======
  const sourceName = location?.name === "HQ GLOBAL SYNC" ? "sync_locations_inventory" : "cloudsync_inventory_levels";
>>>>>>> 185395c75cf3224c055c0937011b2dae2943eb01
=======
  const sourceName = location?.name === "HQ GLOBAL SYNC" 
    ? "sync_locations_inventory" 
    : "cloudsync_inventory_levels";
>>>>>>> 496b01c6048d1dc95608ee6ccc0a0cb9d255882c

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-muted border rounded-xl flex items-center justify-center shrink-0 mt-1">
            <Warehouse className="w-5 h-5 text-muted-foreground" />
          </div>
<<<<<<< HEAD

          <div className="flex items-center gap-2">
            {/* Extracted Cloud Sync Component */}
            <CloudSyncSublocationButton
              source={sourceName}
              locationId={location?.inflowId}
              locationName={location?.name}
              onSyncComplete={refreshAllData}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSyncConfirmOpen(true)}
              disabled={isSyncing}
              className="h-8 gap-1.5 text-xs"
            >
              {isSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudSync className="w-3.5 h-3.5" />
              )}
              Sync to Cloud
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAllData}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Data
            </Button>

            <Button asChild size="sm" className="h-8 gap-1.5 text-xs">
              <Link href="/dashboard/inventory/stocks/new">Post Adjustment</Link>
            </Button>
=======
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {location?.name ? `${location.name} — Inventory` : "Inventory"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Targeted internal warehouse balances, allocated bin vectors, and tracking references.
            </p>
>>>>>>> 496b01c6048d1dc95608ee6ccc0a0cb9d255882c
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CloudSyncSublocationButton
            source={sourceName}
            locationId={location?.inflowId}
            locationName={location?.name}
            onSyncComplete={refreshAllData}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </Button>

          <Button asChild size="sm" className="h-8 gap-1.5 text-xs">
            <Link href="/dashboard/inventory/stocks/new">Post Adjustment</Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <InventorySummaryCards locationId={locationId} />

      {/* Inbound Freight Pipeline */}
      <InboundTransitMonitor locationId={locationId} />

<<<<<<< HEAD
      {/* Paginated Inventory Table Component */}
=======
      {/* Inventory Table Component */}
>>>>>>> f774fa4d46540598445552ff7ba82d06bcdf5aad
      <InventoryTable
        locationId={locationId}
        locationInflowId={location?.inflowId}
        locations={locations}
        sublocations={location?.sublocations || []}
        onDataChanged={refreshAllData}
      />
<<<<<<< HEAD

      {/* Storage Layout Inspection Modal */}
      <StorageInspectionModalEnhance
        item={activeInspectionItem}
        locationName={location?.name}
        onClose={() => setActiveInspectionItem(null)}
      />

      {/* Auto-Replenishment Settings Modal */}
      {selectedReplenishItem && (
        <ReplenishmentSettingsModal
          isOpen={isReplenishModalOpen}
          onClose={() => {
            setIsReplenishModalOpen(false);
            setSelectedReplenishItem(null);
          }}
          locations={locations}
          isLoadingLocations={isLoadingLocations}
          inventoryItem={{
            id: selectedReplenishItem.id,
            productName: selectedReplenishItem.productName,
            productSlug: selectedReplenishItem.productSlug,
            reorderThreshold: selectedReplenishItem.reorderThreshold || 0,
            reorderQuantity: selectedReplenishItem.reorderQuantity || 0,
            isAutoReorderEnabled: selectedReplenishItem.isAutoReorderEnabled || false,
            preferredSourceLocationId: selectedReplenishItem.preferredSourceLocationId || null,
          }}
          onSaveSuccess={refreshAllData}
        />
      )}

      {/* Cloud Sync Confirmation Dialog */}
      <AlertDialog open={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Cloud Sync</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to push all inventory lines and product definitions for{" "}
              <strong>{location?.name || "this location"}</strong> to the cloud queue? This operation
              will enqueue individual synchronization jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloudSync} disabled={isSyncing}>
              {isSyncing ? "Syncing..." : "Confirm & Sync"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
=======
>>>>>>> 496b01c6048d1dc95608ee6ccc0a0cb9d255882c
    </div>
  );
}

// 8/13/26
// "use client";

// import { useEffect, useRef, useState } from "react";
// import Link from "next/link";
// import { useParams } from "next/navigation";
// import useSWR from "swr";
// import {
//   Warehouse,
//   RefreshCw,
//   CloudSync,
//   Loader2,
//   XCircle,
//   CheckCircle2,
//   AlertTriangle,
//   Trash2,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { toast } from "sonner";

// // Custom Sub-components
// import {
//   StorageInspectionModalEnhance,
//   InspectionItem,
// } from "@/components/inventory/storage-inspection-modal";
// import { InboundTransitMonitor } from "@/components/transfer/inbound-pipeline-card";
// import { InventoryTable } from "./InventoryTable";
// import { ReplenishmentSettingsModal } from "@/components/inventory/replenishment-settings-modal";
// import { InventorySummaryCards } from "./SummaryCards";
// import { Location } from "@/types/location.type";

// const fetcher = (url: string) => fetch(url).then((res) => res.json());

// export default function LocationInventoryPage() {
//   const { id: locationId } = useParams() as { id: string };
//   const source = "PRODUCT_UPSERT_CLOUD";

//   const [jobId, setJobId] = useState<string | null>(null);
//   const [progress, setProgress] = useState<number>(0);
//   const [status, setStatus] = useState<string>("");
//   const [error, setError] = useState<string>("");
//   const [showProgress, setShowProgress] = useState<boolean>(false);

//   // Local Modal States
//   const [activeInspectionItem, setActiveInspectionItem] = useState<InspectionItem | null>(null);
//   const [selectedReplenishItem, setSelectedReplenishItem] = useState<any | null>(null);
//   const [isReplenishModalOpen, setIsReplenishModalOpen] = useState<boolean>(false);

//   const timeoutRef = useRef<NodeJS.Timeout | null>(null);

//   // Sync Modal & State
//   const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState<boolean>(false);
//   const [isSyncing, setIsSyncing] = useState<boolean>(false);

//   // 1. Fetch Location Metadata
//   const { data: location, mutate: mutateLocation } = useSWR<Location>(
//     locationId ? `/api/admin/locations/${locationId}/lookup` : null,
//     fetcher
//   );

//   // 2. Fetch Locations Lookup for Replenishment Modal
//   const { data: locations = [], isLoading: isLoadingLocations } = useSWR(
//     "/api/locations/lookup",
//     fetcher
//   );

//   // 3. Fetch Inbound Freight Pipeline
//   const { data: inboundCargo = [], mutate: mutateInbound } = useSWR(
//     locationId ? `/api/admin/locations/${locationId}/inbound-transit` : null,
//     fetcher
//   );

//   const refreshAllData = async () => {
//     await Promise.all([mutateLocation(), mutateInbound()]);
//   };

//   const handleCloudSync = async () => {
//     try {
//       setIsSyncing(true);

//       const payload = {
//         source,
//         selectedLocations: [locationId],
//         selectedRecords: [],
//         syncedAll: true,
//       };

//       const res = await fetch(`/api/sync/cloud/out`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data.error || "Failed to trigger cloud sync");
//       }

//       toast.success(data.message || "Cloud sync job queued successfully!");
//       if (data.jobId) {
//         setJobId(data.jobId);
//         setStatus("pending");
//         setProgress(0);
//         setShowProgress(true);
//       }
//       await refreshAllData();
//     } catch (err: any) {
//       toast.error(err.message || "Cloud sync failed");
//       setIsSyncing(false);
//     } finally {
//       setIsSyncConfirmOpen(false);
//     }
//   };

//   useEffect(() => {
//     let isMounted = true;
//     async function checkForActiveJob() {
//       try {
//         const res = await fetch(`/api/sync?source=${source}`);
//         if (!res.ok) return;

//         const data = await res.json();
//         if (isMounted && data.activeJob) {
//           const job = data.activeJob;
//           const activeStatuses = ["pending", "processing", "retrying"];
//           if (activeStatuses.includes(job.status)) {
//             setJobId(job.id);
//             setProgress(job.progress || 0);
//             setStatus(job.status);
//             setError(job.error || "");
//             setIsSyncing(true);
//             setShowProgress(true);
//           }
//         }
//       } catch (err) {
//         console.error(`Error checking active sync job for ${source}:`, err);
//       }
//     }

//     checkForActiveJob();
//     return () => {
//       isMounted = false;
//     };
//   }, [source]);

//   useEffect(() => {
//     if (!jobId) return;

//     const interval = setInterval(async () => {
//       try {
//         const res = await fetch(`/api/sync?jobId=${jobId}`);
//         const data = await res.json();

//         setProgress(Number(data.progress) || 0);
//         setStatus(data.status);
//         setError(data.error || "");

//         const terminalStates = ["completed", "failed", "cancelled"];
//         if (terminalStates.includes(data.status)) {
//           clearInterval(interval);
//           setIsSyncing(false);

//           if (timeoutRef.current) clearTimeout(timeoutRef.current);
//           timeoutRef.current = setTimeout(() => {
//             setShowProgress(false);
//             setJobId(null);
//           }, 4000);
//         }
//       } catch (err) {
//         console.error("Polling error:", err);
//       }
//     }, 1000);

//     return () => {
//       clearInterval(interval);
//       if (timeoutRef.current) clearTimeout(timeoutRef.current);
//     };
//   }, [jobId]);

//   const cancelSync = async () => {
//     if (!jobId) return;
//     try {
//       await fetch("/api/sync/cancel", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ jobId }),
//       });
//       setStatus("cancelled");
//       setIsSyncing(false);
//       toast.info("Sync job cancelled");
//     } catch (err) {
//       console.error("Failed to cancel sync:", err);
//       toast.error("Failed to cancel sync process");
//     }
//   };

//   const clearJobs = async () => {
//     try {
//       await fetch("/api/sync/clear", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ queue: "midworker" }),
//       });
//       setShowProgress(false);
//       setJobId(null);
//       setIsSyncing(false);
//       toast.success("Sync queue cleared");
//     } catch (err) {
//       console.error("Failed to clear jobs:", err);
//       toast.error("Failed to clear queue");
//     }
//   };

//   return (
//     <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
//       {/* Header Bar */}
//       <div className="flex flex-col gap-2">
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
//           <div className="flex items-start gap-3">
//             <div className="w-10 h-10 bg-muted border rounded-xl flex items-center justify-center shrink-0 mt-1">
//               <Warehouse className="w-5 h-5 text-muted-foreground" />
//             </div>
//             <div>
//               <h1 className="text-xl font-bold tracking-tight">
//                 {location?.name ? `${location.name} — Inventory` : "Inventory"}
//               </h1>
//               <p className="text-xs text-muted-foreground mt-0.5">
//                 Targeted internal warehouse balances, allocated bin vectors, and tracking references.
//               </p>
//             </div>
//           </div>

//           <div className="flex items-center gap-2">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => setIsSyncConfirmOpen(true)}
//               disabled={isSyncing}
//               className="h-8 gap-1.5 text-xs"
//             >
//               {isSyncing ? (
//                 <Loader2 className="w-3.5 h-3.5 animate-spin" />
//               ) : (
//                 <CloudSync className="w-3.5 h-3.5" />
//               )}
//               Sync to Cloud
//             </Button>

//             <Button
//               variant="outline"
//               size="sm"
//               onClick={refreshAllData}
//               className="h-8 gap-1.5 text-xs"
//             >
//               <RefreshCw className="w-3.5 h-3.5" />
//               Refresh Data
//             </Button>

//             <Button asChild size="sm" className="h-8 gap-1.5 text-xs">
//               <Link href="/dashboard/inventory/stocks/new">Post Adjustment</Link>
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* Cloud Sync Active Status & Progress Banner */}
//       {showProgress && (
//         <div className="p-4 border rounded-xl bg-card space-y-3 shadow-sm">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               {status === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
//               {status === "failed" && <XCircle className="w-4 h-4 text-destructive" />}
//               {status === "cancelled" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
//               {["pending", "processing", "retrying"].includes(status) && (
//                 <Loader2 className="w-4 h-4 text-primary animate-spin" />
//               )}
//               <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
//                 Sync Status: <span className="text-foreground">{status || "Initializing"}</span>
//               </span>
//             </div>

//             <div className="flex items-center gap-1.5">
//               {isSyncing && status !== "cancelled" && (
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   onClick={cancelSync}
//                   className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
//                 >
//                   <XCircle className="w-3.5 h-3.5 mr-1" />
//                   Cancel Sync
//                 </Button>
//               )}
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={clearJobs}
//                 className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
//               >
//                 <Trash2 className="w-3.5 h-3.5 mr-1" />
//                 Clear Queue
//               </Button>
//             </div>
//           </div>

//           <div className="space-y-1">
//             <div className="flex justify-between text-xs text-muted-foreground">
//               <span>Cloud Sync Progress</span>
//               <span>{Math.round(progress)}%</span>
//             </div>
//             <Progress value={progress} className="h-2" />
//           </div>

//           {error && (
//             <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded">
//               {error}
//             </p>
//           )}
//         </div>
//       )}

//       {/* Summary Cards */}
//       <InventorySummaryCards locationId={locationId} />

//       {/* Inbound Freight Pipeline */}
//       <InboundTransitMonitor locationId={locationId} />

//       {/* Inventory Table Component */}
//       <InventoryTable
//         locationId={locationId}
//         locationInflowId={location?.inflowId}
//         onInspectBins={(item) => setActiveInspectionItem(item)}
//         onSelectItemForReplenishment={(item) => {
//           setSelectedReplenishItem(item);
//           setIsReplenishModalOpen(true);
//         }}
//         onDataChanged={refreshAllData}
//       />

//       {/* Storage Layout Inspection Modal */}
//       <StorageInspectionModalEnhance
//         item={activeInspectionItem}
//         locationName={location?.name}
//         onClose={() => setActiveInspectionItem(null)}
//       />

//       {/* Auto-Replenishment Settings Modal */}
//       {selectedReplenishItem && (
//         <ReplenishmentSettingsModal
//           isOpen={isReplenishModalOpen}
//           onClose={() => {
//             setIsReplenishModalOpen(false);
//             setSelectedReplenishItem(null);
//           }}
//           locations={locations}
//           isLoadingLocations={isLoadingLocations}
//           inventoryItem={{
//             id: selectedReplenishItem.id,
//             productName: selectedReplenishItem.productName,
//             productSlug: selectedReplenishItem.productSlug,
//             reorderThreshold: selectedReplenishItem.reorderThreshold || 0,
//             reorderQuantity: selectedReplenishItem.reorderQuantity || 0,
//             isAutoReorderEnabled: selectedReplenishItem.isAutoReorderEnabled || false,
//             preferredSourceLocationId: selectedReplenishItem.preferredSourceLocationId || null,
//           }}
//           onSaveSuccess={refreshAllData}
//         />
//       )}

//       {/* Confirmation Modal */}
//       <AlertDialog open={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Confirm Cloud Sync</AlertDialogTitle>
//             <AlertDialogDescription>
//               Are you sure you want to push all inventory records for{" "}
//               <strong>{location?.name || "this location"}</strong> to the cloud worker queue?
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={isSyncing}>Cancel</AlertDialogCancel>
//             <AlertDialogAction onClick={handleCloudSync} disabled={isSyncing}>
//               {isSyncing ? "Enqueuing..." : "Confirm & Sync"}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }

// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { useParams } from "next/navigation";
// import useSWR from "swr";
// import { 
//   Warehouse, Package, Layers, AlertTriangle, 
//   Edit, Truck, RefreshCw, Layers3, Search,
//   AlertCircle, Sliders
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { InboundTransitMonitor } from "@/components/transfer/inbound-pipeline-card";
// import { ReplenishmentSettingsModal } from "@/components/inventory/replenishment-settings-modal";
// import { toast } from "sonner";
// import { Badge } from "@/components/ui/badge";

// // --- Data Interfaces ---
// interface BinDetail {
//   id: string;
//   sublocationName: string;
//   quantity: number;
// }

// interface InventoryStockRow {
//   id: string;
//   productId: string;
//   productName: string;
//   productSlug: string;
//   locationId: string;
//   quantityOnHand: number;
//   quantityReserved: number;
//   quantityAvailable: number;
//   quantityInTransit: number;
//   reorderThreshold: number;
//   reorderQuantity?: number;
//   isAutoReorderEnabled?: boolean;
//   preferredSourceLocationId?: string | null;
//   bins: BinDetail[];
// }

// interface InboundTransitRow {
//   lineId: string;
//   transferNumber: string;
//   sourceFacility: string;
//   dispatchedAt: string;
//   productName: string;
//   productSlug: string;
//   quantityInTransit: number;
//   expectedDestinationBin: string;
// }

// interface LocationMeta {
//   id: string;
//   inflowId: string;
//   name: string;
//   isActive: boolean;
//   isDefault: boolean;
// }

// interface LocationSummary {
//   totalSKUs: number;
//   totalOnHand: number;
//   outOfStockCount: number;
// }

// interface PaginationMeta {
//   totalRecords: number;
//   pageCount: number;
// }

// interface LookupLocation {
//   id: string;
//   inflowId: string;
//   name: string;
//   isActive: boolean;
// }

// interface InventoryApiResponse {
//   location: LocationMeta;
//   summary: LocationSummary;
//   inventory: InventoryStockRow[];
//   pagination: PaginationMeta;
// }

// const PAGE_SIZE = 10;

// // 🌐 Global SWR JSON Fetcher
// const fetcher = async (url: string) => {
//   const res = await fetch(url);
//   if (!res.ok) {
//     const errorData = await res.json().catch(() => ({}));
//     throw new Error(errorData.error || "An error occurred while fetching data.");
//   }
//   return res.json();
// };

// /**
//  * 🏢 PARENT LOCATION INVENTORY CONTROLLER (SWR Enabled)
//  */
// export default function LocationInventoryPage() {
//   const { id: locationId } = useParams();

//   // 1. Reactive Input & Pagination States
//   const [searchQuery, setSearchQuery] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const [pageIndex, setPageIndex] = useState(0);

//   // Local state management
//   const [syncingProductId, setSyncingProductId] = useState<string | null>(null);
//   const [selectedReplenishItem, setSelectedReplenishItem] = useState<InventoryStockRow | null>(null);
//   const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);
//   const [activeInspectionItem, setActiveInspectionItem] = useState<InventoryStockRow | null>(null);

//   // 2. Sync typing input to debounced state with a 300ms window delay
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(searchQuery);
//       setPageIndex(0); // Reset pagination baseline on query changes
//     }, 300);

//     return () => clearTimeout(timer);
//   }, [searchQuery]);

//   // 📡 1. Fetch Dynamic System Locations Lookup List via SWR
//   const { 
//     data: locations = [], 
//     isLoading: isLoadingLocations 
//   } = useSWR<LookupLocation[]>("/api/locations/lookup", fetcher, {
//     revalidateOnFocus: false,
//   });

//   // 📡 2. Fetch Location Inventory Stock & Summary Data via SWR
//   const inventoryApiUrl = locationId
//     ? `/api/admin/locations/${locationId}/inventory?search=${encodeURIComponent(
//         debouncedSearch
//       )}&page=${pageIndex}&limit=${PAGE_SIZE}`
//     : null;

//   const {
//     data: stockData,
//     error: stockError,
//     isLoading: isLoadingStock,
//     mutate: mutateStock,
//     isValidating: isValidatingStock,
//   } = useSWR<InventoryApiResponse>(inventoryApiUrl, fetcher);

//   // 📡 3. Fetch Inbound Freight Cargo via SWR
//   const {
//     data: inboundCargo = [],
//     isLoading: isLoadingInbound,
//     mutate: mutateInbound,
//     isValidating: isValidatingInbound,
//   } = useSWR<InboundTransitRow[]>(
//     locationId ? `/api/admin/locations/${locationId}/inbound-transit` : null,
//     fetcher
//   );

//   // Computed state helpers sourced from structured API layout
//   const location = stockData?.location;
//   const summary = stockData?.summary;
//   const inventory = stockData?.inventory ?? [];
//   const pagination = stockData?.pagination;

//   const isLoading = isLoadingStock || isLoadingInbound;
//   const isRefreshing = isValidatingStock || isValidatingInbound;

//   // Global metric fallbacks from isolated server engine response
//   const totalSKUs = summary?.totalSKUs ?? 0;
//   const totalOnHand = summary?.totalOnHand ?? 0;
//   const outOfStockCount = summary?.outOfStockCount ?? 0;
//   const totalInboundPipeline = inboundCargo.reduce((acc, curr) => acc + curr.quantityInTransit, 0);

//   // Unified data mutation trigger
//   const refreshAllData = async () => {
//     await Promise.all([mutateStock(), mutateInbound()]);
//   };

//   // Upstream Cloud Sync Handler for Individual Records
//   const handleSyncSingleProduct = (item: InventoryStockRow) => {
//     if (!location?.inflowId) {
//       toast.error("Please select a location before syncing inventory.");
//       return;
//     }

//     const targetProductId = item.productId;
//     setSyncingProductId(targetProductId);

//     toast.promise(
//       async () => {
//         const res = await fetch(`/api/sync`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             source: "single_inventory",
//             locationIds: [location.inflowId],
//             selectedRecords: [targetProductId],
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) {
//           throw new Error(data.error || `Failed to sync inventory for ${item.productName}`);
//         }

//         await refreshAllData();
//         return data;
//       },
//       {
//         loading: `Syncing cloud inventory for "${item.productName}"...`,
//         success: () => `Inventory for ${item.productName} updated successfully!`,
//         error: (err) => err.message || `Failed to sync ${item.productName}`,
//         finally: () => setSyncingProductId(null),
//       }
//     );
//   };

//   return (
//     <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
//       {/* Top Header Bar */}
//       <div className="flex flex-col gap-2">
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
//           <div className="flex items-start gap-3">
//             <div className="w-10 h-10 bg-muted border rounded-xl flex items-center justify-center shrink-0 mt-1">
//               <Warehouse className="w-5 h-5 text-muted-foreground" />
//             </div>
//             <div>
//               <h1 className="text-xl font-bold tracking-tight">
//                 {location?.name ? `${location.name} — Inventory` : "Inventory"}
//               </h1>
//               <p className="text-xs text-muted-foreground mt-0.5">
//                 Targeted internal warehouse balances, allocated bin vectors, and tracking references.
//               </p>
//             </div>
//           </div>
//           <div className="flex gap-2">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={refreshAllData}
//               disabled={isRefreshing}
//               className="h-8 gap-1.5 text-xs"
//             >
//               <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
//               Refresh Data
//             </Button>
//             <Button asChild size="sm" className="h-8 gap-1.5 text-xs">
//               <Link href="/dashboard/inventory/new">Post Adjustment</Link>
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* 📊 High-Level Metrics Summary (Separated Global Aggregates) */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//         <Card className="shadow-none rounded-xl bg-card border">
//           <CardHeader className="p-4 pb-1">
//             <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
//               <Package className="w-3 h-3 text-blue-500" /> Catalog SKUs
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="p-4 pt-0">
//             <div className="text-xl font-bold tracking-tight">{totalSKUs}</div>
//           </CardContent>
//         </Card>

//         <Card className="shadow-none rounded-xl bg-card border">
//           <CardHeader className="p-4 pb-1">
//             <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
//               <Layers3 className="w-3 h-3 text-emerald-500" /> Aggregated On Hand
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="p-4 pt-0">
//             <div className="text-xl font-bold tracking-tight">
//               {totalOnHand.toLocaleString()}{" "}
//               <span className="text-xs font-normal text-muted-foreground">units</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="shadow-none rounded-xl bg-card border">
//           <CardHeader className="p-4 pb-1">
//             <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
//               <Truck className="w-3 h-3 text-purple-500" /> Inbound Expected
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="p-4 pt-0">
//             <div className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
//               +{totalInboundPipeline.toLocaleString()}{" "}
//               <span className="text-xs font-normal text-muted-foreground">units</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="shadow-none rounded-xl bg-card border">
//           <CardHeader className="p-4 pb-1">
//             <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
//               <AlertTriangle className="w-3 h-3 text-destructive" /> Stock-Out Critical
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="p-4 pt-0">
//             <div className={`text-xl font-bold tracking-tight ${outOfStockCount > 0 ? "text-destructive" : ""}`}>
//               {outOfStockCount}
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* 🚀 Inbound Shipments Monitor Component */}
//       <InboundTransitMonitor shipments={inboundCargo} />

//       {/* Filter Controls */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
//         <div className="relative w-full sm:max-w-sm">
//           <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
//           <Input
//             placeholder="Search SKU name or slug inside this warehouse..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="pl-9 text-xs"
//           />
//         </div>
//       </div>

//       {/* Inventory Data Table */}
//       {isLoading ? (
//         <div className="p-16 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-sm">
//           Isolating location stock configurations...
//         </div>
//       ) : stockError ? (
//         <div className="p-16 text-center text-xs text-destructive bg-card border border-destructive/20 rounded-xl shadow-sm">
//           Failed to fetch location inventory data. Please try again.
//         </div>
//       ) : inventory.length === 0 ? (
//         <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
//           No inventory stock items matching current parameters found for this facility.
//         </div>
//       ) : (
//         <div className="space-y-4">
//           <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full text-left border-collapse">
//                 <thead>
//                   <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
//                     <th className="p-4">SKU Product Line</th>
//                     <th className="p-4 text-right">On Hand</th>
//                     <th className="p-4 text-right">Committed</th>
//                     <th className="p-4 text-right">Outbound Transit</th>
//                     <th className="p-4 text-right">Available for Sale</th>
//                     <th className="p-4 text-center">Sub-bins & Bulk</th>
//                     <th className="p-4 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y text-xs">
//                   {inventory.map((item) => {
//                     const isItemSyncing = syncingProductId === item.productId;
//                     const isOutOfStock = item.quantityAvailable <= 0;
//                     const isStrained = item.quantityReserved > item.quantityOnHand * 0.5;
//                     const isLowStock =
//                       item.reorderThreshold > 0 && item.quantityAvailable <= item.reorderThreshold;

//                     const totalBinQty = item.bins.reduce((sum, b) => sum + b.quantity, 0);
//                     const bulkAreaQty = Math.max(0, item.quantityOnHand - totalBinQty);

//                     return (
//                       <tr
//                         key={item.id}
//                         className={`hover:bg-muted/20 transition-colors ${
//                           isLowStock ? "bg-amber-50/30 dark:bg-amber-950/15" : ""
//                         }`}
//                       >
//                         <td className="p-4 max-w-[300px]">
//                           <div className="flex items-center gap-2.5">
//                             <div className="w-7 h-7 bg-muted border rounded-md flex items-center justify-center shrink-0">
//                               <Package className="w-3.5 h-3.5 text-muted-foreground/80" />
//                             </div>
//                             <div className="min-w-0">
//                               <span className="font-semibold text-foreground block truncate">
//                                 {item.productName}
//                               </span>
//                               <span className="font-mono text-[10px] text-muted-foreground block truncate">
//                                 {item.productSlug}
//                               </span>
//                             </div>
//                             {isLowStock && (
//                               <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
//                                 <AlertCircle className="w-2.5 h-2.5" /> LOW STOCK
//                               </span>
//                             )}
//                           </div>
//                         </td>

//                         <td className="p-4 text-right font-mono font-medium text-foreground">
//                           {item.quantityOnHand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//                         </td>

//                         <td className="p-4 text-right font-mono text-muted-foreground">
//                           {item.quantityReserved > 0 ? (
//                             <span className={isStrained ? "text-amber-600 font-bold" : ""}>
//                               {item.quantityReserved.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//                             </span>
//                           ) : (
//                             <span className="opacity-30">-</span>
//                           )}
//                         </td>

//                         <td className="p-4 text-right font-mono text-muted-foreground">
//                           {item.quantityInTransit > 0 ? (
//                             <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded-sm text-[10px]">
//                               {item.quantityInTransit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//                             </span>
//                           ) : (
//                             <span className="opacity-30">-</span>
//                           )}
//                         </td>

//                         <td className="p-4 text-right font-mono">
//                           {isOutOfStock ? (
//                             <span className="text-destructive font-bold inline-flex items-center gap-1 bg-destructive/10 px-1.5 py-0.5 rounded-sm">
//                               <AlertTriangle className="w-3 h-3" /> 0.00
//                             </span>
//                           ) : (
//                             <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
//                               {item.quantityAvailable.toLocaleString(undefined, {
//                                 minimumFractionDigits: 2,
//                                 maximumFractionDigits: 4,
//                               })}
//                             </span>
//                           )}
//                         </td>

//                         <td className="p-4 text-center">
//                           <button
//                             type="button"
//                             onClick={() => setActiveInspectionItem(item)}
//                             className="inline-flex items-center gap-1.5 bg-muted/60 hover:bg-muted border px-2.5 py-1 rounded-md transition-colors text-[11px]"
//                           >
//                             <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
//                             <span className="font-semibold">
//                               {item.bins.length} {item.bins.length === 1 ? "bin" : "bins"}
//                             </span>
//                             <span className="text-muted-foreground font-mono text-[10px] pl-1 border-l border-muted-foreground/30">
//                               Bulk:{" "}
//                               <strong className="text-amber-600 dark:text-amber-400 font-medium">
//                                 {bulkAreaQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
//                               </strong>
//                             </span>
//                           </button>
//                         </td>

//                         <td className="p-4 text-right">
//                           <div className="flex items-center justify-end gap-1.5">
//                             <Button
//                               variant="ghost"
//                               size="icon"
//                               disabled={isItemSyncing}
//                               onClick={() => handleSyncSingleProduct(item)}
//                               className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/5"
//                               title={`Fetch Latest Cloud Inventory for ${item.productName}`}
//                             >
//                               <RefreshCw
//                                 className={`w-3.5 h-3.5 ${
//                                   isItemSyncing ? "animate-spin text-indigo-500" : ""
//                                 }`}
//                               />
//                             </Button>

//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600"
//                               title="Configure Auto-Replenishment Rules"
//                               onClick={() => {
//                                 setSelectedReplenishItem(item);
//                                 setIsReplenishModalOpen(true);
//                               }}
//                             >
//                               <Sliders className="w-3.5 h-3.5" />
//                             </Button>

//                             <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs font-semibold gap-1">
//                               <Link href={`/dashboard/inventory/${item.id}/edit`}>
//                                 <Edit className="w-3 h-3" /> Adjust
//                               </Link>
//                             </Button>
//                           </div>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* Pagination Controls */}
//           {pagination && pagination.pageCount > 1 && (
//             <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
//               <span>
//                 Page {pageIndex + 1} of {pagination.pageCount} ({pagination.totalRecords} records)
//               </span>
//               <div className="flex items-center gap-2">
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   disabled={pageIndex === 0}
//                   onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
//                   className="h-7 px-3 text-xs"
//                 >
//                   Previous
//                 </Button>
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   disabled={pageIndex + 1 >= pagination.pageCount}
//                   onClick={() => setPageIndex((p) => p + 1)}
//                   className="h-7 px-3 text-xs"
//                 >
//                   Next
//                 </Button>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Slide-out Inspection Modal Panel */}
//       {activeInspectionItem && (() => {
//         const totalBinQty = activeInspectionItem.bins.reduce((sum, bin) => sum + bin.quantity, 0);
//         const bulkAreaQty = Math.max(0, activeInspectionItem.quantityOnHand - totalBinQty);

//         return (
//           <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
//             <div className="bg-card border w-full max-w-md rounded-xl p-5 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
//               <div className="flex items-start justify-between border-b pb-3">
//                 <div>
//                   <h3 className="text-sm font-bold text-foreground">Storage Layout Inspection</h3>
//                   <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{activeInspectionItem.productSlug}</p>
//                 </div>
//                 <Badge variant="outline" className="text-[10px] py-0 h-5 border-blue-200 text-blue-600 bg-blue-50">
//                   {location?.name || "Location"}
//                 </Badge>
//               </div>

//               {/* Total Summary Matrix Cards */}
//               <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-lg border text-center">
//                 <div>
//                   <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">Total On Hand</span>
//                   <span className="text-xs font-mono font-bold text-foreground">
//                     {activeInspectionItem.quantityOnHand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                   </span>
//                 </div>
//                 <div>
//                   <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">In Bins</span>
//                   <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
//                     {totalBinQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                   </span>
//                 </div>
//                 <div>
//                   <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">Bulk Area</span>
//                   <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
//                     {bulkAreaQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                   </span>
//                 </div>
//               </div>

//               {/* Picking Slots & Bulk Area Detailed Breakdown */}
//               <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
//                 <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
//                   Storage Allocation Breakdown
//                 </div>

//                 {/* Bulk Floor Row */}
//                 <div className="flex items-center justify-between border p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 font-medium">
//                   <span className="text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
//                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
//                     Bulk Floor / Unassigned Area
//                   </span>
//                   <span className="font-mono text-xs text-amber-800 dark:text-amber-400">
//                     <strong className="text-amber-950 dark:text-amber-200">
//                       {bulkAreaQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                     </strong>{" "}
//                     units
//                   </span>
//                 </div>

//                 {/* Assigned Sub-bins Rows */}
//                 {activeInspectionItem.bins.map((bin) => (
//                   <div key={bin.id} className="flex items-center justify-between border p-2 rounded-lg bg-muted/30 font-medium">
//                     <span className="text-xs text-foreground flex items-center gap-2">
//                       <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
//                       {bin.sublocationName}
//                     </span>
//                     <span className="font-mono text-xs text-muted-foreground">
//                       <strong className="text-foreground">
//                         {bin.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                       </strong>{" "}
//                       units
//                     </span>
//                   </div>
//                 ))}
//               </div>

//               <div className="flex justify-end pt-2 border-t">
//                 <Button
//                   type="button"
//                   variant="outline"
//                   size="sm"
//                   onClick={() => setActiveInspectionItem(null)}
//                   className="text-xs px-4"
//                 >
//                   Close View
//                 </Button>
//               </div>
//             </div>
//           </div>
//         );
//       })()}

//       {selectedReplenishItem && (
//         <ReplenishmentSettingsModal
//           isOpen={isReplenishModalOpen}
//           onClose={() => {
//             setIsReplenishModalOpen(false);
//             setSelectedReplenishItem(null);
//           }}
//           locations={locations}
//           isLoadingLocations={isLoadingLocations}
//           inventoryItem={{
//             id: selectedReplenishItem.id,
//             productName: selectedReplenishItem.productName,
//             productSlug: selectedReplenishItem.productSlug,
//             reorderThreshold: selectedReplenishItem.reorderThreshold || 0,
//             reorderQuantity: selectedReplenishItem.reorderQuantity || 0,
//             isAutoReorderEnabled: selectedReplenishItem.isAutoReorderEnabled || false,
//             preferredSourceLocationId: selectedReplenishItem.preferredSourceLocationId || null,
//           }}
//           onSaveSuccess={refreshAllData}
//         />
//       )}
//     </div>
//   );
// }
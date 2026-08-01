"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Layers,
  Settings2,
  ExternalLink,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { useLocationWorkspace } from "@/context/LocationWorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LocationWorkspaceStatus } from "@/components/location/location-workspace";
import { OnlineStatusToggleCard } from "@/components/location/location-online-status-toggle";

export default function LocationWorkspaceSettingsPage() {
  const {
    locations,
    currentLocationId,
    activeLocation,
    isLoading,
    isBrowserOnline,
    changeLocation,
    mutateLocations,
  } = useLocationWorkspace();

  // Modal State Management
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [targetLocationId, setTargetLocationId] = useState<string | null>(null);

  // Open modal for a specific location context
  const handleOpenWorkspaceModal = (locationId: string) => {
    // Optionally auto-select the location context when managing
    changeLocation(locationId);
    setTargetLocationId(locationId);
    setIsWorkspaceModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsWorkspaceModalOpen(open);
    if (!open) {
      setTargetLocationId(null);
    }
  };

  const activeModalLocation = locations?.find(
    (loc) => loc.id === (targetLocationId || currentLocationId)
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title="Location Node Integration & Workspace Status"
        description="Manage real-time node webhooks, monitor endpoint health status, and switch current operational location contexts."
        icon={MapPin}
        className="border-b border-border pb-4"
      />

      <OnlineStatusToggleCard />

      {/* Global Status Banner / Overview Card */}
      <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary animate-pulse" />
              Global Operational Network State
            </CardTitle>

            <div className="flex items-center gap-2">
              <Badge
                variant={isBrowserOnline ? "default" : "destructive"}
                className="gap-1 px-2.5 py-0.5 text-xs font-semibold"
              >
                {isBrowserOnline ? (
                  <>
                    <Wifi className="h-3 w-3" /> Network Online
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" /> Offline Mode
                  </>
                )}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={() => mutateLocations()}
                disabled={isLoading}
                className="h-8 gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Re-sync Workspace
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            Subscribed nodes poll endpoint telemetry every 15 seconds. Active context switches propagate across all dependent modules.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Location Selector Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Active Workspace Terminals:
              </label>

              {currentLocationId && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleOpenWorkspaceModal(currentLocationId)}
                  className="h-auto p-0 text-xs font-medium gap-1 text-primary"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Manage Active Node Workspace
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="h-10 w-full animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {locations?.map((loc) => {
                  const isSelected = loc.id === currentLocationId;
                  return (
                    <div
                      key={loc.id}
                      className={`flex flex-col justify-between p-3 rounded-lg border text-left transition-all space-y-3 ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate pr-1">
                          <p className="text-xs font-semibold truncate">{loc.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            ID: {loc.id}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              loc.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {isSelected && (
                            <Badge className="h-4 px-1 text-[9px] uppercase font-bold">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "secondary"}
                          size="sm"
                          onClick={() => changeLocation(loc.id)}
                          className="h-7 text-[11px] flex-1"
                        >
                          {isSelected ? "Current Context" : "Select Context"}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenWorkspaceModal(loc.id)}
                          className="h-7 px-2 text-[11px] gap-1"
                          title="Manage Webhooks & Workspace Logs"
                        >
                          <Settings2 className="h-3 w-3" />
                          <span className="hidden xl:inline">Inspect</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Status & Webhook Management Modal Dialog */}
      <Dialog open={isWorkspaceModalOpen} onOpenChange={handleModalClose}>
        {/* <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto"> */}
        <DialogContent className="sm:max-w-5xl max-h-[95vh] flex flex-col">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Location Node Webhook & Integration Workspace
            </DialogTitle>
            <DialogDescription className="text-xs">
              Managing health status, real-time webhooks, and audit events for{" "}
              <span className="font-semibold text-foreground">
                {activeModalLocation?.name || "Selected Location"}
              </span>{" "}
              (ID: {targetLocationId || currentLocationId}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {targetLocationId || currentLocationId ? (
              <LocationWorkspaceStatus
                selectedLocationInflowId={targetLocationId || currentLocationId!}
              />
            ) : (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No active location specified for inspection.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
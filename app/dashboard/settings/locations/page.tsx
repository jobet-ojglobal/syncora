"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, Radio, Wifi, WifiOff, RefreshCw, Layers } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { useLocationWorkspace } from "@/context/LocationWorkspaceContext"; // adjust import path as needed
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-6 p-6">
      {/* Navigation Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/locations"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Locations
        </Link>
        <PageHeader
          title="Location Node Integration & Workspace Status"
          description="Manage real-time node webhooks, monitor endpoint health status, and switch current operational location contexts."
          icon={MapPin}
        />

      </div>

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

        <CardContent>
          {/* Location Selector Grid */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Active Workspace Terminal:
            </label>

            {isLoading ? (
              <div className="h-10 w-full animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {locations?.map((loc) => {
                  const isSelected = loc.id === currentLocationId;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => changeLocation(loc.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="truncate pr-2">
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Status & Webhook Management View */}
      {currentLocationId ? (
        <LocationWorkspaceStatus selectedLocationInflowId={currentLocationId} />
      ) : (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm text-muted-foreground">
            No active location selected. Please choose a location node from above to inspect logs and configuration status.
          </p>
        </Card>
      )}
    </div>
  );
}
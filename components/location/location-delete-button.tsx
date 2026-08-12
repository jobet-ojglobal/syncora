"use client";

import { useState } from "react";
import {
  Trash2Icon,
  Loader2,
  AlertTriangle,
  ArrowRightLeft,
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TargetLocationOption {
  id: string;
  name: string;
}

interface LocationDeleteButtonProps {
  locationId: string;
  locationName: string;
  endpointUrl?: string; // e.g., "/api/admin/locations"
  availableLocations?: TargetLocationOption[];
  onSuccess?: (id: string) => void;
  variant?: "icon" | "full";
}

type DialogStep = "CONFIRM_DELETE" | "RESOLVE_DEPENDENCIES";
type InventoryStrategy = "TRANSFER" | "WRITEOFF";

export function LocationDeleteButton({
  locationId,
  locationName,
  endpointUrl = `/api/admin/locations`,
  availableLocations = [],
  onSuccess,
  variant = "icon",
}: LocationDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("CONFIRM_DELETE");
  const [isDeleting, setIsDeleting] = useState(false);

  // Dependency details received from 409 backend response
  const [dependencySummary, setDependencySummary] = useState<{
    units: number;
    salesOrdersCount: number;
    purchaseOrdersCount: number;
    transferOrdersCount: number;
  }>({ units: 0, salesOrdersCount: 0, purchaseOrdersCount: 0, transferOrdersCount: 0 });

  // Form State for Dependency Resolution
  const [inventoryStrategy, setInventoryStrategy] = useState<InventoryStrategy>("TRANSFER");
  const [targetLocationId, setTargetLocationId] = useState<string>("");
  const [reassignTargetLocationId, setReassignTargetLocationId] = useState<string>("");

  // Step 1: Initial Delete Trigger
  const handleDeleteAttempt = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`${endpointUrl}/${locationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 409) {
        const errorData = await response.json();
        setDependencySummary({
          units: errorData.counts?.activeInventory ?? 0,
          salesOrdersCount: errorData.counts?.salesOrders ?? 0,
          purchaseOrdersCount: errorData.counts?.purchaseOrders ?? 0,
          transferOrdersCount: errorData.counts?.transfers ?? 0,
        });
        setStep("RESOLVE_DEPENDENCIES");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete location.");
      }

      const data = await response.json();
      toast.success("Location Removed", {
        description: data.message || `Successfully removed "${locationName}".`,
      });

      handleClose();
      if (onSuccess) onSuccess(locationId);
    } catch (err: any) {
      console.error("Deletion error:", err);
      toast.error("Deletion Failed", {
        description: err.message || "Could not complete the request.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasOrdersToReassign =
    dependencySummary.salesOrdersCount > 0 ||
    dependencySummary.purchaseOrdersCount > 0 ||
    dependencySummary.transferOrdersCount > 0;

  // Step 2: Resolution Submission
  const handleResolveAndArchive = async () => {
    if (dependencySummary.units > 0 && inventoryStrategy === "TRANSFER" && !targetLocationId) {
      toast.error("Target Location Required", {
        description: "Please select a destination warehouse to transfer inventory.",
      });
      return;
    }

    if (hasOrdersToReassign && !reassignTargetLocationId) {
      toast.error("Reassignment Location Required", {
        description: "Please select a target location to reassign active orders.",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`${endpointUrl}/${locationId}/decommission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryStrategy: dependencySummary.units > 0 ? inventoryStrategy : null,
          targetLocationId: inventoryStrategy === "TRANSFER" ? targetLocationId : null,
          reassignTargetLocationId: hasOrdersToReassign ? reassignTargetLocationId : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to resolve dependencies.");
      }

      const data = await response.json();
      toast.success("Location Decommissioned", {
        description: data.message || `Dependencies reassigned and "${locationName}" archived.`,
      });

      handleClose();
      if (onSuccess) onSuccess(locationId);
    } catch (err: any) {
      console.error("Resolution error:", err);
      toast.error("Action Failed", {
        description: err.message || "Could not complete resolution.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setStep("CONFIRM_DELETE");
      setInventoryStrategy("TRANSFER");
      setTargetLocationId("");
      setReassignTargetLocationId("");
    }, 200);
  };

  const eligibleTargetLocations = availableLocations.filter((loc) => loc.id !== locationId);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogTrigger asChild onClick={() => setIsOpen(true)}>
        {variant === "icon" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            title={`Delete ${locationName}`}
          >
            <Trash2Icon className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full gap-1.5 text-xs font-semibold"
          >
            <Trash2Icon className="w-3.5 h-3.5" /> Delete
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-md">
        {step === "CONFIRM_DELETE" ? (
          <>
            <AlertDialogHeader>
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                <Trash2Icon className="w-5 h-5" />
              </div>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will attempt to remove{" "}
                <span className="font-semibold text-foreground">&quot;{locationName}&quot;</span>.
                If active inventory or pending orders exist, you will be prompted to resolve and reassign them.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleDeleteAttempt} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Checking...
                  </>
                ) : (
                  "Delete Location"
                )}
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader className="space-y-2">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-500">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <AlertDialogTitle className="text-base font-bold text-foreground">
                  Active Dependencies Identified
                </AlertDialogTitle>
              </div>

              <AlertDialogDescription asChild>
                <div className="text-xs text-muted-foreground pt-1 space-y-1">
                    {dependencySummary.units > 0 && (
                    <p className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-foreground" />
                        Stock:{" "}
                        <strong className="text-foreground">
                        {dependencySummary.units.toLocaleString()} units
                        </strong>
                    </p>
                    )}

                    {dependencySummary.salesOrdersCount > 0 && (
                    <p className="flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-foreground" />
                        Open Sales Orders:{" "}
                        <strong className="text-foreground">
                        {dependencySummary.salesOrdersCount}
                        </strong>
                    </p>
                    )}

                    {dependencySummary.purchaseOrdersCount > 0 && (
                    <p className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-foreground" />
                        Open Purchase Orders:{" "}
                        <strong className="text-foreground">
                        {dependencySummary.purchaseOrdersCount}
                        </strong>
                    </p>
                    )}

                    {dependencySummary.transferOrdersCount > 0 && (
                    <p className="flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-foreground" />
                        Pending Transfers:{" "}
                        <strong className="text-foreground">
                        {dependencySummary.transferOrdersCount}
                        </strong>
                    </p>
                    )}
                </div>
                </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-3 space-y-4">
              {/* Active Inventory Resolution */}
              {dependencySummary.units > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">1. Active Inventory</Label>
                  <RadioGroup
                    value={inventoryStrategy}
                    onValueChange={(v) => setInventoryStrategy(v as InventoryStrategy)}
                    className="space-y-2"
                  >
                    <div
                      className={`flex items-start space-x-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        inventoryStrategy === "TRANSFER" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                      }`}
                      onClick={() => setInventoryStrategy("TRANSFER")}
                    >
                      <RadioGroupItem value="TRANSFER" id="opt-transfer" className="mt-0.5" />
                      <Label htmlFor="opt-transfer" className="font-medium text-xs cursor-pointer flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-primary" /> Transfer stock to target warehouse
                      </Label>
                    </div>

                    <div
                      className={`flex items-start space-x-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        inventoryStrategy === "WRITEOFF" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                      }`}
                      onClick={() => setInventoryStrategy("WRITEOFF")}
                    >
                      <RadioGroupItem value="WRITEOFF" id="opt-writeoff" className="mt-0.5" />
                      <Label htmlFor="opt-writeoff" className="font-medium text-xs cursor-pointer flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" /> Write off inventory to $0.00
                      </Label>
                    </div>
                  </RadioGroup>

                  {inventoryStrategy === "TRANSFER" && (
                    <div className="space-y-1 pt-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Destination Inventory Warehouse</Label>
                      <Select value={targetLocationId} onValueChange={setTargetLocationId}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Select Destination Warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleTargetLocations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id} className="text-xs">
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Order Reassignment Section */}
              {hasOrdersToReassign && (
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold text-foreground">
                    {dependencySummary.units > 0 ? "2. " : "1. "}Reassign Active Orders & Settings
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    All active sales orders, purchase orders, transfers, and reorder configs will be assigned to:
                  </p>
                  <Select value={reassignTargetLocationId} onValueChange={setReassignTargetLocationId}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select Replacement Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleTargetLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id} className="text-xs">
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel disabled={isDeleting} onClick={handleClose}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="default"
                onClick={handleResolveAndArchive}
                disabled={isDeleting}
                className="bg-primary hover:bg-primary/90 text-xs font-medium"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Processing...
                  </>
                ) : (
                  "Reassign & Decommission"
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
// components/TeamMemberForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { teamMemberSchema, TeamMemberInput } from "@/schemas/team-member.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Shield, Warehouse, ArrowLeft, CheckSquare, Square } from "lucide-react";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";

// Segmented mapping permissions dictionary to build a scannable admin dashboard layout
const PERMISSION_GROUPS = {
  "Sales & Customers Operations": [
    "SalesOrderView", "SalesOrderEdit", "SalesOrderPick", "SalesOrderPrioritization",
    "CustomerView", "CustomerEdit", "SalesPriceEdit"
  ],
  "Purchasing & Vendors Pipeline": [
    "PurchaseOrderView", "PurchaseOrderEdit", "PurchaseOrderReceive", "VendorView", "VendorEdit"
  ],
  "Inventory Controls & Tracking": [
    "CurrentStockView", "MovementHistoryView", "ReorderStock", "CountSheetView", 
    "CountSheetEdit", "CountSheetOnly", "TransferStockView", "TransferStockEdit", 
    "AdjustStockView", "AdjustStockEdit"
  ],
  "Products & Catalog Config": [
    "ProductView", "ProductEdit", "ProductCostingView", "ProductCostingEdit", "ProductCategoryEdit"
  ],
  "Manufacturing & Labor Metrics": [
    "ManufacturingOrderView", "ManufacturingOrderEdit", "ManufacturingOrderPrioritization",
    "StockroomScanView", "StockroomScanEdit", "EstimatedLaborHoursView", "EstimatedLaborHoursEdit",
    "ActualLaborHoursView", "ActualLaborHoursEdit", "CurrentOperationsView", "CurrentOperationsEdit"
  ],
  "System Administration Tools": [
    "SettingsView", "SettingsEdit", "ImportData", "ExportData", "BackupData", 
    "PrintSettingsView", "PrintSettingsEdit", "Integrations", "Reports", "ResetAllData"
  ]
};

interface LocationReference {
  inflowId: string;
  name: string;
  code: string;
}

interface TeamMemberFormProps {
  locationLookup: LocationReference[];
  initialData?: any | null;
}

export function TeamMemberForm({ locationLookup, initialData }: TeamMemberFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<TeamMemberInput>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: initialData || {
      inflowId: `TM-${Math.random().toString(36).substr(2, 7).toUpperCase()}`,
      name: "",
      email: "",
      isActive: true,
      canBeSalesRep: false,
      accessAllLocations: false,
      accessRights: [],
      locationInflowIds: [],
    },
  });

  const { register, setValue, watch, handleSubmit, formState: { errors, isSubmitting } } = form;

  const currentRights = watch("accessRights") || [];
  const currentLocations = watch("locationInflowIds") || [];
  const isGlobalLocation = watch("accessAllLocations");

  const toggleRight = (right: string) => {
    const updated = currentRights.includes(right)
      ? currentRights.filter((r) => r !== right)
      : [...currentRights, right];
    setValue("accessRights", updated, { shouldValidate: true });
  };

  const toggleLocation = (locInflowId: string) => {
    const updated = currentLocations.includes(locInflowId)
      ? currentLocations.filter((id) => id !== locInflowId)
      : [...currentLocations, locInflowId];
    setValue("locationInflowIds", updated, { shouldValidate: true });
  };

  const selectAllGroupRights = (groupKeys: string[], action: "all" | "none") => {
    const foreignRights = currentRights.filter(r => !groupKeys.includes(r));
    setValue("accessRights", action === "all" ? [...foreignRights, ...groupKeys] : foreignRights);
  };

  const onSubmit = async (values: TeamMemberInput) => {
    try {
      const response = await fetch("/api/admin/team-members", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Execution engine rejected identity authorization command.");
      }

      toast.success(isEditMode ? "Profile properties synchronized" : "Team operative provisioned successfully");
      router.push("/dashboard/team-members");
      router.refresh();
    } catch (err: any) {
      toast.error("Security Write Aborted", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-8 text-xs">
      <FieldGroup className="gap-6">
        
        {/* SECTION 1: Identity & Assignment Flags */}
        <FieldSet className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <FieldLegend className="col-span-1 md:col-span-12 flex items-center gap-2 border-b pb-2 text-foreground font-semibold text-sm">
            <Users className="w-4 h-4 text-primary" /> Directory Identity Metadata Profile
          </FieldLegend>

          <Field className="md:col-span-3">
            <FieldLabel>Inflow System ID *</FieldLabel>
            <Input {...register("inflowId")} disabled={isEditMode} className="font-mono bg-muted/20 uppercase" />
          </Field>

          <Field className="md:col-span-5">
            <FieldLabel>Full User Name *</FieldLabel>
            <Input placeholder="e.g., Sarah Jenkins" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </Field>

          <Field className="md:col-span-4">
            <FieldLabel>Corporate Email Address *</FieldLabel>
            <Input type="email" placeholder="s.jenkins@enterprise.com" {...register("email")} />
            {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
          </Field>

          <Field className="md:col-span-4 border p-3 rounded-lg bg-muted/5 flex items-center justify-between">
            <div>
              <label className="font-semibold text-foreground block">Operative Status</label>
              <span className="text-[10px] text-muted-foreground">Allow login and active assignment route flags.</span>
            </div>
            <Switch checked={watch("isActive")} onCheckedChange={(val) => setValue("isActive", val)} />
          </Field>

          <Field className="md:col-span-4 border p-3 rounded-lg bg-muted/5 flex items-center justify-between">
            <div>
              <label className="font-semibold text-foreground block">Sales Representative Account</label>
              <span className="text-[10px] text-muted-foreground">Authorize entity attachment hooks onto customer portfolios.</span>
            </div>
            <Switch checked={watch("canBeSalesRep")} onCheckedChange={(val) => setValue("canBeSalesRep", val)} />
          </Field>

          <Field className="md:col-span-4 border p-3 rounded-lg bg-muted/5 flex items-center justify-between">
            <div>
              <label className="font-semibold text-foreground block">Global Locations Clearance</label>
              <span className="text-[10px] text-muted-foreground">Bypass location maps checking to grant access to all sites.</span>
            </div>
            <Switch checked={watch("accessAllLocations")} onCheckedChange={(val) => setValue("accessAllLocations", val)} />
          </Field>
        </FieldSet>

        {/* SECTION 2: Physical Inventory Space Scopes */}
        {!isGlobalLocation && (
          <FieldSet className="border-t pt-4 space-y-3">
            <FieldLegend className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <Warehouse className="w-4 h-4 text-muted-foreground" /> Confined Warehouse Location Mapping Clearances
            </FieldLegend>
            <p className="text-[11px] text-muted-foreground">Select physical branch locations this user is authorized to manage, count, or transfer inventory within.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {locationLookup.map((loc) => {
                const isChecked = currentLocations.includes(loc.inflowId);
                return (
                  <button
                    type="button"
                    key={loc.inflowId}
                    onClick={() => toggleLocation(loc.inflowId)}
                    className={`flex items-center gap-2 p-2.5 border rounded-lg text-left transition-all ${
                      isChecked 
                        ? "bg-primary/5 border-primary shadow-3xs" 
                        : "bg-background border-input hover:border-muted-foreground/30"
                    }`}
                  >
                    {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" /> : <Square className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    <div className="truncate">
                      <span className="font-mono text-[10px] font-bold block text-muted-foreground leading-none">{loc.code}</span>
                      <span className="font-medium text-foreground text-[11px] truncate mt-1 block">{loc.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </FieldSet>
        )}

        {/* SECTION 3: Fine-Grained Functional Security Access Rights Matrix */}
        <FieldSet className="border-t pt-4 space-y-4">
          <FieldLegend className="flex items-center gap-2 font-semibold text-foreground text-sm">
            <Shield className="w-4 h-4 text-muted-foreground" /> Granular Access Control Policy Parameters
          </FieldLegend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PERMISSION_GROUPS).map(([groupName, rights]) => {
              const totalCheckedInGroup = rights.filter(r => currentRights.includes(r)).length;
              
              return (
                <div key={groupName} className="border rounded-xl bg-muted/10 p-4 space-y-3 shadow-3xs">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="font-bold text-foreground tracking-tight">{groupName}</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button type="button" onClick={() => selectAllGroupRights(rights, "all")} className="text-primary hover:underline">Select All</button>
                      <span className="text-muted-foreground/40">|</span>
                      <button type="button" onClick={() => selectAllGroupRights(rights, "none")} className="text-muted-foreground hover:text-foreground">Clear</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {rights.map((right) => {
                      const isActiveRight = currentRights.includes(right);
                      return (
                        <button
                          type="button"
                          key={right}
                          onClick={() => toggleRight(right)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-left text-[11px] transition-all truncate ${
                            isActiveRight
                              ? "bg-background border-primary/40 text-foreground font-medium shadow-3xs"
                              : "bg-background/40 border-border/60 text-muted-foreground hover:border-input"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isActiveRight ? "bg-primary" : "bg-slate-300"}`} />
                          <span className="truncate" title={right}>{right.replace(/([A-Z])/g, " $1").trim()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </FieldSet>

        {/* Form Actions Footer block */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-xs">
            <ArrowLeft className="w-4 h-4" /> Return to Directory
          </Button>
          <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[150px] text-xs">
            {isSubmitting ? "Syncing credentials..." : isEditMode ? "Save Operative Profile" : "Deploy Team Provisioning"}
          </Button>
        </div>

      </FieldGroup>
    </form>
  );
}
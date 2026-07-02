// components/LocationForm.tsx
"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationSchema, LocationInput } from "@/schemas/location.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, MapPin, Layers, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

interface LocationFormProps {
  initialData?: {
    inflowId: string;
    name: string;
    isActive: boolean;
    isDefault: boolean;
    address: {
      address1: string | null;
      address2: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      postalCode: string | null;
      remarks: string | null;
      addressType: string | null;
    } | null;
    sublocations: { id: string; name: string }[];
  } | null;
}

export function LocationForm({ initialData }: LocationFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      inflowId: initialData?.inflowId,
      name: initialData?.name || "",
      isActive: initialData?.isActive ?? true,
      isDefault: initialData?.isDefault ?? false,
      address: {
        address1: initialData?.address?.address1 || "",
        address2: initialData?.address?.address2 || "",
        city: initialData?.address?.city || "",
        state: initialData?.address?.state || "",
        country: initialData?.address?.country || "",
        postalCode: initialData?.address?.postalCode || "",
        remarks: initialData?.address?.remarks || "",
        addressType: initialData?.address?.addressType || "Warehouse",
      },
      sublocations: initialData?.sublocations || [],
    },
  });

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = form;

  // Manage the 1:Many sublocation fields array
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sublocations",
  });

  const onSubmit = async (values: LocationInput) => {
    try {
      const endpoint = "/api/admin/locations";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to commit inventory location.");
      }

      toast.success(isEditMode ? "Location Profile Updated" : "Location Successfully Created", {
        description: `Committed logistics mapping for "${values.name}".`,
      });

      router.push("/dashboard/locations");
      router.refresh();
    } catch (err: any) {
      toast.error("Execution Error", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full mx-auto p-6 bg-card border rounded-xl shadow-sm space-y-6 text-xs">
      
      {/* SECTION 1: Top Core Identity Options */}
      <FieldGroup className="gap-5">
        <FieldSet>
          <FieldLegend className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            {isEditMode ? `Modify Logistics Hub: ${initialData?.name}` : "Establish New Logistics Facility"}
          </FieldLegend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="loc-name">Facility Depot Name *</FieldLabel>
              <Input id="loc-name" placeholder="e.g., Seattle Regional Fulfillment (WH-02)" {...register("name")} />
              {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
            </Field>

            <Field className="flex items-center justify-between border p-3 rounded-xl bg-muted/20">
              <div>
                <FieldLabel className="text-xs font-semibold mb-0">Active Status</FieldLabel>
                <p className="text-[11px] text-muted-foreground">Allows processing order fulfillment transfers</p>
              </div>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </Field>

            <Field className="flex items-center justify-between border p-3 rounded-xl bg-muted/20">
              <div>
                <FieldLabel className="text-xs font-semibold mb-0">Default System Site</FieldLabel>
                <p className="text-[11px] text-muted-foreground">Auto-selected on incoming procurement lines</p>
              </div>
              <Controller
                control={control}
                name="isDefault"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </Field>
          </div>
        </FieldSet>

        {/* SECTION 2: 1:1 Physical Mailing Address parameters */}
        <FieldSet className="border-t pt-5">
          <FieldLegend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Physical Site Coordinates & Address</FieldLegend>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <Field className="md:col-span-2">
              <FieldLabel>Street Address line 1</FieldLabel>
              <Input placeholder="e.g., 4200 Industry Highway" {...register("address.address1")} />
              {errors.address?.address1 && <span className="text-xs text-destructive">{errors.address.address1.message}</span>}
            </Field>

            <Field>
              <FieldLabel>Suite / Aisle Box</FieldLabel>
              <Input placeholder="e.g., Dock 4, Bay B" {...register("address.address2")} />
            </Field>

            <Field>
              <FieldLabel>City *</FieldLabel>
              <Input placeholder="Seattle" {...register("address.city")} />
              {errors.address?.city && <span className="text-xs text-destructive">{errors.address.city.message}</span>}
            </Field>

            <Field>
              <FieldLabel>State / Province</FieldLabel>
              <Input placeholder="WA" {...register("address.state")} />
            </Field>

            <Field>
              <FieldLabel>Postal / Zip Code</FieldLabel>
              <Input placeholder="98101" {...register("address.postalCode")} />
            </Field>

            <Field>
              <FieldLabel>Country *</FieldLabel>
              <Input placeholder="United States" {...register("address.country")} />
              {errors.address?.country && <span className="text-xs text-destructive">{errors.address.country.message}</span>}
            </Field>

            <Field>
              <FieldLabel>Site Use Designation</FieldLabel>
              <Input placeholder="e.g., Warehouse, Storefront, Logistics Partner" {...register("address.addressType")} />
            </Field>

            <Field className="md:col-span-3">
              <FieldLabel>Logistical Operational Access Remarks</FieldLabel>
              <Textarea placeholder="Include delivery access pin numbers, gate constraints or carrier drop metrics rules..." rows={2} {...register("address.remarks")} />
            </Field>
          </div>
        </FieldSet>

        {/* SECTION 3: Dynamic Sublocation Array List Configurer */}
        <FieldSet className="border-t pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <FieldLegend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Internal Staging Sublocations</FieldLegend>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "" })}
              className="h-8 text-xs gap-1"
            >
              <Plus className="w-3 h-3" /> Map Internal Sub-Zone
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Define distinct sections inside this hub like Aisle A, Receiving Bay, Cold Storage Vault room, etc.</p>

          <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-3 bg-muted/30 border p-2 rounded-xl">
                <div className="flex-1">
                  <Input 
                    placeholder="Staging identity string (e.g., Row 14, Rack B)" 
                    className="text-xs h-9"
                    {...register(`sublocations.${index}.name` as const)} 
                  />
                  {errors.sublocations?.[index]?.name && (
                    <span className="text-[10px] text-destructive block mt-1">{errors.sublocations[index].name.message}</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {fields.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed rounded-xl italic bg-muted/10">
                No internal sublocations or storage racks mapped yet. This facility tracks item availability strictly across its root level.
              </div>
            )}
          </div>
        </FieldSet>

        {/* Action Controls Footer Row */}
        <div className="flex items-center justify-between gap-4 border-t pt-4 mt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[130px]">
            {isSubmitting ? "Writing logistics records..." : isEditMode ? "Save Location Profile" : "Register Logistics Site"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
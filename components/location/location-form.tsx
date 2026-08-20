// components/LocationForm.tsx
"use client";

import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationSchema, LocationInput } from "@/schemas/location.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, MapPin, Layers, Eye, EyeOff, Globe, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { FormTextarea } from "../shared/form-textarea";
import { FormSelect } from "../shared/form-select";
import { FormInput } from "../shared/form-input";
import { FormSwitch } from "../shared/form-switch";

interface addressType {
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  remarks: string | null;
  addressType: string | null;
}

interface LocationFormProps {
  initialData?: {
    inflowId: string;
    name: string;
    isActive: boolean;
    isDefault: boolean;
    url: string;
    address: addressType | null;
    sublocations: { id: string; name: string }[];
  } | null;
  onSuccess?: () => void;
}

export function LocationForm({ initialData, onSuccess }: LocationFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [showUrl, setShowUrl] = useState(false);

  const form = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      inflowId: initialData?.inflowId,
      name: initialData?.name || "",
      isActive: initialData?.isActive ?? true,
      isDefault: initialData?.isDefault ?? false,
      url: initialData?.url ?? "",
      address: initialData?.address
        ? {
            address1: initialData.address.address1 ?? "",
            address2: initialData.address.address2 ?? "",
            city: initialData.address.city ?? "",
            state: initialData.address.state ?? "",
            country: initialData.address.country ?? "",
            postalCode: initialData.address.postalCode ?? "",
            addressType: initialData.address.addressType ?? "",
            remarks: initialData.address.remarks ?? "",
          }
        : null,
      sublocations: initialData?.sublocations || [],
    },
  });

  const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = form;

  // Watch address field dynamically to update Card UI
  const address = useWatch({ control, name: "address" });

  // Manage 1:Many sublocations
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sublocations",
  });

  const onSubmit = async (values: LocationInput) => {
    const isAddressEmpty = !values.address || Object.values(values.address).every((val) => !val);
    const payload = {
      ...values,
      address: isAddressEmpty ? null : values.address,
    };

    try {
      const endpoint = "/api/admin/locations";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to commit inventory location.");
      }

      const data = await response.json();

      toast.success(isEditMode ? "Location Profile Updated" : "Location Successfully Created", {
        description: `Committed logistics mapping for "${values.name}".`,
      });

      onSuccess?.();

      router.push(`/dashboard/locations/${data.id}`);
      router.refresh();
    } catch (err: any) {
      toast.error("Execution Error", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6 col-span-2">
          {/* Section 1: Facility Basics */}

          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  { isEditMode ? `Modify Logistics Hub: ${initialData?.name}` : "Establish New Logistics Facility"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormInput
                  name="name"
                  control={control}
                  label="Facility Depot Name"
                  placeholder="e.g., Seattle Regional Fulfillment (WH-02)"
                  classNameLabel=" font-semibold text-xs"
                  required
                />
                <FormInput
                  name="url"
                  control={control}
                  label="Location Endpoint"
                  icon={Globe}
                  isSecret
                  placeholder="https://"
                  autoComplete="off"
                  classNameLabel=" font-semibold text-xs"
                />
                <FormSwitch
                  name="isActive"
                  control={control}
                  variant="card"
                  label="Active Status"
                  description="Allows processing order fulfillment transfers"
                  classNameLabel=" font-semibold text-xs"
                  className=" p-2.5"
                />
                <FormSwitch
                  name="isDefault"
                  control={control}
                  variant="card"
                  label="Default System Site"
                  description="Auto-selected on incoming procurement lines"
                  classNameLabel=" font-semibold text-xs "
                  className=" p-2.5"
                />
              </div>

            </CardContent>
          </Card>

          {/* Section 2: Address Details Card */}
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  Address Details
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Provide location and delivery information for this site.
                </CardDescription>
              </div>

              {/* Dynamic Toggle Button */}
              <Button
                type="button"
                size="sm"
                variant={address ? "destructive" : "outline"}
                className="text-[11px] font-bold gap-1 h-8"
                onClick={() => {
                  if (address) {
                    setValue("address", null, { shouldValidate: true });
                  } else {
                    setValue("address", {
                      address1: "",
                      address2: "",
                      city: "",
                      state: "",
                      postalCode: "",
                      country: "",
                      addressType: "",
                      remarks: "",
                    }, { shouldValidate: true });
                  }
                }}
              >
                {address ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Remove Address
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Add Address
                  </>
                )}
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {address && (
                <div className="p-4 bg-muted/30 border rounded-xl relative space-y-4 font-medium">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormInput
                      name="address.address1"
                      control={control}
                      label="Street Line 1"
                      placeholder="Building, Street, Industrial Zone"
                      classNameLabel=" font-semibold text-xs"
                      required
                    />
                    <FormInput
                      name="address.address2"
                      control={control}
                      label="Line 2 (Suite/Floor)"
                      placeholder="Apartment, unit, etc."
                      classNameLabel=" font-semibold text-xs"
                    />
                    <FormInput
                      name="address.city"
                      control={control}
                      label="City"
                      placeholder="City"
                      classNameLabel=" font-semibold text-xs"
                      required
                    />
                    <FormInput
                      name="address.state"
                      control={control}
                      label="State / Province"
                      placeholder="Region / State"
                      classNameLabel=" font-semibold text-xs"
                      required
                    />
                    <FormInput
                      name="address.postalCode"
                      control={control}
                      label="Postal Code"
                      placeholder="ZIP"
                      classNameLabel=" font-semibold text-xs"
                      required
                    />
                    <FormInput
                      name="address.country"
                      control={control}
                      label="Country"
                      placeholder="Country"
                      classNameLabel=" font-semibold text-xs"
                      required
                    />
                    <FormSelect
                      name="address.addressType"
                      control={control}
                      label="Site Use Designation"
                      placeholder="Type"
                      options={[
                        { id: "WAREHOUSE", name: "Warehouse" },
                        { id: "STORE", name: "Store" },
                        { id: "FULFILLMENT_CENTER", name: "Fulfillment Center" },
                        { id: "TRANSIT", name: "Transit" },
                      ]}
                      classNameLabel=" font-semibold text-xs"
                    />
                    <FormTextarea
                      name="address.remarks"
                      control={control}
                      label="Site Specific Instructions"
                      placeholder="e.g., Forklift access available, deliver to gate 4"
                      className="min-h-[80px] text-xs"
                      classNameLabel=" font-semibold text-xs"
                      classNameField="sm:col-span-3"
                    />
                  </div>
                </div>
              )}

              {!address && (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl">
                  No address attached to this location. Click <strong>Add Address</strong> above to include physical site details.
                </div>
              )}

              {errors.address?.message && (
                <p className="text-destructive font-bold text-center text-xs">
                  {errors.address.message as string}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Section 3: Sublocations */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" /> Internal Staging Sublocations
                </h2>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ id: "", name: "" })}
                  className="text-[11px] font-bold gap-1 h-8"
                >
                  <Plus className="w-3 h-3" /> Map Sub-Zone
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Define distinct sections inside this hub like Aisle A, Receiving Bay, Cold Storage, etc.
              </p>
            </div>

            <div className="mt-3 space-y-2 max-h-[340px] overflow-y-auto p-2 pr-1">
              {fields.map((field, index) => (
                <Controller
                  key={field.id}
                  name={`sublocations.${index}.name`}
                  control={control}
                  render={({ field: controllerField, fieldState }) => (
                    <Field
                      orientation="horizontal"
                      data-invalid={fieldState.invalid}
                    >
                      <FieldContent>
                        <InputGroup>
                          <InputGroupInput
                            {...controllerField}
                            id={`form-subloc-array-name-${index}`}
                            aria-invalid={fieldState.invalid}
                            type="text"
                            placeholder="Sublocation Name"
                          />
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => remove(index)}
                              aria-label={`Remove sublocation ${index + 1}`}
                              className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <Trash2 />
                            </InputGroupButton>
                          </InputGroupAddon>
                        </InputGroup>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </FieldContent>
                    </Field>
                  )}
                />
              ))}
              {fields.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed rounded-xl italic bg-muted/10">
                  No internal sublocations mapped yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Submission Actions */}
      <Field orientation="horizontal" className="flex justify-end gap-2 pt-6">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </Field>
    </form>
  );
}
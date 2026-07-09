// components/LocationForm.tsx
"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationSchema, LocationInput } from "@/schemas/location.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group";
import { useState } from "react";

interface LocationFormProps {
  initialData?: {
    inflowId: string;
    name: string;
    isActive: boolean;
    isDefault: boolean;
    url: string;
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
  const [showUrl, setShowUrl] = useState(false);


  const form = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      inflowId: initialData?.inflowId,
      name: initialData?.name || "",
      isActive: initialData?.isActive ?? true,
      isDefault: initialData?.isDefault ?? false,
      url: initialData?.url ?? "",
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

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = form;

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

    <form id="form-vendor" onSubmit={handleSubmit(onSubmit)}> 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6 col-span-2">
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" /> 
              {isEditMode ? `Modify Logistics Hub: ${initialData?.name}` : "Establish New Logistics Facility"}
            </h2>
            <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-3 ">
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="w-full">
                  <FieldLabel htmlFor="form-name">
                    Facility Depot Name <b className="text-red-500">*</b>
                  </FieldLabel>
                  <FieldContent className="relative">
                    <Warehouse className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      {...field}
                      id="form-name"
                      aria-invalid={fieldState.invalid}
                      placeholder="e.g., Seattle Regional Fulfillment (WH-02)"
                      autoComplete="off"
                      className="pl-9 h-9 text-xs" 
                    />
                  </FieldContent>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="url"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-url">
                    Location Endpoint 
                  </FieldLabel>
                  <FieldContent className="relative">
                    {/* Left Icon: Globe */}
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                    
                    <Input
                      {...field}
                      id="form-url"
                      // Dynamically switch type between text and password
                      type={showUrl ? "text" : "password"} 
                      aria-invalid={fieldState.invalid}
                      placeholder="https://"
                      autoComplete="off"
                      className="pl-9 pr-9 h-9 text-xs" // Added pr-9 to clear space for the right button
                    />

                    {/* Right Button: Show/Hide Toggle */}
                    <button
                      type="button" // Prevents form submission on click
                      onClick={() => setShowUrl(!showUrl)}
                      className="absolute right-3 top-2.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                      aria-label={showUrl ? "Hide URL" : "Show URL"}
                    >
                      {showUrl ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </FieldContent>
                  
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            </FieldGroup>

            <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-3 ">
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
            </FieldGroup>

          </div>

          {/* Section 2: Address */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" /> Physical Site Coordinates & Address
            </h2>
              
            <div className="p-4 border rounded-lg space-y-3 bg-muted/20 relative pt-6">
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Controller 
                  control={control} 
                  name="address.address1"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-address1">Street Address line 1 <b className="text-red-500">*</b></FieldLabel>
                      <FieldContent>
                        <Input
                          {...field}
                          id="form-address1"
                          placeholder="e.g., 4200 Industry Highway"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller 
                  control={control} 
                  name="address.address2"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-address2">Suite / Aisle Box </FieldLabel>
                      <FieldContent>
                        <Input
                          {...field}
                          id="form-address2"
                          placeholder="e.g., Suite 100"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </FieldContent>
                    </Field>
                  )}
                />
              </FieldGroup>

              {/* City, State, and Postal Code */}
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Controller 
                  control={control} 
                  name="address.city"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-city">City <b className="text-red-500">*</b></FieldLabel>
                      <FieldContent>
                        <Input
                          {...field}
                          id="form-city"
                          placeholder="e.g., San Juan"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller 
                  control={control} 
                  name="address.state"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-state">State / Province <b className="text-red-500">*</b></FieldLabel>
                      <FieldContent>
                        <Input
                          {...field}
                          id="form-state"
                          placeholder="e.g., MN"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller 
                  control={control} 
                  name="address.postalCode"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-postalCode">Zip / Postal Code <b className="text-red-500">*</b></FieldLabel>
                      <FieldContent>
                        <Input
                          {...field}
                          id="form-postalCode"
                          placeholder="e.g., 90001"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </FieldContent>
                    </Field>
                  )}
                />
              </FieldGroup>

              {/* Country and Address Type */}
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Controller 
                  control={control} 
                  name="address.country"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-country">Country <b className="text-red-500">*</b></FieldLabel>
                      <FieldContent>
                        <Input
                          {...field}
                          id="form-country"
                          placeholder="e.g., Philippines"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller 
                  control={control} 
                  name="address.addressType"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-addressType">Site Use Designation</FieldLabel>
                      <FieldContent>
                        <Input
                          {...field}
                          id="form-addressType"
                          placeholder="e.g., Warehouse, Storefront, Logistics Partner"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </FieldContent>
                    </Field>
                  )}
                />
              </FieldGroup>

              <Controller
                name="address.remarks"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="form-address-remarks">Logistical Operational Access Remarks</FieldLabel>
                    <Textarea
                      {...field}
                      id="form-address-remarks"
                      aria-invalid={fieldState.invalid}
                      placeholder="Optional"
                      className="min-h-[120px]"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            
          </div>
        </div>

        <div className="space-y-6">
          {/* Section 3: */}
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
                  onClick={() => append({ name: "" })}
                  className="h-8 text-xs gap-1"
                >
                  <Plus className="w-3 h-3" /> Map Internal Sub-Zone
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Define distinct sections inside this hub like Aisle A, Receiving Bay, Cold Storage Vault room, etc.</p>
            </div>
        
            <div className="mt-3 space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {fields.map((field, index) => (
                <Controller
                  key={field.id}
                  name={`sublocations.${index}.name`}
                  control={form.control}
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
                          />
                            <InputGroupAddon align="inline-end">
                              <InputGroupButton
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => remove(index)}
                                aria-label={`Remove email ${index + 1}`}
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
                  No internal sublocations or storage racks mapped yet. This facility tracks item availability strictly across its root level.
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>

      <Field orientation="horizontal" className="flex justify-end pt-4">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Reset
        </Button>
        <Button type="submit" form="form-vendor">
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </Field>
    </form>
  );
}



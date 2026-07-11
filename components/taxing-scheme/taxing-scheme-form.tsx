"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taxingSchemeSchema, TaxingSchemeInput } from "@/schemas/taxing-scheme.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Percent, Plus, Trash2, ArrowLeft, Receipt, Settings2, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";

interface TaxingSchemeFormProps {
  initialData?: TaxingSchemeInput | null;
}

export function TaxingSchemeForm({ initialData }: TaxingSchemeFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<TaxingSchemeInput>({
    resolver: zodResolver(taxingSchemeSchema),
    defaultValues: initialData || {
      name: "",
      isActive: true,
      isDefault: false,
      calculateTax2OnTax1: false,
      tax1Name: "VAT",
      tax1OnShipping: false,
      tax2Name: "",
      tax2OnShipping: false,
      taxCodes: [],
    },
  });

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;

  const { fields: taxCodeFields, append: appendTaxCode, remove: removeTaxCode } = useFieldArray({
    control,
    name: "taxCodes",
  });

  const watchedTax1Name = watch("tax1Name") || "Tax 1";
  const watchedTax2Name = watch("tax2Name");
  const hasTier2 = !!watchedTax2Name;

  const onSubmit = async (values: TaxingSchemeInput) => {
    try {
      const response = await fetch("/api/admin/taxing-scheme", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "System rejected fiscal ledger configuration.");
      }

      toast.success(isEditMode ? "Taxing schema profile rules saved" : "New fiscal taxation scheme registered");
      router.push("/dashboard/taxing-scheme");
      router.refresh();
    } catch (err: any) {
      toast.error("Pipeline Sync Interrupted", { description: err.message });
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form Validation Failed:", errors);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6">
      <FieldGroup className="space-y-6">
        
        {/* SECTION 1: Base Scheme Definition Rules */}
        <FieldSet className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <FieldLegend className="lg:col-span-12 flex items-center gap-2 border-b pb-3 text-sm font-semibold text-foreground tracking-tight">
            <Receipt className="w-4 h-4 text-primary" />
            Master Fiscal Taxation Group Setup
          </FieldLegend>

          {/* Scheme Name */}
          <Field className="lg:col-span-6 flex flex-col space-y-2">
            <FieldLabel className="text-xs font-medium text-muted-foreground">Taxing Scheme Collective Label *</FieldLabel>
            <Input
              className="h-10"
              placeholder="e.g. North America Sales Tax"
              {...register("name")}
            />
            {errors.name && (
              <span className="text-xs font-medium text-destructive">
                {errors.name.message}
              </span>
            )}
          </Field>

          {/* Publish */}
          <Field className="lg:col-span-3 h-full">
            <div className="border rounded-lg bg-muted/20 p-4 min-h-[74px] flex justify-between items-center gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Publish Group
                </p>
                <p className="text-xs text-muted-foreground leading-normal">
                  Available for lookups
                </p>
              </div>
              <Switch
                className="shrink-0"
                checked={watch("isActive")}
                onCheckedChange={(value) => setValue("isActive", value)}
              />
            </div>
          </Field>

          {/* Default */}
          <Field className="lg:col-span-3 h-full">
            <div className="border rounded-lg bg-muted/20 p-4 min-h-[74px] flex justify-between items-center gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  System Default
                </p>
                <p className="text-xs text-muted-foreground leading-normal">
                  Auto-apply to new accounts
                </p>
              </div>
              <Switch
                className="shrink-0"
                checked={watch("isDefault")}
                onCheckedChange={(value) => setValue("isDefault", value)}
              />
            </div>
          </Field>
        </FieldSet>

        {/* SECTION 2: Split Tier Logic Configurations Engine */}
        <FieldSet className="relative border rounded-xl p-6 bg-muted/5 mt-2">
          <div className="absolute -top-5 -left-5 bg-background px-2.5 py-0.5 border rounded-md text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center shadow-xs">
            <Settings2 className="w-3 h-3 mr-1.5 text-primary" />
            Multi-Tier Structural Rules
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            {/* Tier 1 */}
            <div className="space-y-4 lg:border-r lg:pr-8  mt-8">
              <Field className="space-y-2">
                <FieldLabel className="text-xs font-semibold text-foreground">
                  Tier 1 Primary Tax Reference Label
                </FieldLabel>
                <Input
                  className="h-10"
                  placeholder="GST"
                  {...register("tax1Name")}
                />
              </Field>

              <div className="border rounded-lg bg-background p-4 flex justify-between items-center gap-4 shadow-2xs">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">
                    Assess Tier 1 on Delivery Freight
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Include freight when computing Tier 1 tax.
                  </p>
                </div>
                <Switch
                  className="shrink-0"
                  checked={watch("tax1OnShipping")}
                  onCheckedChange={(value) => setValue("tax1OnShipping", value)}
                />
              </div>
            </div>

            {/* Tier 2 */}
            <div className="space-y-4 mt-4">
              <Field className="space-y-2">
                <FieldLabel className="text-xs font-semibold text-foreground">
                  Tier 2 Secondary Tax Reference Label
                </FieldLabel>
                <Input
                  className="h-10"
                  placeholder="PST"
                  {...register("tax2Name")}
                />
              </Field>

              <div className="border rounded-lg bg-background p-4 flex justify-between items-center gap-4 shadow-2xs">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">
                    Assess Tier 2 on Delivery Freight
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Include freight when computing Tier 2 tax.
                  </p>
                </div>
                <Switch
                  className="shrink-0"
                  checked={watch("tax2OnShipping")}
                  onCheckedChange={(value) => setValue("tax2OnShipping", value)}
                />
              </div>

              {hasTier2 && (
                <div className="border border-amber-500/20 rounded-lg bg-amber-500/5 p-4 flex justify-between items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-sm text-amber-800 dark:text-amber-400">
                      Compound Tier 2
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-500/90">
                      Calculate Tier 2 using Subtotal + Tier 1.
                    </p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={watch("calculateTax2OnTax1")}
                    onCheckedChange={(value) => setValue("calculateTax2OnTax1", value)}
                  />
                </div>
              )}
            </div>
          </div>
        </FieldSet>

        {/* SECTION 3: Dynamic Regional Tax Codes Rates Matrix */}
        <FieldSet className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-t pt-3  pb-3">
            <FieldLegend className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <Scale className="w-4 h-4 text-primary" /> Mapped Jurisdictional Breakdown Tax Codes
            </FieldLegend>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendTaxCode({ name: "", isActive: true, tax1Rate: 0, tax2Rate: 0, isDefault: taxCodeFields.length === 0 })} // Auto-default the first one appended
              className="h-8 text-xs gap-1.5 shadow-2xs hover:bg-muted font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Append Jurisdiction Rate Row
            </Button>
          </div>

          <div className="space-y-2">
            {/* Table Headers Setup Column */}
            {taxCodeFields.length > 0 && (
              <div className="hidden md:grid grid-cols-12 gap-4 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1">
                <div className="col-span-4">Tax Code Area/Zone Designation *</div>
                <div className="col-span-3 text-right pr-1">{watchedTax1Name} Rate (%)</div>
                <div className="col-span-3 text-right pr-1">{hasTier2 ? `${watchedTax2Name} Rate (%)` : "Tier 2 (Disabled)"}</div>
                <div className="col-span-1 text-center">Default</div> 
                <div className="col-span-1 text-center">Actions</div>
              </div>
            )}

            {taxCodeFields.map((field, index) => (
              <div 
                key={field.id} 
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-4 md:p-1.5 border md:border-transparent rounded-xl bg-muted/30 md:bg-transparent relative hover:md:bg-muted/30 md:rounded-lg transition-colors"
              >
                {/* Specific Tax Code designation */}
                <div className="col-span-1 md:col-span-4"> {/* 👈 Reduced from col-span-5 to col-span-4 */}
                  <span className="block md:hidden text-[10px] uppercase font-bold text-muted-foreground mb-1">Jurisdiction Label</span>
                  <Input
                    placeholder="e.g., NY-RETAIL"
                    className="h-10 text-xs font-mono font-semibold bg-background"
                    {...register(`taxCodes.${index}.name` as const)}
                  />
                  {errors.taxCodes?.[index]?.name && (
                    <span className="text-[10px] font-medium text-destructive mt-1 block">{errors.taxCodes[index].name?.message}</span>
                  )}
                </div>

                {/* Tax Rate 1 Input */}
                <div className="col-span-1 md:col-span-3 relative">
                  <span className="block md:hidden text-[10px] uppercase font-bold text-muted-foreground mb-1">{watchedTax1Name} (%)</span>
                  <div className="relative">
                    <Percent className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="0.0000"
                      className="h-10 text-xs text-right pr-3 pl-8 font-mono font-medium bg-background"
                      {...register(`taxCodes.${index}.tax1Rate`, { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {/* Tax Rate 2 Input */}
                <div className="col-span-1 md:col-span-3 relative">
                  <span className="block md:hidden text-[10px] uppercase font-bold text-muted-foreground mb-1">{hasTier2 ? watchedTax2Name : "Tier 2"} (%)</span>
                  <div className="relative">
                    <Percent className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="0.0000"
                      disabled={!hasTier2}
                      className="h-10 text-xs text-right pr-3 pl-8 font-mono font-medium bg-background disabled:opacity-40 disabled:bg-muted/50"
                      {...register(`taxCodes.${index}.tax2Rate`, { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-1 flex flex-col items-start md:items-center justify-center">
                  <span className="block md:hidden text-[10px] uppercase font-bold text-muted-foreground mb-1">Default Jurisdiction</span>
                  <input
                    type="radio"
                    checked={watch(`taxCodes.${index}.isDefault`)}
                    className="w-4 h-4 text-primary bg-background border-input accent-primary cursor-pointer"
                    onChange={() => {
                      // Set selected index to true, set all other item indexes to false
                      taxCodeFields.forEach((_, i) => {
                        setValue(`taxCodes.${i}.isDefault`, i === index);
                      });
                    }}
                  />
                </div>

                {/* Drop Action Column */}
                <div className="col-span-1 md:col-span-1 text-right md:text-center mt-2 md:mt-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const wasDefault = watch(`taxCodes.${index}.isDefault`);
                      removeTaxCode(index);
                      // If we deleted the default item, fall back safely to setting row 0 as default
                      if (wasDefault && taxCodeFields.length > 1) {
                        setValue(`taxCodes.0.isDefault`, true);
                      }
                    }}
                    className="h-10 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {taxCodeFields.length === 0 && (
              <div className="text-center py-12 text-xs border border-dashed rounded-xl bg-muted/5 text-muted-foreground font-medium italic px-4 leading-relaxed">
                No individual regional tax codes generated under this scheme. Provision at least one rate zone parameter row to handle transactional invoice line mappings.
              </div>
            )}
          </div>
        </FieldSet>

        {/* Core Actions Navigation Layout */}
        <div className="flex items-center justify-end gap-3 border-t pt-5 mt-2">
          <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[160px] shadow-sm font-medium">
            {isSubmitting ? "Compiling ledger matrix..." : isEditMode ? "Save Scheme Adjustments" : "Deploy Taxing Scheme"}
          </Button>
        </div>

      </FieldGroup>
    </form>
  );
}
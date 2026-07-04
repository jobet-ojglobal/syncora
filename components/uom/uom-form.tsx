// components/UomForm.tsx
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { uomSchema, UomInput, UomCategoryEnum } from "@/schemas/uom.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Scale, Plus, Trash2, ArrowLeft, ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";

interface UomLookupReference {
  id: string;
  code: string;
  name: string;
  category: string;
}

interface UomFormProps {
  uomListLookup: UomLookupReference[]; // Populate peers for mapping explicit cross-conversions
  initialData?: any | null;
}

export function UomForm({ uomListLookup, initialData }: UomFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<UomInput>({
    resolver: zodResolver(uomSchema),
    defaultValues: initialData || {
      code: "",
      name: "",
      category: "COUNT",
      baseFactor: 1.0,
      isActive: true,
      conversions: [],
    },
  });

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = form;

  const { fields: conversionFields, append: appendConversion, remove: removeConversion } = useFieldArray({
    control,
    name: "conversions",
  });

  const selectedCategory = watch("category");

  // Filter peers selection array list to only show matching domain parameters categories (e.g., Weight items can only transform onto other Weight items)
  const compatibleTargetUnits = uomListLookup.filter(
    (u) => u.category === selectedCategory && u.id !== initialData?.id
  );

  const onSubmit = async (values: UomInput) => {
    values.code = values.code.trim().toUpperCase();

    try {
      const response = await fetch("/api/admin/uoms", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed submitting logistics measurements configurations.");
      }

      toast.success(isEditMode ? "Measurement metric updated" : "New Unit of Measure registered");
      router.push("/dashboard/uoms");
      router.refresh();
    } catch (err: any) {
      toast.error("Pipeline Core Aborted", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-4xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-8">
      <FieldGroup className="gap-6">
        
        {/* SECTION 1: Baseline Structural Definitions Parameters */}
        <FieldSet className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <FieldLegend className="col-span-1 md:col-span-12 flex items-center gap-2 border-b pb-2 text-foreground font-semibold">
            <Scale className="w-4 h-4 text-primary" /> Core Quantitative Unit Metrics Parameters
          </FieldLegend>

          <Field className="md:col-span-3">
            <FieldLabel>Unique Symbol Token Code *</FieldLabel>
            <Input placeholder="e.g., LBS, LTR, PLT" {...register("code")} disabled={isEditMode} className="uppercase font-mono text-xs" />
            {errors.code && <span className="text-xs text-destructive">{errors.code.message}</span>}
          </Field>

          <Field className="md:col-span-5">
            <FieldLabel>Full Display Designation Name *</FieldLabel>
            <Input placeholder="e.g., Pounds, Liters, Industrial Pallet" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </Field>

          <Field className="md:col-span-4">
            <FieldLabel>Physical Metrology Domain Category *</FieldLabel>
            <select className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 shadow-2xs" {...register("category")}>
              {UomCategoryEnum.options.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </Field>

          <Field className="md:col-span-6">
            <FieldLabel>System Baseline Multiplication Factor ($baseFactor$) *</FieldLabel>
            <Input type="number" step="0.000001" placeholder="1.000000" {...register("baseFactor", { valueAsNumber: true })} />
            <p className="text-[10px] text-muted-foreground mt-1">
              Relative value against your category&apos;s root scalar parameter (e.g. if 1g = 1.0, then 1kg = 1000.0).
            </p>
            {errors.baseFactor && <span className="text-xs text-destructive">{errors.baseFactor.message}</span>}
          </Field>

          <Field className="md:col-span-6">
            <FieldLabel>Functional Active Status Flag</FieldLabel>
            <div className="flex items-center h-9 space-x-2 border px-3 rounded-md bg-muted/20">
              <input type="checkbox" id="isActive" {...register("isActive")} className="rounded border-input text-primary focus:ring-primary h-4 w-4" />
              <label htmlFor="isActive" className="text-xs font-medium text-muted-foreground select-none">
                Enable metric selection options across product catalog forms
              </label>
            </div>
          </Field>
        </FieldSet>

        {/* SECTION 2: Direct Cross-Unit Calculations Conversion Factors Table Grid */}
        <FieldSet className="border-t pt-4">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <FieldLegend className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
              <ArrowRightLeft className="w-4 h-4 text-muted-foreground" /> Inter-Unit Specific Conversion Overrides Matrix
            </FieldLegend>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={compatibleTargetUnits.length === 0}
              onClick={() => appendConversion({ toUomId: "", factor: 1.0 })}
              className="h-8 text-xs gap-1"
            >
              <Plus className="w-3 h-3" /> Insert Translation Vector
            </Button>
          </div>

          {/* 🟢 ADD THIS BLOCK: Visualizes structural matrix errors (like duplicate targets or missing fields) */}
          {errors.conversions && !Array.isArray(errors.conversions) && (
          <div className="p-3 mb-4 text-xs font-medium border border-destructive/20 text-destructive bg-destructive/10 rounded-lg">
              {(errors.conversions as any).message}
          </div>
          )}

          <div className="space-y-2">
            {conversionFields.length > 0 && (
              <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                <div className="col-span-3">From Current Base Unit</div>
                <div className="col-span-2 text-center">Translation Vector</div>
                <div className="col-span-4">Target Mapping Recipient Metric Unit</div>
                <div className="col-span-2 text-right">Calculation Multiplier Factor</div>
                <div className="col-span-1 text-center">Prune</div>
              </div>
            )}

            {conversionFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 md:p-0 border md:border-0 rounded-xl bg-muted/30 md:bg-transparent relative">
                
                <div className="col-span-1 md:col-span-3">
                  <Input value={watch("name") || "This Unit"} disabled className="h-8 text-xs font-medium bg-muted/50 select-none" />
                </div>

                <div className="col-span-1 md:col-span-2 text-center text-muted-foreground/40 hidden md:block text-[11px] font-mono">
                  multiplies into ➔
                </div>

                <div className="col-span-1 md:col-span-4">
                  <select
                    className="w-full text-xs h-8 rounded-md border border-input bg-background px-2 shadow-3xs"
                    {...register(`conversions.${index}.toUomId` as const)}
                  >
                    <option value="">-- Select target peer metric --</option>
                    {compatibleTargetUnits.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                    ))}
                  </select>
                  {errors.conversions?.[index]?.toUomId && (
                    <span className="text-[10px] text-destructive block mt-0.5">
                      {errors.conversions[index]?.toUomId?.message}
                    </span>
                  )}
                </div>

                {/* ... factor numerical input field ... */}
                <div className="col-span-1 md:col-span-2">
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="1.000000"
                    className="text-xs h-8 text-right font-mono font-medium"
                    {...register(`conversions.${index}.factor`, { valueAsNumber: true })}
                  />
                   {errors.conversions?.[index]?.factor && (
                    <span className="text-[10px] text-destructive block mt-0.5 text-right">
                      {errors.conversions[index]?.factor?.message}
                    </span>
                  )}
                </div>

                <div className="col-span-1 md:col-span-1 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeConversion(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

              </div>
            ))}

            {conversionFields.length === 0 && (
              <div className="text-center py-6 text-xs border border-dashed rounded-xl bg-muted/5 text-muted-foreground italic">
                No custom cross-conversion vector maps built for this entity unit. Standard system baseline factors tracking will apply.
              </div>
            )}
          </div>
        </FieldSet>

        {/* Dynamic CTA Operations layout footer */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[140px]">
            {isSubmitting ? "Committing scales..." : isEditMode ? "Update Metrics Scale" : "Register Logistics Unit"}
          </Button>
        </div>

      </FieldGroup>
    </form>
  );
}
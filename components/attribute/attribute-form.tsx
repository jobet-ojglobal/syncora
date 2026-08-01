// components/AttributeForm.tsx
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { attributeSchema, AttributeInput } from "@/schemas/attribute.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, ArrowLeft, Layers } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

interface AttributeFormProps {
  initialData?: {
    id: string;
    name: string;
    values: { id: string; value: string; hexCode: string | null }[];
  } | null;
}

export function AttributeForm({ initialData }: AttributeFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<AttributeInput>({
    resolver: zodResolver(attributeSchema),
    defaultValues: {
      id: initialData?.id,
      name: initialData?.name || "",
      values: initialData?.values || [{ value: "", hexCode: "" }],
    },
  });

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = form;

  // ⛓️ Link the array hook into the form context
  const { fields, append, remove } = useFieldArray({
    control,
    name: "values",
  });

  const onSubmit = async (values: AttributeInput) => {
    try {
      const endpoint = "/api/admin/attributes";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to commit attributes.");
      }

      toast.success(isEditMode ? "Attribute Updated" : "Attribute Configured", {
        description: `Successfully synchronized parameters for "${values.name}".`,
      });

      router.push("/dashboard/attributes");
      router.refresh();
    } catch (err: any) {
      toast.error("Database Transaction Error", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl mx-auto p-6 bg-card border rounded-xl shadow-sm space-y-6">
      <FieldGroup className="gap-5">
        <FieldSet>
          <FieldLegend className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            {isEditMode ? `Modify "${initialData?.name}" Option Set` : "Create Variant Option Attribute"}
          </FieldLegend>
          
          <div className="mt-4 space-y-5">
            {/* Attribute Core Label */}
            <Field>
              <FieldLabel htmlFor="attr-name">Attribute Label Name *</FieldLabel>
              <Input id="attr-name" placeholder="e.g., Color, Size, Material" {...register("name")} />
              {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
            </Field>

            {/* Dynamic Child Option Values Sub-grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Allowed Variant Values & Options
                </FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ value: "", hexCode: "" })}
                  className="h-8 text-xs gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Row
                </Button>
              </div>

              {errors.values?.root && (
                <p className="text-xs text-destructive font-medium">{errors.values.root.message}</p>
              )}

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2 bg-muted/20 border p-2 rounded-lg relative group">
                    
                    {/* Inner Attribute Option Value Text */}
                    <div className="flex-1">
                      <Input
                        placeholder="Value (e.g., Red, XL, Cotton)"
                        className="text-xs h-9"
                        {...register(`values.${index}.value` as const)}
                      />
                      {errors.values?.[index]?.value && (
                        <span className="text-[10px] text-destructive block mt-1">{errors.values[index].value.message}</span>
                      )}
                    </div>

                    {/* Optional hex code configuration block */}
                    <div className="w-50">
                      <Input
                        placeholder="Hex code (e.g. #000000)"
                        className="text-xs h-9 font-mono"
                        {...register(`values.${index}.hexCode` as const)}
                      />
                      {errors.values?.[index]?.hexCode && (
                        <span className="text-[10px] text-destructive block mt-1">{errors.values[index].hexCode.message}</span>
                      )}
                    </div>

                    {/* Delete Item Array Trigger */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FieldSet>

        {/* Form CTA Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          
          <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[140px]">
            {isSubmitting ? "Saving options..." : isEditMode ? "Update Variant Attribute" : "Save Option Config"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
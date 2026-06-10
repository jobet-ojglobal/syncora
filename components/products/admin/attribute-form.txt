"use client";

import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductGroupSchema, CreateProductGroupInput } from "@/schemas/product-group.schema";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";

interface CategoryOption {
  id: string;
  label: string;
}

interface AttributeGroup {
  attributeId: string;
  name: string;
}

export function ProductGroupForm() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [globalAttributes, setGlobalAttributes] = useState<AttributeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<CreateProductGroupInput>({
    resolver: zodResolver(createProductGroupSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      isActive: true,
      options: [],
    },
  });

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors, isSubmitting } } = form;

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: "options",
  });

  // Load baseline setup dropdown values on mount
  useEffect(() => {
    async function loadFormData() {
      try {
        const [catRes, attrRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/attributes"), // Pulls attributes via your normalization shape
        ]);
        
        if (catRes.ok) setCategories(await catRes.json());
        if (attrRes.ok) {
          const attrData = await attrRes.json();
          setGlobalAttributes(attrData);
        }
      } catch (err) {
        console.error("Initialization errors:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFormData();
  }, []);

  const onSubmit = async (values: CreateProductGroupInput) => {
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to create product group transaction map.");

      toast.success("Success!", { description: "Product group and variant attributes created." });
      reset();
    } catch (error) {
      console.error(error);
      toast.error("Error", { description: "Could not create product group." });
    }
  };

  if (isLoading) return <div className="text-center p-6 text-sm text-muted-foreground">Loading schema requirements...</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <FieldGroup className="gap-6">
        
        {/* Section 1: Group Identity */}
        <FieldSet>
          <FieldLegend>Product Group Properties</FieldLegend>
          <FieldDescription>
            Create a grouping container to collect variations of similar products (e.g., Apparel sets or varying size scales).
          </FieldDescription>
          <FieldGroup className="gap-4 mt-4">
            <Field>
              <FieldLabel htmlFor="pg-name">Group Name *</FieldLabel>
              <Input id="pg-name" placeholder="e.g., Crewneck Sweatshirts" {...register("name")} />
              {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
            </Field>

            {/* Dynamic Categories Dropdown Field */}
            <Field>
              <FieldLabel htmlFor="pg-category">Target Category *</FieldLabel>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="pg-category">
                      <SelectValue placeholder={isLoading ? "Loading classifications..." : "Select a taxonomy bracket"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && <span className="text-xs text-destructive">{errors.categoryId.message}</span>}
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        {/* Section 2: Variant Attributes Custom Generator */}
        <FieldSet>
          <div className="flex justify-between items-center mb-2">
            <div>
              <FieldLegend>Variant Variations</FieldLegend>
              <FieldDescription>Assign options (e.g. Size) and specify sub-variants (e.g. Small, Medium).</FieldDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => appendOption({ name: "", attributeId: "", values: [{ value: "" }] })}
            >
              <Plus className="w-4 h-4" /> Add Option Attribute
            </Button>
          </div>

          <FieldGroup className="gap-4 mt-4">
            {optionFields.map((optionField, optionIndex) => (
              <div key={optionField.id} className="p-4 border rounded-xl bg-muted/30 relative space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOption(optionIndex)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Select option from your global list */}
                  <Field>
                    <FieldLabel>Global Option Class *</FieldLabel>
                    <Select
                      onValueChange={(val) => {
                        const selectedGlobal = globalAttributes.find(ga => ga.attributeId === val);
                        setValue(`options.${optionIndex}.attributeId`, val);
                        setValue(`options.${optionIndex}.name`, selectedGlobal?.name || "");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Match Existing Attribute" />
                      </SelectTrigger>
                      <SelectContent>
                        {globalAttributes.map((ga) => (
                          <SelectItem key={ga.attributeId} value={ga.attributeId}>{ga.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Or type a new fallback option name manually */}
                  <Field>
                    <FieldLabel>Custom Literal Name</FieldLabel>
                    <Input 
                      placeholder="e.g., Fabric Weight (Custom)" 
                      {...register(`options.${optionIndex}.name`)} 
                    />
                    {errors.options?.[optionIndex]?.name && (
                      <span className="text-xs text-destructive">{errors.options[optionIndex]?.name?.message}</span>
                    )}
                  </Field>
                </div>

                {/* Sub-values tagging matrix for the active option */}
                <div className="space-y-2">
                  <FieldLabel>Attribute Tag Values *</FieldLabel>
                  <ValuesSubArray optionIndex={optionIndex} control={control} register={register} errors={errors} />
                </div>
              </div>
            ))}
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        {/* Section 3: Group Status Toggles */}
        <FieldSet>
          <FieldGroup>
            <Field orientation="horizontal" className="items-start gap-3">
              <Controller control={control} name="isActive" render={({ field }) => (
                <Checkbox id="pg-active" checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
              )} />
              <div className="grid gap-1 leading-none">
                <FieldLabel htmlFor="pg-active" className="cursor-pointer font-medium">
                  Activate Group Status
                </FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Enabling this renders grouped variants accessible inside product indexes.
                </p>
              </div>
            </Field>
          </FieldGroup>
        </FieldSet>

        {/* Actions Block */}
        <Field orientation="horizontal" className="justify-end gap-3 pt-4 border-t">
          <Button variant="outline" type="button" onClick={() => reset()} disabled={isSubmitting}>Reset</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Generating Systems..." : "Create Product Group Combo"}
          </Button>
        </Field>

      </FieldGroup>
    </form>
  );
}

// Sub-component to manage nested arrays cleanly without hitting component re-render loops
function ValuesSubArray({ optionIndex, control, register, errors }: { optionIndex: number, control: any, register: any, errors: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `options.${optionIndex}.values`,
  });

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {fields.map((field, valIndex) => (
        <div key={field.id} className="flex items-center gap-1 bg-card border rounded-md pl-2 pr-1 py-1 shadow-sm">
          <input
            className="bg-transparent text-sm focus:outline-none w-24"
            placeholder="Value..."
            {...register(`options.${optionIndex}.values.${valIndex}.value`)}
          />
          <button type="button" onClick={() => remove(valIndex)} className="text-muted-foreground hover:text-destructive p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2 border-dashed gap-1"
        onClick={() => append({ value: "" })}
      >
        <Plus className="w-3 h-3" /> Add Value
      </Button>
      {errors.options?.[optionIndex]?.values?.message && (
        <p className="text-xs text-destructive block w-full">{errors.options[optionIndex]?.values?.message}</p>
      )}
    </div>
  );
}
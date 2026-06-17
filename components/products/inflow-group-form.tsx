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

interface BrandOption {
  id: string;
  name: string;
}

interface AttributeValueOption {
  valueId: string;
  label: string;
  meta: { hexCode: string } | null;
}

interface AttributeGroup {
  attributeId: string;
  name: string;
  options: AttributeValueOption[];
}

interface ProductGroupFormProps {
  initialData?: any;
}

export function ProductGroupForm({
  initialData,
}: ProductGroupFormProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [globalAttributes, setGlobalAttributes] = useState<AttributeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isEditMode = !!initialData;

  const form = useForm<CreateProductGroupInput>({
    resolver: zodResolver(createProductGroupSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      categoryId: initialData?.categoryId ?? "",
      brandId: initialData?.brandId ?? null,
      isActive: initialData?.isActive ?? true,
      generateVariants: false,

      tags: initialData?.tags?.map((t: any) => t.value) ?? [],

      features:
        initialData?.features?.map((f: any) => ({
          key: f.key,
          value: f.value,
        })) ?? [],

      options:
        initialData?.options?.map((option: any) => ({
          name: option.name,
          attributeId: option.attributeId ?? "",
          values:
            option.values?.map((v: any) => ({
              value: v.value,
            })) ?? [],
        })) ?? [],
    },
  });

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors, isSubmitting } } = form;

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: "options",
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: "features"
  });

  const watchedOptions = watch("options");
  const watchedTags = watch("tags") || [];

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const sanitized = tagInput.trim().replace(/,$/, "");
      
      if (sanitized && !watchedTags.includes(sanitized)) {
        setValue("tags", [...watchedTags, sanitized]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue("tags", watchedTags.filter(t => t !== tagToRemove));
  };

  // Load baseline setup dropdown values on mount
  // 1. Core taxonomy pull function
  const fetchGlobalAttributes = async () => {
    try {
      const response = await fetch("/api/attributes");
      if (response.ok) {
        const data = await response.json();
        setGlobalAttributes(data);
      }
    } catch (err) {
      console.error("Failed background-refreshing global attributes collection:", err);
    }
  };

  useEffect(() => {
    if (!initialData) return;

    reset({
      name: initialData.name,
      categoryId: initialData.categoryId,
      brandId: initialData.brandId,
      isActive: initialData.isActive,
      generateVariants: false,

      tags: initialData.tags?.map((t: any) => t.value) ?? [],

      features:
        initialData.features?.map((f: any) => ({
          key: f.key,
          value: f.value,
        })) ?? [],

      options:
        initialData.options?.map((option: any) => ({
          name: option.name,
          attributeId: option.attributeId ?? "",
          values:
            option.values?.map((v: any) => ({
              value: v.value,
            })) ?? [],
        })) ?? [],
    });
  }, [initialData, reset]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Parallel fetch categories, attributes, and brand systems
        const [catRes, brandRes, attrRes] = await Promise.all([
          fetch("/api/admin/categories/inflow"),
          fetch("/api/admin/brands/basic"), // 👈 Call new route
          fetch("/api/admin/attributes/basic"),
        ]);
        
        if (catRes.ok) setCategories(await catRes.json());
        if (brandRes.ok) setBrands(await brandRes.json());
        if (attrRes.ok) setGlobalAttributes(await attrRes.json());
      } catch (err) {
        console.error("Initialization errors:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Run initial data load on mount
  // useEffect(() => {
  //   async function loadInitialData() {
  //     try {
  //       const catRes = await fetch("/api/categories");
  //       if (catRes.ok) setCategories(await catRes.json());
  //       await fetchGlobalAttributes();
  //     } catch (err) {
  //       console.error("Initialization errors:", err);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  //   loadInitialData();
  // }, []);

  const onSubmit = async (values: CreateProductGroupInput) => {
    try {
      const endpoint = isEditMode
        ? `/api/admin/groups/${initialData.id}`
        : "/api/admin/groups";

      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to save product group transaction.");

      toast.success(
        isEditMode ? "Product group updated." : "Product group created."
      );
      
      // Reset form input fields back to initial states
      reset({
        name: "",
        categoryId: values.categoryId, // Keep category active for fast repetitive entry
        isActive: true,
        options: []
      });

      // Re-fetch global attributes immediately 
      // This pulls any new custom inline attributes created during this submission
      await fetchGlobalAttributes();

    } catch (error) {
      console.error("Submission error:", error);
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

            <Field>
                <FieldLabel htmlFor="pg-brand">Associated Brand</FieldLabel>
                <Controller
                  control={control}
                  name="brandId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || "no-brand"}>
                      <SelectTrigger id="pg-brand"><SelectValue placeholder="Select Brand Label (Optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-brand">None / Unbranded</SelectItem>
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Product Highlights & Discoverability</FieldLegend>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            
            {/* Dynamic Features List */}
            <Field className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <FieldLabel>Technical Specifications / Features</FieldLabel>
                  <p className="text-[11px] text-muted-foreground">Pair values like Key: <b>Sensor</b> | Value: <b>Full Frame</b></p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => appendFeature({ key: "", value: "" })} // 👈 Append an empty key-value structure
                  className="h-7 text-xs gap-1 shrink-0"
                >
                  <Plus className="w-3 h-3" /> Add Spec
                </Button>
              </div>
              
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {featureFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start bg-muted/20 p-2 border rounded-lg relative group">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <div>
                        <Input 
                          placeholder="Label (e.g., Sensor)" 
                          className="h-8 text-xs font-semibold"
                          {...register(`features.${index}.key` as const)} 
                        />
                        {errors.features?.[index]?.key && (
                          <span className="text-[10px] text-destructive">{errors.features[index]?.key?.message}</span>
                        )}
                      </div>
                      <div>
                        <Input 
                          placeholder="Spec (e.g., Full Frame)" 
                          className="h-8 text-xs"
                          {...register(`features.${index}.value` as const)} 
                        />
                        {errors.features?.[index]?.value && (
                          <span className="text-[10px] text-destructive">{errors.features[index]?.value?.message}</span>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeFeature(index)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0 align-middle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

                {featureFields.length === 0 && (
                  <p className="text-xs text-muted-foreground italic p-4 border border-dashed rounded-lg text-center bg-muted/10">
                    No system specifications added yet.
                  </p>
                )}
              </div>
            </Field>

            {/* Keyword Tags Manager */}
            <Field className="space-y-2">
              <FieldLabel htmlFor="tags-input">Search Keywords & Tags</FieldLabel>
              <FieldDescription>Type a tag and press <kbd className="px-1 bg-muted border rounded text-[10px]">Enter</kbd> or <kbd className="px-1 bg-muted border rounded text-[10px]">,</kbd> to lock it in.</FieldDescription>
              
              <Input
                id="tags-input"
                placeholder="e.g., hot-swap, wireless, mechanical"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />

              {/* Tags Output Array Display Box */}
              <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[80px] bg-muted/20 align-top content-start">
                {watchedTags.map((tag) => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 text-xs font-medium"
                  >
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive text-muted-foreground/80 focus:outline-none"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {watchedTags.length === 0 && (
                  <span className="text-xs text-muted-foreground italic m-auto">No tags assigned.</span>
                )}
              </div>
            </Field>

          </div>
        </FieldSet>

        <FieldSeparator />

        {/* Section 2: Variant Attributes Custom Generator */}
        <FieldSet>
          <div className="flex justify-between items-center mb-2">
            <div>
              <FieldLegend>Variant Variations</FieldLegend>
              <FieldDescription>Assign options and specify sub-variants.</FieldDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => appendOption({ name: "", attributeId: "", values: [] })}
            >
              <Plus className="w-4 h-4" /> Add Option Attribute
            </Button>
          </div>

          {errors.options?.root ? (
            <div className="p-3 mb-2 text-xs font-medium border border-destructive/20 text-destructive bg-destructive/10 rounded-lg">
              {errors.options.root.message}
            </div>
          ) : errors.options && !Array.isArray(errors.options) ? (
            // Handles alternative root-level array string paths thrown by Zod
            <div className="p-3 mb-2 text-xs font-medium border border-destructive/20 text-destructive bg-destructive/10 rounded-lg">
              {(errors.options as any).message}
            </div>
          ) : null}

          <FieldGroup className="gap-4 mt-4">
            {optionFields.map((optionField, optionIndex) => {
              // Determine if an existing attribute is selected for this specific row block
              const selectedAttributeId = watchedOptions[optionIndex]?.attributeId;
              const isGlobalSelected = Boolean(selectedAttributeId);

              return (
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
                    {/* Select global configuration class */}
                    <Field>
                      <FieldLabel>Global Option Class</FieldLabel>
                     
                      <Select
                        value={selectedAttributeId || "custom-literal-mode"}
                        onValueChange={(val) => {
                          if (val === "custom-literal-mode") {
                            setValue(`options.${optionIndex}.attributeId`, "");
                            setValue(`options.${optionIndex}.name`, "");
                            setValue(`options.${optionIndex}.values`, []);
                          } else {
                            const selectedGlobal = globalAttributes.find(ga => ga.attributeId === val);
                            setValue(`options.${optionIndex}.attributeId`, val);
                            setValue(`options.${optionIndex}.name`, selectedGlobal?.name || "");
                            
                            // Map existing pre-defined master options into form fields array immediately
                            const mappedValues = (selectedGlobal?.options || []).map(opt => ({
                              value: opt.label
                            }));
                            setValue(`options.${optionIndex}.values`, mappedValues);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Match Existing Attribute" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom-literal-mode">Custom Attribute (None)</SelectItem>
                          {globalAttributes.map((ga) => (
                            <SelectItem key={ga.attributeId} value={ga.attributeId}>{ga.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    {/* Literal text input: Hides or Disables gracefully based on selection */}
                    {!isGlobalSelected ? (
                      <Field>
                        <FieldLabel>Custom Literal Name *</FieldLabel>
                        <Input 
                          placeholder="e.g., Fabric Weight (Custom)" 
                          {...register(`options.${optionIndex}.name`)} 
                        />
                        {errors.options?.[optionIndex]?.name && (
                          <span className="text-xs text-destructive">{errors.options[optionIndex]?.name?.message}</span>
                        )}
                      </Field>
                    ) : (
                      <Field className="opacity-60 cursor-not-allowed">
                        <FieldLabel>Selected Attribute Name</FieldLabel>
                        <Input 
                          disabled 
                          value={watchedOptions[optionIndex]?.name || ""} 
                          className="bg-muted border-dashed"
                        />
                      </Field>
                    )}
                  </div>

                  {/* Sub-values tagging matrix cloud layout */}
                  <div className="space-y-2">
                    <FieldLabel>Attribute Tag Values *</FieldLabel>
                    <ValuesSubArray optionIndex={optionIndex} control={control} register={register} errors={errors} />
                  </div>
                </div>
              );
            })}
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        {/* Section 3: Group Status Toggles */}
        <FieldSet>
          <FieldGroup className="gap-4">
            {/* Existing Status Checkbox */}
            <Field orientation="horizontal" className="items-start gap-3">
              <Controller control={control} name="isActive" render={({ field }) => (
                <Checkbox id="pg-active" checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
              )} />
              <div className="grid gap-1 leading-none">
                <FieldLabel htmlFor="pg-active" className="cursor-pointer font-medium">Activate Group Status</FieldLabel>
              </div>
            </Field>

            {/* 👈 New Generate Variants Checkbox */}
            <Field orientation="horizontal" className="items-start gap-3 border-t pt-4">
              <Controller control={control} name="generateVariants" render={({ field }) => (
                <Checkbox id="pg-generate-variants" checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
              )} />
              <div className="grid gap-1 leading-none">
                <FieldLabel htmlFor="pg-generate-variants" className="cursor-pointer font-medium">Auto-Generate Product Variants</FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Checking this automatically builds a unique inventory variant matrix item for every combination of options added above.
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
    <div className="flex flex-wrap gap-2 items-center min-h-[40px] p-2 border rounded-lg bg-background/50">
      {fields.map((field, valIndex) => (
        <div key={field.id} className="flex items-center gap-1 bg-muted border rounded-md pl-2 pr-1 py-1 shadow-sm transition-all focus-within:ring-1 focus-within:ring-ring">
          <input
            className="bg-transparent text-sm focus:outline-none w-20 sm:w-24 font-medium"
            placeholder="Value..."
            {...register(`options.${optionIndex}.values.${valIndex}.value`)}
          />
          <button 
            type="button" 
            onClick={() => remove(valIndex)} 
            className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2.5 border-dashed gap-1 text-xs hover:bg-background"
        onClick={() => append({ value: "" })}
      >
        <Plus className="w-3 h-3" /> Add Value
      </Button>
      
      {errors.options?.[optionIndex]?.values?.message && (
        <p className="text-xs text-destructive block w-full mt-1">{errors.options[optionIndex]?.values?.message}</p>
      )}
    </div>
  );
}
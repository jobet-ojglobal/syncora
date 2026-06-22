// components/ProductGroupForm.tsx
"use client";

import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductGroupSchema, ProductGroupInput } from "@/schemas/group.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Layers, ArrowLeft, Plus, Trash2, X, Check, Sliders, AlertCircle, Barcode, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useEffect, useState } from "react";



// Shadcn UI Dialog & Checkbox imports
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandSelect } from "../shared/brand-select";
import { CategorySelect } from "../shared/category-select";

interface LookupItem {
  id: string;
  inflowId?: string;
  name: string;
  sku?: string | null;
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
  brands: LookupItem[];
  categories: LookupItem[];
  attributes: AttributeGroup[];
  initialData?: any | null;
}

function computeLocalCartesianCount(
  options: Array<{ name: string; isDriver?: boolean; values?: Array<{ value: string; isSkuDriver?: boolean }> }>
): { labels: string[]; totalCount: number } {
  const driverOptionGroups = options
    .map((opt) => {
      // 🎯 Short circuit rule: if the attribute row itself is skipped, skip child checks
      if (!opt.isDriver) return [];

      return (opt.values || [])
        .filter((v) => v.isSkuDriver ?? true)
        .map((v) => v.value);
    })
    .filter((group) => group.length > 0);

  if (driverOptionGroups.length === 0) return { labels: [], totalCount: 0 };

  const result = driverOptionGroups.reduce<string[][]>(
    (a, b) => a.flatMap((d) => b.map((e) => [...d, e])),
    [[]]
  );

  const labels = result.map((combination) => combination.join(" / "));
  return { labels, totalCount: labels.length };
}


export function ProductGroupForm({ brands, categories, attributes, initialData }: ProductGroupFormProps) {
  const router = useRouter();
  const [tagInput, setTagInput] = useState("");
  const isEditMode = !!initialData;

  // State to manage the attribute value selection dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [formPayload, setFormPayload] = useState<ProductGroupInput | null>(null);

  const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(null);
  const [selectedAttributeGroup, setSelectedAttributeGroup] = useState<AttributeGroup | null>(null);
  const [pendingSelections, setPendingSelections] = useState<string[]>([]);


  // 👇 1. Instantiate the schema dynamically using the incoming 'attributes' prop
  const formSchema = createProductGroupSchema(
    attributes.map((attr) => ({
      id: attr.attributeId,
      name: attr.name,
    }))
  );

  // 2. Pass the instantiated 'formSchema' directly to your resolver
  const form = useForm<ProductGroupInput>({
    resolver: zodResolver(formSchema), 
    defaultValues: initialData || {
      id: initialData?.id,
      name: "",
      skuPattern: initialData?.skuPattern ?? "[BRAND]-[VAL_1]-[VAL_2]-[INDEX]",
      skuSeparator: "-",
      description: "",
      brandId: "",
      categoryId: "",
      isActive: true,
      tags: initialData?.tags ?? [],
      features: initialData?.features?.map((f: any) => ({ key: f.key, value: f.value })) ?? [],
      options: initialData?.options?.map((option: any) => ({
        name: option.name,
        attributeId: option.attributeId ?? "",
        isDriver: option.isDriver ?? false,
        values: option.values?.map((v: any) => ({ value: v.value, isSkuDriver: v.isSkuDriver ?? true })) ?? [],
      })) ?? [],
      variants: initialData?.variants ?? [],
    },
  });

  const { register, control, handleSubmit, setValue, reset, watch, formState: { errors, isSubmitting } } = form;

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

  useEffect(() => {
    if (!initialData) return;
    reset({
      id: initialData?.id,
      name: initialData.name,
      skuPattern: initialData?.skuPattern ?? "[BRAND]-[VAL_1]-[VAL_2]-[INDEX]",
      skuSeparator: "-",
      categoryId: initialData.categoryId,
      brandId: initialData.brandId,
      isActive: initialData.isActive,
      tags: initialData.tags ?? [],
      features: initialData.features?.map((f: any) => ({ key: f.key, value: f.value })) ?? [],
      options: initialData.options?.map((option: any) => ({
        name: option.name,
        attributeId: option.attributeId ?? "",
        isDriver: option.isDriver ?? false,
        values: option.values?.map((v: any) => ({ value: v.value, isSkuDriver: v.isSkuDriver ?? true})) ?? [],
      })) ?? [],
      variants: initialData.variants ?? [],
    });
  }, [initialData, reset]);

  // Triggered when selecting an attribute from the dropdown
  const handleSelectAttributeGroup = (val: string, optionIndex: number) => {
    if (val === "custom-literal-mode") {
      setValue(`options.${optionIndex}.attributeId`, "");
      setValue(`options.${optionIndex}.name`, "");
      setValue(`options.${optionIndex}.values`, []);
    } else {
      const group = attributes.find(ga => ga.attributeId === val);
      if (group) {
        setActiveOptionIndex(optionIndex);
        setSelectedAttributeGroup(group);
        // Pre-populate checkboxes with values already present in the form row, if any
        const currentValues = watchedOptions[optionIndex]?.values?.map((v: any) => v.value) || [];
        setPendingSelections(currentValues);
        setDialogOpen(true);
      }
    }
  };

  // Pushes selected checkbox items into react-hook-form fields
  const handleConfirmValues = () => {
    if (activeOptionIndex !== null && selectedAttributeGroup) {
      setValue(`options.${activeOptionIndex}.attributeId`, selectedAttributeGroup.attributeId);
      setValue(`options.${activeOptionIndex}.name`, selectedAttributeGroup.name);
      
      const mappedValues = pendingSelections.map(val => ({ value: val, isSkuDriver: true }));
      setValue(`options.${activeOptionIndex}.values`, mappedValues);
    }
    setDialogOpen(false);
    setActiveOptionIndex(null);
    setSelectedAttributeGroup(null);
  };

  const togglePendingSelection = (label: string) => {
    setPendingSelections(prev => 
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
    );
  };

  // Stage A: Form Level Interception & Validation
  const onSubmit = async (values: ProductGroupInput) => {
    // 1. Run your existing structural validation checks
    const customCollisions = values.options.filter(opt => {
      const isCustom = !opt.attributeId || opt.attributeId === "custom-literal-mode";
      return isCustom && attributes.some(g => g.name.toLowerCase() === opt.name.toLowerCase());
    });

    if (customCollisions.length > 0) {
      toast.error("Naming Conflict", { 
        description: "Custom attribute names cannot match global system types." 
      });
      return;
    }

    // 2. Count active drivers across all options arrays
    const totalSkuDriversCount = values.options.reduce((acc, opt) => {
      // If the whole attribute row is not a driver, ignore its values entirely
      if (!opt.isDriver) return acc; 
      
      const activeValuesInOption = (opt.values || []).filter(v => v.isSkuDriver ?? true);
      return acc + activeValuesInOption.length;
    }, 0);

    // 3. Conditional Modal Routing Logic
    if (totalSkuDriversCount > 0) {
      // 🎯 Case A: Drivers exist. Freeze the payload state and trigger the shadcn preview dialog
      setFormPayload(values);
      setConfirmDialogOpen(true);
    } else {
      // 🎯 Case B: No active generation drivers found. Fast-track straight to database execution
      try {
        const response = await fetch("/api/admin/groups", {
          method: isEditMode ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errPayload = await response.json();
          throw new Error(errPayload.error || "Execution error posting grouped catalog lines.");
        }

        toast.success(isEditMode ? "Product collection modifications saved" : "Standard product grouping registered");
        router.push("/dashboard/groups");
        router.refresh();
      } catch (err: any) {
        toast.error("Pipeline Sync Interrupted", { description: err.message });
      } 
    }
  };

  // Stage B: Secure Transaction Push Triggered from inside Modal Layout
  const executeDatabaseWrite = async () => {
    if (!formPayload) return;
    setConfirmDialogOpen(false); // Close modal cleanly

    try {
      const response = await fetch("/api/admin/groups", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formPayload),
      });

      if (!response.ok) {
        const errPayload = await response.json();
        throw new Error(errPayload.error || "Execution error posting grouped catalog lines.");
      }

      toast.success(isEditMode ? "Product collection modifications saved" : "Matrix product grouping registered");
      router.push("/dashboard/groups");
      router.refresh();
    } catch (err: any) {
      toast.error("Pipeline Sync Interrupted", { description: err.message });
    } finally {
      setFormPayload(null);
    }
  };

  // const onSubmit = async (values: ProductGroupInput) => {
  //   const customCollisions = values.options.filter(opt => {
  //   const isCustom = !opt.attributeId || opt.attributeId === "custom";
  //     return isCustom && attributes.some(g => g.name.toLowerCase() === opt.name.toLowerCase());
  //   });

  //   if (customCollisions.length > 0) {
  //     // Treat as error or alert block execution
  //     return;
  //   }
    
  //   try {
  //     const response = await fetch("/api/admin/groups", {
  //       method: isEditMode ? "PATCH" : "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(values),
  //     });

  //     if (!response.ok) {
  //       const errPayload = await response.json();
  //       throw new Error(errPayload.error || "Execution error posting grouped catalog lines.");
  //     }

  //     toast.success(isEditMode ? "Product collection modifications saved" : "Matrix product grouping registered");
  //     router.push("/dashboard/groups");
  //     router.refresh();
  //   } catch (err: any) {
  //     toast.error("Pipeline Sync Interrupted", { description: err.message });
  //   }
  // };

  return (
    <>
      <form 
        onSubmit={handleSubmit(onSubmit, (formErrors) => {
          // 🔍 This catch block prints exact validation blockers directly to your developer terminal console
          console.error("React Hook Form validation failures blocking API payload delivery:", formErrors);
          toast.error("Form Validation Error", {
            description: "Please check for missing fields or incorrectly configured options inside the form cards."
          });
        })}
        className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-8">
        <FieldGroup className="gap-6">
          {/* SECTION 1: Product Group Base Identity Card */}
          <FieldSet className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldLegend className="col-span-1 md:col-span-3 flex items-center gap-2 border-b pb-2">
              <Layers className="w-4 h-4 text-primary" /> Root Classification Parent Specification
            </FieldLegend>

            <Field className="md:col-span-2">
              <FieldLabel>Product Group Label Name *</FieldLabel>
              <Input placeholder="e.g., Premium Cotton Hoodies Line" {...register("name")} />
              {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
            </Field>

            <Field>
              <FieldLabel>Global Status Visibility</FieldLabel>
              <div className="flex items-center h-9 space-x-2 border px-3 rounded-md bg-muted/20">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <span className="text-xs font-medium text-muted-foreground">Publish to storefront</span>
              </div>
            </Field>

            <Field className="md:col-span-1">
              <FieldLabel>Manufacturer / Brand Assignment</FieldLabel>
              <Controller
                name="brandId"
                control={control}
                render={({ field }) => <BrandSelect value={field.value ?? undefined} onChange={field.onChange} />}
              />
            </Field>
  
            <Field className="md:col-span-2">
              <FieldLabel>Master Catalog Department Category</FieldLabel>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => <CategorySelect value={field.value ?? undefined} onChange={field.onChange} />}
              />
            </Field>

            {/* <Field>
              <FieldLabel>Brand Category Association</FieldLabel>
              <select className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 shadow-xs" {...register("brandId")}>
                <option value="">-- No explicit brand map --</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>Master Catalog Department Category</FieldLabel>
              <select className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 shadow-xs" {...register("categoryId")}>
                <option value="">-- Choose department placement --</option>
                {categories.map(c => <option key={c.inflowId} value={c.inflowId}>{c.name}</option>)}
              </select>
            </Field> */}

            <Field className="md:col-span-3">
              <FieldLabel>Collective Index Description Summary</FieldLabel>
              <Textarea placeholder="Detail technical fabrics spec sheets, sizing guidelines or seasonal lines copy..." rows={3} {...register("description")} />
            </Field>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Product Highlights & Discoverability</FieldLegend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
                      onClick={() => appendFeature({ key: "", value: "" })} 
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
                            <Input placeholder="Label (e.g., Sensor)" className="h-8 text-xs font-semibold" {...register(`features.${index}.key` as const)} />
                            {errors.features?.[index]?.key && (
                              <span className="text-[10px] text-destructive">{errors.features[index]?.key?.message}</span>
                            )}
                          </div>
                          <div>
                            <Input placeholder="Spec (e.g., Full Frame)" className="h-8 text-xs" {...register(`features.${index}.value` as const)} />
                            {errors.features?.[index]?.value && (
                              <span className="text-[10px] text-destructive">{errors.features[index]?.value?.message}</span>
                            )}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFeature(index)} className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0 align-middle">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    {featureFields.length === 0 && (
                      <p className="text-xs text-muted-foreground italic p-4 border border-dashed rounded-lg text-center bg-muted/10">No system specifications added yet.</p>
                    )}
                  </div>
                </Field>

                <Field className="space-y-2">
                  <FieldLabel htmlFor="tags-input">Search Keywords & Tags</FieldLabel>
                  <FieldDescription>Type a tag and press <kbd className="px-1 bg-muted border rounded text-[10px]">Enter</kbd> or <kbd className="px-1 bg-muted border rounded text-[10px]">,</kbd> to lock it in.</FieldDescription>
                  <Input id="tags-input" placeholder="e.g., hot-swap, wireless, mechanical" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} />
                  <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[80px] bg-muted/20 align-top content-start">
                    {watchedTags.map((tag, idx) => (
                      <span key={tag || idx} className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 text-xs font-medium">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive text-muted-foreground/80 focus:outline-none">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {watchedTags.length === 0 && <span className="text-xs text-muted-foreground italic m-auto">No tags assigned.</span>}
                  </div>
                </Field>
              </div>
          </FieldSet>

          <FieldSeparator />

          {/* 🟢 SECTION 2: Variant Attributes Custom Generator */}
          <div className="border p-6 rounded-xl bg-background space-y-6 shadow-xs">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" /> Define Matrix Variant Attributes & SKU Drivers
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add option configuration classes. Check the individual tag values you want to actively compile into variant products.
              </p>
            </div>

            <div className="space-y-4">
              {optionFields.map((field, optionIndex) => {
                const currentOption = watchedOptions[optionIndex];
                const selectedAttributeId = currentOption?.attributeId;
                const isCustomMode = !selectedAttributeId || selectedAttributeId === "custom-literal-mode";
                const currentValues = currentOption?.values || [];
                const currentValuesCount = currentValues.length;

                // Locate global metadata layout config if matching active selection context
                const globalGroup = attributes.find(ga => ga.attributeId === selectedAttributeId);

                return (
                  <div 
                    key={field.id} 
                    className="p-4 rounded-lg border bg-muted/30 relative space-y-3 transition-colors hover:border-muted-foreground/30"
                  >
                    {/* Top Line Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground font-mono">
                          #{optionIndex + 1}
                        </span>
                        
                        {/* Is Driver Switch Checkbox */}
                        <label className="flex items-center gap-1.5 text-xs font-semibold select-none cursor-pointer">
                          <input
                            type="checkbox"
                            {...register(`options.${optionIndex}.isDriver` as const)}
                            className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                          />
                          Use in SKU Generation Formula
                        </label>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2 rounded"
                        onClick={() => removeOption(optionIndex)}
                      >
                        Remove Attribute
                      </Button>
                    </div>

                    {/* Configuration Inputs row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-foreground/70 block">Select Class Type</label>
                        <select
                          value={selectedAttributeId || "custom-literal-mode"}
                          onChange={(e) => handleSelectAttributeGroup(e.target.value, optionIndex)}
                          className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-medium"
                        >
                          <option value="custom-literal-mode">✨ Custom Text Input Mode</option>
                          {attributes.map((attr) => (
                            <option key={attr.attributeId} value={attr.attributeId}>
                              Global: {attr.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-foreground/70 block">Attribute Handle / Name</label>
                        <Input
                          {...register(`options.${optionIndex}.name` as const)}
                          disabled={!isCustomMode}
                          placeholder="e.g., Color, Size, Material"
                          className="text-xs h-9 bg-background font-medium"
                        />
                        {errors.options?.[optionIndex]?.name && (
                          <span className="text-[11px] text-destructive block font-medium">
                            {errors.options[optionIndex]?.name?.message}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 🎯 THE VALUE COMBINATION SELECTION MATRIX (SHOWING CHIPS + MODIFY INTERFACE) */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-foreground/70 block">
                          Active Attribute Generation Selections ({currentValuesCount}):
                        </label>

                        {/* Dynamic Modify Trigger for Managed/Global System Attributes */}
                        {!isCustomMode && globalGroup && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-6 text-[10px] font-semibold px-2 py-0 flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 dark:text-blue-300 dark:hover:bg-blue-900"
                            onClick={() => handleSelectAttributeGroup(selectedAttributeId, optionIndex)}
                          >
                            <Sliders className="w-2.5 h-2.5" /> Modify
                          </Button>
                        )}
                      </div>
                      
                      {isCustomMode ? (
                        /* Custom Input Inline Value Adding Mode */
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id={`custom-val-input-${optionIndex}`}
                              placeholder="Type raw value option (e.g. Small, Red, XL) then click Add"
                              className="text-xs h-8 bg-background max-w-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const inputEl = e.currentTarget;
                                  const rawVal = inputEl.value.trim();
                                  if (!rawVal) return;
                                  
                                  if (!currentValues.some(v => v.value.toLowerCase() === rawVal.toLowerCase())) {
                                    setValue(`options.${optionIndex}.values`, [...currentValues, { value: rawVal, isSkuDriver: true  }]);
                                  }
                                  inputEl.value = "";
                                }
                              }}
                            />
                            <Button 
                              type="button" 
                              variant="secondary" 
                              className="h-8 text-xs font-semibold px-3"
                              onClick={() => {
                                const inputEl = document.getElementById(`custom-val-input-${optionIndex}`) as HTMLInputElement;
                                const rawVal = inputEl?.value.trim();
                                if (!rawVal) return;
                                
                                if (!currentValues.some(v => v.value.toLowerCase() === rawVal.toLowerCase())) {
                                  setValue(`options.${optionIndex}.values`, [...currentValues, { value: rawVal, isSkuDriver: true }]);
                                }
                                inputEl.value = "";
                              }}
                            >
                              Add Value
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* ➕ ADDED: Global Attribute Mode - Inline Target Append Input Row */
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id={`global-val-append-input-${optionIndex}`}
                              placeholder={`Add new tag variant directly to global ${currentOption?.name || 'attribute'}...`}
                              className="text-xs h-8 bg-background max-w-xs border-dashed border-primary/40 focus-visible:border-solid"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const inputEl = e.currentTarget;
                                  const rawVal = inputEl.value.trim();
                                  if (!rawVal) return;
                                  
                                  if (!currentValues.some(v => v.value.toLowerCase() === rawVal.toLowerCase())) {
                                    setValue(`options.${optionIndex}.values`, [...currentValues, { value: rawVal, isSkuDriver: true  }]);
                                  }
                                  inputEl.value = "";
                                }
                              }}
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="h-8 text-xs font-bold px-3 border-dashed border-primary/40 text-primary hover:bg-primary/5 shadow-xs"
                              onClick={() => {
                                const inputEl = document.getElementById(`global-val-append-input-${optionIndex}`) as HTMLInputElement;
                                const rawVal = inputEl?.value.trim();
                                if (!rawVal) return;
                                
                                if (!currentValues.some(v => v.value.toLowerCase() === rawVal.toLowerCase())) {
                                  setValue(`options.${optionIndex}.values`, [...currentValues, { value: rawVal, isSkuDriver: true  }]);
                                }
                                inputEl.value = "";
                              }}
                            >
                              Quick Append
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Display Current Appended Values Only */}
                      <div className="flex flex-wrap gap-2 p-2 rounded border bg-background/50 min-h-11 items-center">
                        {currentValuesCount > 0 ? (
                          currentValues.map((v: any, valIdx: number) => {
                            const isDriver = v.isSkuDriver ?? true;
                            return (
                              <span 
                                key={valIdx} 
                                className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md text-xs font-medium border transition-all ${
                                  isDriver 
                                    ? "bg-primary/10 border-primary text-primary font-semibold" 
                                    : "bg-muted border-input text-muted-foreground line-through opacity-70"
                                }`}
                              >
                                {v.value}
                                
                                {/* Active Driver Toggle Button Indicator */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...currentValues];
                                    updated[valIdx] = { ...updated[valIdx], isSkuDriver: !isDriver };
                                    setValue(`options.${optionIndex}.values`, updated);
                                  }}
                                  className={`text-[9px] px-1 py-0.5 rounded-xs font-bold tracking-wider uppercase transition-colors select-none ${
                                    isDriver 
                                      ? "bg-primary text-primary-foreground hover:bg-primary/80" 
                                      : "bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30 line-normal"
                                  }`}
                                  title={isDriver ? "Click to exclude from variations compilation" : "Click to include in variation generation formula"}
                                >
                                  {isDriver ? "SKU" : "Skip"}
                                </button>

                                {/* Remove Value Tag */}
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-destructive font-bold text-[11px] px-0.5"
                                  onClick={() => {
                                    const filtered = currentValues.filter((_, idx) => idx !== valIdx);
                                    setValue(`options.${optionIndex}.values`, filtered);
                                  }}
                                >
                                  ✕
                                </button>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic self-center pl-1">
                            No structural parameters configured. Enter custom terms or map a global attribute above.
                          </span>
                        )}
                      </div>

                      {errors.options?.[optionIndex]?.values && (
                        <span className="text-[11px] text-destructive block font-medium">
                          ⚠ {errors.options[optionIndex]?.values?.message}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 border-dashed text-xs font-semibold gap-1.5"
                onClick={() => appendOption({ name: "", attributeId: "", isDriver: true, values: [] })}
              >
                ➕ Add New Attribute Dimension Row
              </Button>
            </div>
          </div>


          {/* 🏷️ SECTION 2.5: Dynamic SKU Generation Configuration Panel */}
          {watchedOptions.filter((o) => o.isDriver && o.name).length > 0 && (
            <>
              <FieldSeparator />

              <FieldSet className="border p-5 rounded-xl bg-muted/20 space-y-4">
                <div>
                  <FieldLegend className="text-sm font-semibold flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-primary" /> Automated Variant SKU Compiler Rules
                  </FieldLegend>
                  <FieldDescription>
                    Design your dynamic variant SKU templates by mixing standard syntax layout strings with active option tokens.
                  </FieldDescription>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* Formula Template Input */}
                  <div className="md:col-span-2 space-y-2">
                    <FieldLabel className="text-xs font-semibold text-foreground/80">SKU Construction Formula Structure</FieldLabel>
                    <Input 
                      {...register("skuPattern")} 
                      placeholder="e.g., [PARENT_SKU]-[COLOR]-[SIZE]" 
                      className="font-mono bg-background text-xs h-9"
                    />
                    {errors.skuPattern && (
                      <span className="text-xs text-destructive block mt-1 font-medium">
                        ⚠ {errors.skuPattern.message}
                      </span>
                    )}
                  </div>

                  {/* Separator Selection Field */}
                  <div className="space-y-2">
                    <FieldLabel className="text-xs font-semibold text-foreground/80 font-sans">Default Token Separator</FieldLabel>
                    <select 
                      {...register("skuSeparator")}
                      className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 shadow-xs font-medium cursor-pointer"
                    >
                      <option value="-">Hyphen ( - )</option>
                      <option value="_">Underscore ( _ )</option>
                      <option value="/">Slash ( / )</option>
                      <option value="">No Separator (Concatenation)</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic Action Trigger Token Row */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Available Layout Syntax Tokens (Click to append at cursor position):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Parent SKU Token */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] font-mono border-dashed bg-background font-semibold"
                      onClick={() => {
                        const current = watch("skuPattern") || "";
                        const sep = current ? watch("skuSeparator") || "" : "";
                        setValue("skuPattern", current + sep + "[PARENT_SKU]");
                      }}
                    >
                      [PARENT_SKU]
                    </Button>

                    {/* Brand Token */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] font-mono border-dashed bg-background font-semibold text-emerald-600 dark:text-emerald-400"
                      onClick={() => {
                        const current = watch("skuPattern") || "";
                        const sep = current ? watch("skuSeparator") || "" : "";
                        setValue("skuPattern", current + sep + "[BRAND]");
                      }}
                    >
                      [BRAND]
                    </Button>

                    {/* 🎯 ADDED: Auto-Increment Index Token */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] font-mono border-dashed bg-background font-semibold text-amber-600 dark:text-amber-400"
                      onClick={() => {
                        const current = watch("skuPattern") || "";
                        const sep = current ? watch("skuSeparator") || "" : "";
                        setValue("skuPattern", current + sep + "[INDEX]");
                      }}
                    >
                      [INDEX]
                    </Button>
                    
                    {/* Map every custom or system option checking driver boxes */}
                    {watchedOptions
                      .filter((opt) => opt.isDriver && opt.name?.trim())
                      .map((opt, idx) => {
                        const tokenStr = `[${opt.name.trim().toUpperCase().replace(/\s+/g, "_")}]`;
                        return (
                          <Button
                            key={idx}
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-6 text-[10px] font-mono bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold"
                            onClick={() => {
                              const current = watch("skuPattern") || "";
                              const sep = current ? watch("skuSeparator") || "" : "";
                              setValue("skuPattern", current + sep + tokenStr);
                            }}
                          >
                            {tokenStr}
                          </Button>
                        );
                      })}
                  </div>
                </div>

                {/* Real-Time Live Sandbox Engine Preview Component */}
                {(() => {
                  const parentMock = watch("name") 
                    ? watch("name").toUpperCase().substring(0, 6).replace(/\s+/g, "") + "-100" 
                    : "PARENT";
                    
                  const activeBrandId = watch("brandId");
                  const activeBrandItem = brands.find(b => b.id === activeBrandId);
                  const brandMock = activeBrandItem 
                    ? activeBrandItem.name.toUpperCase().substring(0, 3).replace(/\s+/g, "") 
                    : "BRD";

                  const pattern = watch("skuPattern") || "";
                  
                  // 🎯 Swap static placeholders, including our new sequential index preview mockup
                  let previewCompiled = pattern
                    .replace("[PARENT_SKU]", parentMock)
                    .replace("[BRAND]", brandMock)
                    .replace("[INDEX]", "001"); // Mocking the first increment sequence row
                  
                  // Handle dynamic variant parameter selections loop
                  watchedOptions.forEach((opt) => {
                    if (opt.isDriver && opt.name) {
                      const targetToken = `[${opt.name.trim().toUpperCase().replace(/\s+/g, "_")}]`;
                      const fallbackVal = opt.values?.[0]?.value || "XYZ";
                      previewCompiled = previewCompiled.split(targetToken).join(fallbackVal.toUpperCase().replace(/\s+/g, ""));
                    }
                  });

                  return (
                    <div className="p-3 rounded-lg border bg-background text-[11px] font-mono flex items-center justify-between text-muted-foreground shadow-2xs">
                      <span className="font-sans font-medium">Dynamic Live Output Preview:</span>
                      <span className="font-bold text-primary bg-primary/5 px-2.5 py-1 rounded border border-primary/20 tracking-wider">
                        {previewCompiled || "EMPTY_TEMPLATE"}
                      </span>
                    </div>
                  );
                })()}
              </FieldSet>
            </>
          )}


          {/* 🟢 SECTION 3: Live Matrix Variance Lifecycle Row Management */}
          {watch("variants")?.length > 0 && (
            <>
              <FieldSeparator />

              <VariantsManagerTable 
                control={control} 
                register={register} 
                watch={watch} 
              />
            </>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[160px]">
              {isSubmitting ? "Syncing collection rows..." : isEditMode ? "Save Group Options" : "Publish Product Group"}
            </Button>
          </div>
        </FieldGroup>


        {/* 📦 SHADCN DYNAMIC COMPILATION REVIEW DIALOG */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="md:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Layers className="w-4 h-4 text-primary" /> Matrix Compilation Pipeline Review
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review the simulated cross-product results before executing relational transaction layers in the core database.
              </DialogDescription>
            </DialogHeader>

            {formPayload && (() => {
              const { labels, totalCount } = computeLocalCartesianCount(formPayload.options);
              const sampleLimit = 5;

              return (
                <div className="space-y-4 py-2">
                  {/* Summary Metric Strip */}
                  <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Calculated Child Variations:</span>
                    <span className="font-bold text-sm text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/20">
                      {totalCount} Products
                    </span>
                  </div>

                  {/* Combinations Live List Area */}
                  {totalCount > 0 ? (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-foreground/70 block">
                        Upstream Naming Matrix Sneak-Peek (Showing first {Math.min(totalCount, sampleLimit)}):
                      </span>
                      <div className="max-h-[180px] overflow-y-auto border rounded-lg p-2 bg-background font-mono text-[11px] text-muted-foreground divide-y divide-border/40">
                        {labels.slice(0, sampleLimit).map((label, idx) => (
                          <div key={idx} className="py-1 first:pt-0 last:pb-0 truncate">
                            • {formPayload.name || "Unnamed"} ({label})
                          </div>
                        ))}
                        {labels.length > sampleLimit && (
                          <div className="pt-1.5 text-[10px] italic text-primary font-sans">
                            ...and {labels.length - sampleLimit} additional variant paths queued for generation.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 border border-dashed rounded-lg bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs font-medium">
                      ⚠ No values are currently checked as SKU generation drivers. This operation will register structural option keys only, without child item balances.
                    </div>
                  )}
                </div>
              );
            })()}

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm" className="text-xs font-semibold h-9">
                  Cancel & Edit
                </Button>
              </DialogClose>
              <Button 
                type="button" 
                size="sm" 
                onClick={executeDatabaseWrite} 
                disabled={isSubmitting}
                className="text-xs font-semibold h-9 px-4 shadow-sm"
              >
                {isSubmitting ? "Generating..." : "Confirm & Write Matrix"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </form>

      {/* GLOBAL ATTRIBUTE VALUES CHECKBOX DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="lg:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select {selectedAttributeGroup?.name} Options</DialogTitle>
            <DialogDescription>
              Choose which variations you want to apply to this product group bundle.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4 max-h-[300px] overflow-y-auto pr-1">
            {selectedAttributeGroup?.options.map((opt) => {
              const isChecked = pendingSelections.includes(opt.label);
              return (
                <div 
                  key={opt.valueId} 
                  className="flex items-center space-x-3 p-2 gap-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => togglePendingSelection(opt.label)}
                >
                  <Checkbox 
                    id={opt.valueId} 
                    checked={isChecked}
                    onCheckedChange={() => togglePendingSelection(opt.label)}
                  />
                  <label
                    htmlFor={opt.valueId}
                    className="text-sm font-medium leading-none cursor-pointer flex-1 flex items-center justify-between"
                    onClick={(e) => e.preventDefault()} // Stops double toggling because parent handles click
                  >
                    <span>{opt.label}</span>
                    {opt.meta?.hexCode && (
                      <span 
                        className="w-4 h-4 rounded-full border border-muted" 
                        style={{ backgroundColor: opt.meta.hexCode }} 
                      />
                    )}
                  </label>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleConfirmValues} className="gap-1.5">
              <Check className="w-4 h-4" /> Inject Values ({pendingSelections.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Add this sub-component inside your ProductGroupForm.tsx file or below it
export function VariantsManagerTable({ control, register, watch }: { control: any, register: any, watch: any }) {
  const { fields: variantFields } = useFieldArray({
    control,
    name: "variants"
  });

  return (
    <div className="border rounded-xl overflow-hidden bg-background mt-6">
      <div className="p-4 bg-muted/40 border-b">
        <h3 className="font-semibold text-sm">Generated Variant Combinations</h3>
        <p className="text-xs text-muted-foreground">Manage how individual SKU rows are preserved or dropped upon saving modifications.</p>
      </div>


      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-muted/20 border-b">
            <th className="p-3 font-medium">Generated SKU Map</th>
            <th className="p-3 font-medium">Variation Name / Attributes</th>
            <th className="p-3 font-medium">Default Base Price</th>
            <th className="p-3 font-medium text-right">Sync Integrity Lifecycle</th>
          </tr>
        </thead>
        <tbody>
          {variantFields.map((field, index) => {
            const status = watch(`variants.${index}.status`);
            const isExisting = watch(`variants.${index}.isExisting`);

            return (
              <tr 
                key={field.id} 
                className={`border-b transition-colors ${
                  status === "unlink" ? "bg-amber-50/40 opacity-70" : 
                  status === "delete" ? "bg-destructive/5 opacity-60 line-through" : ""
                }`}
              >
                <td className="p-3 font-mono font-medium">{watch(`variants.${index}.sku`)}</td>
                <td className="p-3 font-medium">{watch(`variants.${index}.name`)}</td>
                <td className="p-3">
                  <input 
                    type="number" 
                    step="0.01"
                    disabled={status !== "active"}
                    className="h-8 w-24 px-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    {...register(`variants.${index}.defaultPrice`)} 
                  />
                </td>
                <td className="p-3 text-right">
                  {isExisting ? (
                    <select 
                      className="h-8 text-xs rounded-md border bg-background px-2"
                      {...register(`variants.${index}.status`)}
                    >
                      <option value="active">🟢 Keep Active Group Link</option>
                      <option value="unlink">⚠️ Unlink (Keep Product in Catalog)</option>
                      <option value="delete">🗑️ Hard Delete Product Details</option>
                    </select>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                      ✨ New Intersection Line
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
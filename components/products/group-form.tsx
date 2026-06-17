// components/ProductGroupForm.tsx
"use client";

import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productGroupSchema, ProductGroupInput } from "@/schemas/group.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Layers, ArrowLeft, Plus, Trash2, X, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useEffect, useState } from "react";

// Shadcn UI Dialog & Checkbox imports
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

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
  productsLookup: LookupItem[]; 
  initialData?: any | null;
}

export function ProductGroupForm({ brands, categories, attributes, initialData }: ProductGroupFormProps) {
  const router = useRouter();
  const [tagInput, setTagInput] = useState("");
  const isEditMode = !!initialData;

  // State to manage the attribute value selection dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(null);
  const [selectedAttributeGroup, setSelectedAttributeGroup] = useState<AttributeGroup | null>(null);
  const [pendingSelections, setPendingSelections] = useState<string[]>([]);

  const form = useForm<ProductGroupInput>({
    resolver: zodResolver(productGroupSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      brandId: "",
      categoryId: "",
      isActive: true,
      tags: initialData?.tags?.map((t: any) => t.value) ?? [],
      features: initialData?.features?.map((f: any) => ({ key: f.key, value: f.value })) ?? [],
      options: initialData?.options?.map((option: any) => ({
        name: option.name,
        attributeId: option.attributeId ?? "",
        values: option.values?.map((v: any) => ({ value: v.value })) ?? [],
      })) ?? [],
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
      name: initialData.name,
      categoryId: initialData.categoryId,
      brandId: initialData.brandId,
      isActive: initialData.isActive,
      tags: initialData.tags?.map((t: any) => t.value) ?? [],
      features: initialData.features?.map((f: any) => ({ key: f.key, value: f.value })) ?? [],
      options: initialData.options?.map((option: any) => ({
        name: option.name,
        attributeId: option.attributeId ?? "",
        values: option.values?.map((v: any) => ({ value: v.value })) ?? [],
      })) ?? [],
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
      
      const mappedValues = pendingSelections.map(val => ({ value: val }));
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

  const onSubmit = async (values: ProductGroupInput) => {
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

      toast.success(isEditMode ? "Product collection modifications saved" : "Matrix product grouping registered");
      router.push("/dashboard/product-groups");
      router.refresh();
    } catch (err: any) {
      toast.error("Pipeline Sync Interrupted", { description: err.message });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-8">
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

            <Field>
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
            </Field>

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
                    {watchedTags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 text-xs font-medium">
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

          {/* Section 2: Variant Attributes Custom Generator */}
          <FieldSet>
            <div className="flex justify-between items-center mb-2">
              <div>
                <FieldLegend>Variant Variations</FieldLegend>
                <FieldDescription>Assign options and specify sub-variants.</FieldDescription>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => appendOption({ name: "", attributeId: "", values: [] })}>
                <Plus className="w-4 h-4" /> Add Option Attribute
              </Button>
            </div>

            {errors.options?.root ? (
              <div className="p-3 mb-2 text-xs font-medium border border-destructive/20 text-destructive bg-destructive/10 rounded-lg">
                {errors.options.root.message}
              </div>
            ) : errors.options && !Array.isArray(errors.options) ? (
              <div className="p-3 mb-2 text-xs font-medium border border-destructive/20 text-destructive bg-destructive/10 rounded-lg">
                {(errors.options as any).message}
              </div>
            ) : null}

            <FieldGroup className="gap-4 mt-4">
              {optionFields.map((optionField, optionIndex) => {
                const selectedAttributeId = watchedOptions[optionIndex]?.attributeId;
                const isGlobalSelected = Boolean(selectedAttributeId);

                return (
                  <div key={optionField.id} className="p-4 border rounded-xl bg-muted/30 relative space-y-4">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" onClick={() => removeOption(optionIndex)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <Field>
                        <FieldLabel>Global Option Class</FieldLabel>
                        <Select
                          value={selectedAttributeId || "custom-literal-mode"}
                          onValueChange={(val) => handleSelectAttributeGroup(val, optionIndex)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Match Existing Attribute" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom-literal-mode">Custom Attribute (None)</SelectItem>
                            {attributes.map((ga) => (
                              <SelectItem key={ga.attributeId} value={ga.attributeId}>{ga.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      {!isGlobalSelected ? (
                        <Field>
                          <FieldLabel>Custom Literal Name *</FieldLabel>
                          <Input placeholder="e.g., Fabric Weight (Custom)" {...register(`options.${optionIndex}.name`)} />
                          {errors.options?.[optionIndex]?.name && (
                            <span className="text-xs text-destructive">{errors.options[optionIndex]?.name?.message}</span>
                          )}
                        </Field>
                      ) : (
                        <Field className="opacity-60 cursor-not-allowed">
                          <FieldLabel>Selected Attribute Name</FieldLabel>
                          <div className="flex items-center justify-between h-9 w-full bg-muted border border-dashed rounded-md px-3 text-sm text-foreground">
                            <span>{watchedOptions[optionIndex]?.name || ""}</span>
                            <Button 
                              type="button" 
                              variant="link" 
                              size="sm" 
                              className="h-auto p-0 text-xs" 
                              onClick={() => handleSelectAttributeGroup(selectedAttributeId, optionIndex)}
                            >
                              Edit Selections
                            </Button>
                          </div>
                        </Field>
                      )}
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Attribute Tag Values *</FieldLabel>
                      <ValuesSubArray optionIndex={optionIndex} control={control} register={register} errors={errors} />
                    </div>
                  </div>
                );
              })}
            </FieldGroup>
          </FieldSet>

          <div className="flex items-center justify-between border-t pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[160px]">
              {isSubmitting ? "Syncing collection rows..." : isEditMode ? "Save Group Options" : "Publish Product Group"}
            </Button>
          </div>
        </FieldGroup>
      </form>

      {/* GLOBAL ATTRIBUTE VALUES CHECKBOX DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
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
                  className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
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
          <button type="button" onClick={() => remove(valIndex)} className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors">
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
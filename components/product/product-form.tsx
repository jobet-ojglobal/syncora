"use client";

import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, ProductInput, DEFAULT_CUSTOM_FIELDS } from "@/schemas/product.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Trash2, 
  Plus, 
  ArrowLeft, 
  Package, 
  Barcode, 
  Scale, 
  Calendar, 
  Image as ImageIcon, 
  Link2, 
  Settings, 
  Hourglass, 
  DollarSign,
  LinkIcon,
  ChevronUp,
  ChevronDown,
  XIcon,
  Loader2,
  Save,
  AlertCircle,
  Edit3,
  FolderTree,
  Settings2,
  X,
  Key,
  Search,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { generateSku2Variant2 } from "@/helpers/genSKU";
import React, { useEffect, useMemo, useState } from "react";
import { BrandSelect } from "../shared/brand-select";
import { CategorySelect } from "../shared/category-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group";
import { DynamicAlert } from "../shared/alert";
import { FormInput } from "../shared/form-input";
import { FormSelect } from "../shared/form-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SelectOption {
  id: string;
  name: string;
  disabled?: boolean;
}

interface BrandLookupOption {
  id: string;
  name: string;
}

interface UomLookupReference {
  id: string;
  code: string;
  name: string;
  category: string;
}

export interface GroupAttributeValueDetails {
  id: string;
  value: string;
}

export interface GroupOptionValueNode {
  inflowId: string;
  lineNum: number;
  attributeValue: GroupAttributeValueDetails;
}

export interface GroupOptionMatrixStructure {
  inflowId: string;
  lineNum: number;
  attribute: {
    id: string;
    name: string;
  };
  values: GroupOptionValueNode[];
}

export interface VariantSelectionMapping {
  optionId: string;
  optionValueId: string;
  optionValue: {
    attributeValue: {
      value: string; // Used to compute labels like "Red / Large" on the frontend
    };
  };
}

export interface GroupVariantSlot {
  inflowId: string;
  signature: string;
  productId: string | null; // Nullable if the slot is open for connection
  defaultPrice: number | string;
  isActive: boolean;
  product?: {
    sku: string | null;
    name: string;
  } | null;
  selections: VariantSelectionMapping[];
}

// 🎯 The Main Product Group Interface Type Definition
export interface ProductGroupLookupDetail {
  id: string;
  inflowId: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  brandId: string | null;
  categoryId: string | null;
  brand?: BrandLookupOption | null;

  category?: {
    inflowId: string;
    name: string;
  } | null;
  variants: GroupVariantSlot[];
  options: GroupOptionMatrixStructure[];
}

interface ProductFormProps {
  brands: BrandLookupOption[];
  uoms: UomLookupReference[]; 
  groups: ProductGroupLookupDetail[];
  pricingSchemes: {
    inflowId: string;
    name: string;
  }[];
  initialData?: ProductInput | null;
}

export function ProductForm({  brands, uoms, groups: productGroups, pricingSchemes = [], initialData }: ProductFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  // Place inside your component:
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  // 1. Pre-calculate all pricing schemes mapped over initial values
  const initialPrices = useMemo(() => {
  //   // If we have existing data rows, group them by scheme to preserve them
    if (initialData?.prices && initialData.prices.length > 0) {
      return initialData.prices.map((p: any) => ({
        inflowId: p.inflowId,
        pricingSchemeId: p.pricingSchemeId,
        priceType: p.priceType || "FixedPrice",
        unitPrice: p.unitPrice ? Number(p.unitPrice) : 0,
        fixedMarkup: p.fixedMarkup ? Number(p.fixedMarkup) : 0,
      }));
    }

    // If it's a brand new product, cleanly loop through all platform schemes 
    // so the operator doesn't have to hit "Append Tier" 5 times manually.
    if (pricingSchemes && pricingSchemes.length > 0) {
      // return pricingSchemes.map((scheme) => ({
      //   pricingSchemeId: scheme.inflowId,
      //   priceType: "FixedPrice" as "FixedPrice" | "FixedMarkup" | "Dynamic" | "Tiered",
      //   unitPrice: 0,
      //   fixedMarkup: 0,
      // }));

      return pricingSchemes.filter((scheme) => scheme.name === "Normal Price").map((scheme) => ({
        pricingSchemeId: scheme.inflowId,
        priceType: "FixedPrice" as "FixedPrice" | "FixedMarkup" | "Dynamic" | "Tiered",
        unitPrice: 0,
        fixedMarkup: 0,
      }));
    }
    
    

  //   // Bare minimum fallback array structure
  //   return [{ pricingSchemeId: "", priceType: "FixedPrice" as "FixedPrice" | "FixedMarkup" | "Dynamic" | "Tiered", unitPrice: 0, fixedMarkup: 0 }];
  }, [initialData, pricingSchemes]);

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      inflowId: initialData?.inflowId,
      productGroupId: (initialData as any)?.variant?.productGroupId || "",
      variantSignature: (initialData as any)?.variant?.signature || "",
      sku: initialData?.sku || "",
      name: initialData?.name || "",
      description: initialData?.description || "",
      itemType: initialData?.itemType || "",
      brandId: initialData?.brandId || "",
      categoryId: initialData?.categoryId || "",
      autoAssemble: initialData?.autoAssemble ?? false,
      isActive: initialData?.isActive ?? true,
      isManufacturable: initialData?.isManufacturable ?? false,
      includeQuantityBuildable: initialData?.includeQuantityBuildable ?? false,
      trackExpiry: initialData?.trackExpiry ?? false,
      trackLots: initialData?.trackLots ?? false,
      trackSerials: initialData?.trackSerials ?? false,
      shelfLifeDays: initialData?.shelfLifeDays || 0,
      sellBeforeExpiryDays: initialData?.sellBeforeExpiryDays || 0,
      expiryNotificationDays: initialData?.expiryNotificationDays || 0,
      weight: initialData?.weight ? Number(initialData.weight) : 0,
      width: initialData?.width ? Number(initialData.width) : 0,
      height: initialData?.height ? Number(initialData.height) : 0,
      length: initialData?.length ? Number(initialData.length) : 0,

      customFields: {
        ...DEFAULT_CUSTOM_FIELDS,
        ...(initialData?.customFields ?? {}),
      },
      tags: initialData?.tags ?? [],
      features: initialData?.features?.map((f: any) => ({ key: f.key, value: f.value })) ?? [],

      // Seed extended valuation allocations
      initialCost: initialData?.initialCost ? Number(initialData.initialCost) : 0,
      // 2. Pass our clean computed matrix here 🌟
      prices: initialPrices,
      // prices: [],

      originCountry: initialData?.originCountry || "",
      hsTariffNumber: initialData?.hsTariffNumber || "",
      remarks: initialData?.remarks || "",
      standardUomName: initialData?.standardUomName || "", 
      purchasingUom: {
        name: initialData?.purchasingUom?.name || "",
        standardQuantity: initialData?.purchasingUom?.standardQuantity ? Number(initialData.purchasingUom.standardQuantity) : 1,
        uomQuantity: initialData?.purchasingUom?.uomQuantity ? Number(initialData.purchasingUom.uomQuantity) : 1,
      },
      salesUom: {
        name: initialData?.salesUom?.name || "",
        standardQuantity: initialData?.salesUom?.standardQuantity ? Number(initialData.salesUom.standardQuantity) : 1,
        uomQuantity: initialData?.salesUom?.uomQuantity ? Number(initialData.salesUom.uomQuantity) : 1,
      },
      barcodes: initialData?.barcodes?.map((b: any) => ({ id: b.id, barcode: b.barcode })) || [],
      images: initialData?.images?.map((img: any) => ({ 
        id: img.id, 
        originalUrl: img.originalUrl || "",
        thumbUrl: img.thumbUrl || "",
        smallUrl: img.smallUrl || "",
        mediumUrl: img.mediumUrl || "",
        largeUrl: img.largeUrl || "",
      })) || [],
    },
  });

  const { register, control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = form;
  const { fields: priceFields, append: appendPrice, remove: removePrice } = useFieldArray({
    control,
    name: "prices"
  });
  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control,
    name: "images"
  });
  const { fields: barcodeFields, append: appendBarcode, remove: removeBarcode } = useFieldArray({
    control,
    name: "barcodes"
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: "features"
  });

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
  
  
  // Watch the matrix relationship variables
  const watchedGroupId = useWatch({ control, name: "productGroupId" });
  const watchedVariantSignature = useWatch({ control, name: "variantSignature" });
  const watchedImages = useWatch({ control, name: "images" });
  const watchedItemType = useWatch({ control, name: "itemType" });

  const selectedGroupDetails = useMemo(() => {
    if (!watchedGroupId || !productGroups) return null;
    return productGroups.find(g => g.inflowId === watchedGroupId);
  }, [watchedGroupId, productGroups]);

  

  const computedVariantSlotsFromOptions = useMemo(() => {
    if (!selectedGroupDetails || !selectedGroupDetails.options || selectedGroupDetails.options.length === 0) {
      return [];
    }

    // 1. Extract option structural array trees using inflow IDs matching the backend
    const arraysToCombine = selectedGroupDetails.options.map(opt => 
      opt.values.map(val => ({
        optionId: opt.inflowId,         // Maps to backend item.optionInflowId
        optionValueId: val.inflowId,    // Maps to backend item.valueInflowId
        value: val.attributeValue?.value || ""
      }))
    );

    // Classic Cartesian Product calculation function
    const getCartesian = (arrays: any[][]): any[][] => {
      return arrays.reduce((acc, curr) => acc.flatMap(d => curr.map(e => [...d, e])), [[]]);
    };

    const intersections = getCartesian(arraysToCombine);

    return intersections.map((combination: any[]) => {
      // 🎯 UPDATED FRONTEND FIX: Build signature using exact backend format -> [optionInflowId]:[valueInflowId] joined by "|"
      const signature = combination
        .map(c => `${c.optionId}:${c.optionValueId}`)
        .sort()
        .join("|");

      // 🎯 UPDATED FRONTEND FIX: Clean spacing to match the new backend variationLabels generation format
      const labelString = combination.map(c => c.value.trim()).join(" / ");

      // Now this exact lookup will find your DB variant records seamlessly using the enhanced signature string!
      const matchedDbVariant = selectedGroupDetails.variants?.find(v => v.signature === signature);

      return {
        signature,
        labelString,
        productId: matchedDbVariant?.productId || null,
        product: matchedDbVariant?.product || null,
        selections: combination.map(c => ({
          optionId: c.optionId,
          optionValueId: c.optionValueId,
          optionValue: { attributeValue: { value: c.value } }
        }))
      };
    });
  }, [selectedGroupDetails]);


   const currentSelectionBreakdown = useMemo(() => {
    if (!watchedVariantSignature || !computedVariantSlotsFromOptions) return [];

    // 1. Find the current selected variant intersection slot
    const activeSlot = computedVariantSlotsFromOptions.find(
      (slot) => slot.signature === watchedVariantSignature
    );

    if (!activeSlot || !selectedGroupDetails?.options) return [];

    // 2. Decode the signature or combinations array back into an explicit UI layout map
    return activeSlot.selections.map((selection: any) => {
      // Find matching base group option text for this specific selection node
      const groupOption = selectedGroupDetails.options.find(
        (opt) => opt.inflowId === selection.optionId
      );
      
      // Find the specific string value assigned to this selection
      const optionValue = groupOption?.values.find(
        (v) => v.inflowId === selection.optionValueId
      );

      return {
        attributeName: groupOption?.attribute?.name || "Attribute",
        valueText: optionValue?.attributeValue?.value || "Unassigned"
      };
    });
  }, [watchedVariantSignature, computedVariantSlotsFromOptions, selectedGroupDetails])

  // 2. 🎯 Streamlined Label constructor targeting the combined schema data
  const getVariantLabel = (variant: any) => {
    const baseLabel = variant.labelString || "Unknown Option Configuration Slot";
    
    return variant.product
      ? `${baseLabel} (Occupied by SKU: ${variant.product.sku})`
      : `${baseLabel} (Available Connection)`;
  };

  const watchedName = useWatch({ control, name: "name" });
  const watchedBrandId = useWatch({ control, name: "brandId" });
  const watchedTrackExpiry = useWatch({ control, name: "trackExpiry" });

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map(b => [b.id, b.name])),
    [brands]
  );

  useEffect(() => {
    if (isEditMode || !watchedBrandId) return;
    const brandName = brandMap[watchedBrandId];
    if (!brandName || !watchedName) return;

    const sku = generateSku2Variant2(brandName, watchedName, []);
    setValue("sku", sku);
  }, [watchedName, watchedBrandId, brandMap, isEditMode, setValue]);
  

  const variantOptions: SelectOption[] = React.useMemo(() => {
    if (!selectedGroupDetails) return [];

    return computedVariantSlotsFromOptions.map((v) => {
      const isOccupiedByOther = v.productId && v.productId !== form.getValues("inflowId");

      return {
        id: v.signature,
        name: getVariantLabel(v),
        disabled: !!isOccupiedByOther,
      };
    });
  }, [selectedGroupDetails, computedVariantSlotsFromOptions, form]);

  const onSubmit = async (values: ProductInput) => {

    console.log("Submitting values:", values);

    if(values.itemType !== "StockedProduct") {
      values.trackExpiry = false;
      values.trackLots = false;
      values.trackSerials = false;
      values.shelfLifeDays = undefined;
      values.sellBeforeExpiryDays = undefined;
      values.expiryNotificationDays = undefined;
    }
    
    try {
      const endpoint = "/api/admin/products";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed product entity catalog modification processing.");
      }

      toast.success(isEditMode ? "Catalog Item Rectified" : "Product SKU Successfully Registered");
      router.push("/dashboard/products");
      router.refresh();
    } catch (err: any) {
      toast.error("Catalog Processing Exception", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          {/* <ProductProfileForm /> */}

          {/* Core Profile */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="space-y-0.5 border-b pb-2">
              <FieldLegend className="flex items-center gap-2 text-sm font-semibold ">
                <Package className="w-4 h-4 text-primary" /> 
                Master SKU Core Identification
              </FieldLegend>
            </div>


            <FieldSet className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Controller 
                control={control} 
                name="name"
                render={({ field, fieldState }) => (
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="form-name">
                      Product Master Display Title <b className="text-red-500">*</b>
                    </FieldLabel>
                    <Input
                      {...field}
                      placeholder="e.g. Premium Ergonomic Office Chair"
                      id="form-name"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError className="text-xs" errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller 
                control={control} 
                name="sku"
                render={({ field, fieldState }) => (
                  <Field className="md:col-span-1">
                    <FieldLabel htmlFor="form-sku">
                      SKU / Custom Identity <b className="text-red-500">*</b>
                    </FieldLabel>
                    <Input
                      {...field}
                      placeholder="PROD-CHAIR-001"
                      id="form-sku"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError className="text-xs" errors={[fieldState.error]} />}
                  </Field>
                )}
              />

            </FieldSet>

            <FieldSet className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field className="md:col-span-1">
                <FieldLabel>Brand</FieldLabel>
                <Controller
                  name="brandId"
                  control={control}
                  render={({ field }) => 
                    <BrandSelect value={field.value ?? undefined} onChange={field.onChange} className="h-8" />}
                />
              </Field>

              <Field className="md:col-span-1">
                <FieldLabel>Category</FieldLabel>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => <CategorySelect value={field.value ?? undefined} onChange={field.onChange} className="h-8" />}
                />
              </Field>

              <FormSelect
                name="standardUomName"
                control={control}
                label="Base System UOM"
                placeholder="-- Select UOM --"
                options={uoms.map((item) => ({
                  id: item.code,
                  name: `${item.name} (${item.code})`,
                }))}
                required
                emptyMessage="No base unit available"
                classNameLabel="text-muted-foreground font-semibold"
              />

            </FieldSet>

            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="md:col-span-3">
                  <FieldLabel htmlFor="form-prod-description">Public Summary Description</FieldLabel>
                  <Textarea
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === "" ? null : val); 
                    }}
                    id="form-prod-description"
                    aria-invalid={fieldState.invalid}
                    placeholder="Provide descriptive high-fidelity characteristics detailing materials..." 
                    rows={3}
                  />
                  {fieldState.invalid && <FieldError className="text-xs" errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          {/* Matrix Relationship Binding Section */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="space-y-0.5 flex items-center justify-between border-b pb-2">
              <FieldLegend className="flex items-center gap-2 text-sm font-semibold ">
                <FolderTree className="w-4 h-4 text-primary" /> 
                Matrix Relationship Binding
              </FieldLegend>
            </div>

            <FieldSet className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
              <FormSelect
                name="productGroupId"
                control={control}
                label="Product Group Cluster"
                placeholder="-- Select Product Group --"
                options={productGroups.map((item) => ({
                  id: item.inflowId,
                  name: item.name,
                }))}
                emptyMessage="No product group available"
                classNameLabel="text-muted-foreground font-semibold"
              />

              

              {/* 2. Select the specific Variant Intersection slot */}
              {selectedGroupDetails && (
                <FormSelect
                  name="variantSignature"
                  control={form.control}
                  label="Variant Slot"
                  placeholder="-- Select Variant Slot --"
                  options={variantOptions}
                  emptyMessage="No attribute slot available"
                  classNameLabel="text-muted-foreground font-semibold"
                />
              )}

              

              {/* 📊 Active Matrix Attribute Configuration Dashboard Block */}
              {selectedGroupDetails && (
                <div className="col-span-1 md:col-span-3 rounded-lg border border-dashed p-4 bg-muted/30 space-y-3 animate-in fade-in duration-200">
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Active Group Matrix Metadata View: <span className="text-foreground normal-case font-medium">{selectedGroupDetails.name}</span>
                    </h4>
                  </div>

                  {/* 🎯 FIX 1: Alerts placed outside the badge flexbox wrapper for proper structural layout */}
                  {(() => {
                    const activeSlot = computedVariantSlotsFromOptions.find(s => s.signature === watchedVariantSignature);
                    const currentProductId = initialData?.inflowId || form.getValues("inflowId");
                    
                    if (activeSlot?.productId && activeSlot.productId !== currentProductId) {
                      return (
                        <div className="text-xs bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-md font-medium animate-pulse w-full">
                          ⚠️ Warning: This exact variant selection is currently locked by SKU: {activeSlot.product?.sku || "Another Product"}
                        </div>
                      );
                    }
                    if (activeSlot?.productId && activeSlot.productId === currentProductId) {
                      return (
                        <div className="text-xs bg-green-500/10 border border-green-500/20 text-green-600 px-3 py-2 rounded-md font-medium w-full">
                          ✓ Current Selection: This slot is already bound to this active item document.
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* 🟢 Badges Display Layer */}
                  {currentSelectionBreakdown.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentSelectionBreakdown.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-md"
                        >
                          <span className="font-semibold text-muted-foreground/70">{item.attributeName}:</span>
                          <span className="font-medium font-mono">{item.valueText}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic pt-1">
                      No concrete variant configuration node matched yet. Select a slot above or configure custom matrix values.
                    </div>
                  )}

                  {/* Fallback layout mapping to show all total options assigned to the base group structure */}
                  <div className="pt-2 border-t border-dashed grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <span className="col-span-1 sm:col-span-2 text-muted-foreground/60 font-medium">Available Core Options Matrix Parameters:</span>
                    {selectedGroupDetails.options?.map((opt) => (
                      <div key={opt.inflowId} className="bg-background border rounded px-2 py-1 flex items-center justify-between">
                        <span className="font-medium text-muted-foreground">{opt.attribute.name}</span>
                        <span className="text-foreground font-mono truncate max-w-[180px]">
                          {opt.values.map(v => v.attributeValue?.value).join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </FieldSet>

          </div>

          {/* Operational Flow Settings */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="space-y-0.5 border-b pb-2">
              <FieldLegend className="flex items-center gap-2 text-sm font-semibold ">
                <Settings className="w-4 h-4 text-primary" /> 
                Operational Configurations & Strategy
              </FieldLegend>
            </div>

            <FieldSet className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
              <Controller
                control={control}
                name="itemType"
                render={({ field, fieldState }) => (
                  <Field className="col-span-1">
                    <FieldLabel>Item Classification Type</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Item Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="StockedProduct">Stock Product</SelectItem>
                        <SelectItem value="NonstockedProduct">Non-Stock Product</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/10 p-4 border rounded-xl">
                <div className="flex items-center justify-between gap-4">
                  <FieldLabel className="mb-0 text-xs font-semibold">Catalog Visibility Active</FieldLabel>
                  <Controller control={control} name="isActive" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <FieldLabel className="mb-0 text-xs font-semibold">Is Manufacturable</FieldLabel>
                  <Controller control={control} name="isManufacturable" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <FieldLabel className="mb-0 text-xs font-semibold">Auto-Assemble Bundles</FieldLabel>
                  <Controller control={control} name="autoAssemble" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <FieldLabel className="mb-0 text-xs font-semibold">Include Buildable Qty</FieldLabel>
                  <Controller control={control} name="includeQuantityBuildable" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                </div>
              </div>
            </FieldSet>

          </div>

          {/* Traceability Control Flags */}
          { watchedItemType === "StockedProduct" && (
            <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
              <div className="space-y-0.5 flex items-center justify-between border-b pb-2">
                <FieldLegend className="flex items-center gap-2 text-sm font-semibold ">
                  <Calendar className="w-4 h-4 text-primary" /> 
                  Traceability Control Flags
                </FieldLegend>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div className="flex items-center justify-between border p-3 rounded-xl bg-muted/10 gap-4">
                  <div><FieldLabel className="mb-0 text-xs font-semibold">Lot Tracking</FieldLabel></div>
                  <Controller control={control} name="trackLots" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                </div>
                <div className="flex items-center justify-between border p-3 rounded-xl bg-muted/10 gap-4">
                  <div><FieldLabel className="mb-0 text-xs font-semibold">Serial Tracking</FieldLabel></div>
                  <Controller control={control} name="trackSerials" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                </div>
                <div className="flex items-center justify-between border p-3 rounded-xl bg-muted/10 gap-4">
                  <div><FieldLabel className="mb-0 text-xs font-semibold">Expiry Tracking</FieldLabel></div>
                  <Controller control={control} name="trackExpiry" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                </div>
              </div>
          

              {watchedTrackExpiry && (
                <FieldSet className="grid grid-cols-1 sm:grid-cols-3 gap-4 border p-4 rounded-xl bg-amber-50/20 border-amber-200/60 transition-all">
                  <FieldLegend className="col-span-1 sm:col-span-3 flex items-center gap-2 text-amber-800 font-medium text-xs uppercase tracking-wider">
                    <Hourglass className="w-3.5 h-3.5 text-amber-600" /> Shelf Life & Expiration Offsets
                  </FieldLegend>
                  <Field>
                    <FieldLabel>Total Shelf Life (Days)</FieldLabel>
                    <Input type="number" placeholder="0" {...register("shelfLifeDays", { valueAsNumber: true })} />
                  </Field>
                  <Field>
                    <FieldLabel>Sell Before Offset (Days)</FieldLabel>
                    <Input type="number" placeholder="0" {...register("sellBeforeExpiryDays", { valueAsNumber: true })} />
                  </Field>
                  <Field>
                    <FieldLabel>Notification Alert (Days)</FieldLabel>
                    <Input type="number" placeholder="0" {...register("expiryNotificationDays", { valueAsNumber: true })} />
                  </Field>
                </FieldSet>
              )}
            </div>
          )}
          
          {/* Dimensions & Logistics Metrics Section */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="space-y-0.5 flex items-center justify-between border-b pb-2">
              <FieldLegend className="flex items-center gap-2 text-sm font-semibold ">
                <Scale className="w-4 h-4 text-primary" /> 
                Dimensional Logistics & Compliance
              </FieldLegend>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field>
                <FieldLabel>Weight (kg)</FieldLabel>
                <Input type="number" step="0.0001" placeholder="0.0000" {...register("weight", { valueAsNumber: true })} />
              </Field>
              <Field>
                <FieldLabel>Width (cm)</FieldLabel>
                <Input type="number" step="0.0001" placeholder="0.0" {...register("width", { valueAsNumber: true })} />
              </Field>
              <Field>
                <FieldLabel>Height (cm)</FieldLabel>
                <Input type="number" step="0.0001" placeholder="0.0" {...register("height", { valueAsNumber: true })} />
              </Field>
              <Field>
                <FieldLabel>Length (cm)</FieldLabel>
                <Input type="number" step="0.0001" placeholder="0.0" {...register("length", { valueAsNumber: true })} />
              </Field>

              <Field className="col-span-2">
                <FieldLabel>Country of Origin</FieldLabel>
                <Input placeholder="e.g. United States, Germany" {...register("originCountry")} />
              </Field>
              <Field className="col-span-2">
                <FieldLabel>HS Code (International Tariff)</FieldLabel>
                <Input placeholder="e.g. 9401.30.0000" {...register("hsTariffNumber")} />
              </Field>
            </div>
          </div>

          

          {/* Operational Multi-tier */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="space-y-0.5 flex items-center justify-between  border-b pb-2">
              <FieldLegend className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="w-4 h-4 text-primary" /> 
                Operational Multi-tier UOM Calculations
              </FieldLegend>
            </div>

            {/* Purchasing Mapping Block */}
            <div className="p-4 bg-muted/20 border rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Inbound Supply / Purchasing Conversion
              </h4>
              <Controller
                name="purchasingUom.name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-inbound-uom">
                      Inbound UOM Unit Tag <b className="text-red-500">*</b>
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Select
                        name={field.name}
                        value={field.value ?? ""}
                        onValueChange={(val) => field.onChange(val === "null" ? "" : val)} 
                      >
                        <SelectTrigger
                          id="form-inbound-uom"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select Inbound Unit" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">
                          { uoms.length > 0 ? (
                            uoms.map((u) => (
                            <SelectItem key={u.id} value={u.code}>{u.name} ({u.code})</SelectItem>
                          ))) : (
                            <SelectItem value="null">No unit of measure available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
             
              <div className="grid grid-cols-2 gap-2">
                <Controller 
                  control={control} 
                  name="purchasingUom.standardQuantity"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-inbound-standqty">
                        Standard Base Qty
                      </FieldLabel>
                        <Input
                        // Extract value and onChange to control them explicitly
                        value={field.value}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? "" : Number(val));
                        }}
                        id="form-inbound-standqty"
                        type="number" 
                        step="0.0001" 
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError className="text-xs" errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller 
                  control={control} 
                  name="purchasingUom.uomQuantity"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-inbound-packqty">
                        Equal to Pack Volume
                      </FieldLabel>
                        <Input
                        // Extract value and onChange to control them explicitly
                        value={field.value}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? "" : Number(val));
                        }}
                        id="form-inbound-packqty"
                        type="number" 
                        step="0.0001" 
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError className="text-xs" errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </div>

            {/* Sales Conversion Mapping Block */}
            <div className="p-4 bg-muted/20 border rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Outbound / Sales Channels Conversion
              </h4>
              <Controller
                name="salesUom.name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-outbound-uom">
                      Outbound UOM Unit Tag <b className="text-red-500">*</b>
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Select
                        name={field.name}
                        value={field.value ?? ""}
                        onValueChange={(val) => field.onChange(val === "null" ? "" : val)} 
                      >
                        <SelectTrigger
                          id="form-outbound-uom"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select Outbound Unit" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">
                          { uoms.length > 0 ? (
                            uoms.map((u) => (
                            <SelectItem key={u.id} value={u.code}>{u.name} ({u.code})</SelectItem>
                          ))) : (
                            <SelectItem value="null">No unit of measure available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
             
              <div className="grid grid-cols-2 gap-2">
                <Controller 
                  control={control} 
                  name="salesUom.standardQuantity"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-outbound-standqty">
                        Standard Base Qty
                      </FieldLabel>
                        <Input
                        // Extract value and onChange to control them explicitly
                        value={field.value}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? "" : Number(val));
                        }}
                        id="form-outbound-standqty"
                        type="number" 
                        step="0.0001" 
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError className="text-xs" errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller 
                  control={control} 
                  name="salesUom.uomQuantity"
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="form-outbound-packqty">
                        Equal to Pack Volume
                      </FieldLabel>
                        <Input
                        // Extract value and onChange to control them explicitly
                        value={field.value}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? "" : Number(val));
                        }}
                        id="form-outbound-packqty"
                        type="number" 
                        step="0.0001" 
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError className="text-xs" errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Additional Remarks */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs hidden sm:block">
            <div className="space-y-0.5 flex items-center justify-between">
              <FieldLegend className="flex items-center gap-2 text-sm font-semibold">
                <Edit3 className="w-4 h-4 text-primary" /> 
                Internal System Administrative Remarks
              </FieldLegend>
            </div>

            <Controller
              name="remarks"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Textarea
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === "" ? null : val); 
                    }}
                    id="form-remarks"
                    aria-invalid={fieldState.invalid}
                    placeholder="Add internal operational notices..."
                    className="min-h-[120px]"
                  />
                  {fieldState.invalid && <FieldError className="text-xs" errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

        </div>

        {/* right Column */}
        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Product Highlights & Discoverability
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Manage key product attributes that improve visibility, search results, and customer discovery.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
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
                <div>
                  <FieldLabel htmlFor="tags-input" >Search Keywords & Tags</FieldLabel>
                  <FieldDescription className="text-[11px] text-muted-foreground">Type a tag and press <kbd className="px-1 bg-muted border rounded text-[10px]">Enter</kbd> or <kbd className="px-1 bg-muted border rounded text-[10px]">,</kbd> to lock it in.</FieldDescription>
                </div>
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
            </CardContent>
          </Card>
          
          {/* 🏢 Dynamic Multi-Tier Pricing Matrix Section */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs ">
            <div className="space-y-0.5 border-b pb-2">
              <FieldLegend className="flex items-center gap-2 text-sm font-semibold">
                <DollarSign className="w-4 h-4 text-primary" /> 
                Multi-Scheme Pricing Matrix
              </FieldLegend>
            </div>

            {/* CUSTOM ERROR ALERT FOR Image ARRAY */}
            {errors.prices?.message && !Array.isArray(errors.prices) && priceFields.length === 0 && (
              <DynamicAlert title="Missing Information" description={errors.prices.message} variant="destructive" />
            )}
            
            {/* Pricing Items */}
            <div className="space-y-3">
              <FormInput
                name="initialCost"
                control={control}
                label="Standard Base Cost ($)"
                required
                type="number"
                step="0.00001"
                placeholder="0.00"
                classNameField="md:col-span-1"
              />
              <FieldLabel>Price Matrix Lines Mapping</FieldLabel>
              {priceFields.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-muted/5 text-muted-foreground text-center">
                  <DollarSign className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-medium">No prices registered yet</p>
                  <p className="text-[11px] opacity-75 mt-0.5">Click &quot;Append Price Tier&quot; to add your first price.</p>
                </div>
              ) : (
                priceFields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2  items-start border p-2.5 rounded-xl bg-background shadow-2xs">
                    
                    {/* Target Scheme Dropdown Selection */}
                    <Controller
                      control={control}
                      name={`prices.${idx}.pricingSchemeId`} 
                      render={({ field, fieldState }) => (
                        <Field className="sm:col-span-4">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pricing Scheme" />
                            </SelectTrigger>
                            <SelectContent>
                              {pricingSchemes.length > 0 ? (
                                pricingSchemes.map((cat) => (
                                  <SelectItem key={cat.inflowId} value={cat.inflowId}>{cat.name}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="0" disabled>No pricing scheme available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                        </Field>
                      )}
                    />

                    {/* Price Type Assignment Selection */}
                    <Controller
                      control={control}
                      name={`prices.${idx}.priceType`} 
                      render={({ field, fieldState }) => (
                        <Field className={ priceFields.length > 1 ? "sm:col-span-3" : "sm:col-span-4"} >
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger 
                              aria-invalid={fieldState.invalid}
                              className="w-full"
                            >
                              <SelectValue placeholder="Price Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FixedPrice">Fixed Price</SelectItem>
                              <SelectItem value="FixedMarkup">Fixed Markup</SelectItem>
                            </SelectContent>
                          </Select>
                          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                        </Field>
                      )}
                    />

                    <Controller 
                      control={control} 
                      name={`prices.${idx}.unitPrice`} 
                      render={({ field, fieldState }) => (
                        <Field className="sm:col-span-2">
                          <Input
                            // Extract value and onChange to control them explicitly
                            value={field.value}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? "" : Number(val));
                            }}
                            id={`form-prices.${idx}.unitPrice`}
                            type="number" 
                            step="0.00001" 
                            placeholder="Price ($)"
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError className="text-xs" errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller 
                      control={control} 
                      name={`prices.${idx}.fixedMarkup`} 
                      render={({ field, fieldState }) => (
                        <Field className="sm:col-span-2">
                          <Input
                            // Extract value and onChange to control them explicitly
                            value={field.value}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? "" : Number(val));
                            }}
                            id={`form-prices.${idx}.fixedMarkup`}
                            type="number" 
                            step="0.00001" 
                            placeholder="Markup ($)"
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError className="text-xs" errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    {/* Action Delete Trigger Button */}
                    { priceFields.length > 1 && (
                      <div className="sm:col-span-1 flex justify-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removePrice(idx)} 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-30 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  appendPrice({ pricingSchemeId: pricingSchemes[0]?.inflowId || "", priceType: "FixedPrice", unitPrice: 0, fixedMarkup: 0 })
                }} 
                disabled={priceFields.length >= pricingSchemes.length}
                className="h-8 text-xs gap-1.5 shadow-xs w-full" 
              >
              <Plus className="w-3.5 h-3.5" /> Append Price Tier
            </Button>

          </div>

          {/* Barcode Identifiers */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="space-y-0.5 flex items-center justify-between  border-b pb-2">
              <FieldLegend className="flex items-center gap-2 text-sm font-semibold">
                <Barcode className="w-4 h-4 text-primary" /> 
                Global Trade Barcode Identifiers Mapping
              </FieldLegend>
              <Button type="button" variant="outline" size="sm" disabled={barcodeFields.length >= 10} onClick={() => appendBarcode({ barcode: "" })} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Append Barcode</Button>
            </div>
            
            {/* CUSTOM ERROR ALERT FOR Barcode ARRAY */}
            {errors.barcodes?.message && !Array.isArray(errors.barcodes) && imageFields.length === 0 && (
              <DynamicAlert title="Missing Information" description={errors.barcodes.message} variant="destructive" />
            )}
            
            {/* barcode Items */}
            { barcodeFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-muted/5 text-muted-foreground text-center">
                <Barcode className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">No barcodes registered yet</p>
                <p className="text-[11px] opacity-75 mt-0.5">Click &quot;Append Barcode&quot; to add your first identifier mapping.</p>
              </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {barcodeFields.map((field, index) => (
                  <Controller
                    key={field.id}
                    name={`barcodes.${index}.barcode`}
                    control={form.control}
                    render={({ field: controllerField, fieldState }) => (
                      <Field
                        orientation="horizontal"
                        data-invalid={fieldState.invalid}
                      >
                        <FieldContent className="space-y-1">
                          <InputGroup>
                            <InputGroupInput
                              {...controllerField}
                              id={`form-barcode-${index}`}
                              aria-invalid={fieldState.invalid}
                              placeholder="GTIN-13, EAN, or UPC value string"
                              className="h-7 text-xs"
                            />
                            {barcodeFields.length > 1 && (
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => removeBarcode(index)}
                                  aria-label={`Remove barcode ${index + 1}`}
                                >
                                  <XIcon />
                                </InputGroupButton>
                              </InputGroupAddon>
                            )}
                          </InputGroup>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} className="text-[12px] px-1" />
                          )}
                        </FieldContent>
                      </Field>
                    )}
                  />
                ))}
              </div>
            )}

          </div>
          
          {/* Images Section */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs ">
            <div className="space-y-0.5 border-b pb-2">
              <FieldLegend className="flex items-center gap-2 text-sm font-semibold">
                <ImageIcon className="w-4 h-4 text-primary" /> 
                Media Asset Resource Link Registries
              </FieldLegend>
              <p className="text-xs text-muted-foreground">
                Register and configure responsive CDN image URLs for this product.
              </p>
            </div>

            {/* CUSTOM ERROR ALERT FOR Image ARRAY */}
            {errors.images?.message && !Array.isArray(errors.images) && imageFields.length === 0 && (
              <DynamicAlert title="Missing Information" description={errors.images.message} variant="destructive" />
            )}
            
            {/* Image Items */}
            <div className="space-y-3">
              {imageFields.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-muted/5 text-muted-foreground text-center">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-medium">No images registered yet</p>
                  <p className="text-[11px] opacity-75 mt-0.5">Click &quot;Bind Image URL&quot; to add your first asset link.</p>
                </div>
              ) : (
                imageFields.map((field, index) => {
                  const hasError = !!errors.images?.[index]?.originalUrl;
                  const currentUrl = watchedImages[index]?.originalUrl;
                  const isValidUrl = currentUrl && /^https?:\/\/.+/i.test(currentUrl);

                  return (
                    <div 
                      key={field.id} 
                      className={cn(
                        "flex flex-col gap-2 bg-card p-3 border rounded-xl shadow-xs transition-colors",
                        hasError ? "border-destructive/40 bg-destructive/5" : "hover:border-accent-foreground/10"
                      )}
                    >
                      {/* Primary Link Row with Preview */}
                      <div className="flex items-center gap-3">
                        {/* Interactive Thumbnail Preview */}
                        <div className="w-12 h-12 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          { isValidUrl ? (
                            <Image 
                              src={currentUrl} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback if URL is structurally valid but doesn't resolve to an image
                                (e.target as HTMLImageElement).src = "";
                                (e.target as HTMLImageElement).classList.add("hidden");
                              }}
                              height={500}
                              width={500}
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                          )}
                        </div>

                        {/* Main CDN Link Input */}
                        <div className="flex-1 space-y-1">
                          <Controller
                            name={`images.${index}.originalUrl`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldContent className="relative">
                                  <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                                  <Input
                                    {...field}
                                    id={`form-images.${index}.originalUrl`}
                                    aria-invalid={fieldState.invalid}
                                    placeholder="https://cdn.yourstore.com/images/product-main.jpg"
                                    className="pl-9 h-9 text-xs" 
                                  />
                                </FieldContent>
                              </Field>
                            )}
                          />
                        </div>

                        {/* Row Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Advanced Dimensions Toggle */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-muted"
                            onClick={() => toggleExpand(index)}
                            title="Configure responsive sizes"
                          >
                            {expandedIndex === index ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>

                          {/* Remove button */}
                          { imageFields.length > 1 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeImage(index)} 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Error Message */}
                      {hasError && (
                        <span className="text-[11px] font-medium text-destructive px-1.5 flex items-center gap-1">
                          ⚠️ {errors.images?.[index]?.originalUrl?.message}
                        </span>
                      )}

                      {/* Advanced Responsive Sizes Panel (Expanded state) */}
                      {expandedIndex === index && (
                        <div className="mt-2 pt-3 border-t border-dashed grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          
                          <Controller
                            name={`images.${index}.thumbUrl`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid} className="space-y-1">
                                <FieldContent className="relative">
                                  <Input
                                    value={field.value ?? ""} // ✅ Safely fall back to "" if value is null
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      field.onChange(val === "" ? null : val); // ✅ Sets null in state if empty, instead of breaking types
                                    }}
                                    id={`form-images.${index}.thumbUrl`}
                                    aria-invalid={fieldState.invalid}
                                    placeholder="Thumb URL"
                                    className="h-7 text-xs bg-background" 
                                  />
                                </FieldContent>
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-[11px] font-medium px-1.5 flex items-center gap-1" />}
                              </Field>
                            )}
                          />

                          <Controller
                            name={`images.${index}.smallUrl`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid} className="space-y-1">
                                <FieldContent className="relative">
                                  <Input
                                    value={field.value ?? ""} // ✅ Safely fall back to "" if value is null
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      field.onChange(val === "" ? null : val); // ✅ Sets null in state if empty
                                    }}
                                    id={`form-images.${index}.smallUrl`}
                                    aria-invalid={fieldState.invalid}
                                    placeholder="Small URL"
                                    className="h-7 text-xs bg-background" 
                                  />
                                </FieldContent>
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-[11px] font-medium px-1.5 flex items-center gap-1" />}
                              </Field>
                            )}
                          />

                          <Controller
                            name={`images.${index}.mediumUrl`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid} className="space-y-1">
                                <FieldContent className="relative">
                                  <Input
                                    value={field.value ?? ""} // ✅ Safely fall back to "" if value is null
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      field.onChange(val === "" ? null : val); // ✅ Sets null in state if empty
                                    }}
                                    id={`form-images.${index}.mediumUrl`}
                                    aria-invalid={fieldState.invalid}
                                    placeholder="Medium URL"
                                    className="h-7 text-xs bg-background" 
                                  />
                                </FieldContent>
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-[11px] font-medium px-1.5 flex items-center gap-1" />}
                              </Field>
                            )}
                          />

                          <Controller
                            name={`images.${index}.largeUrl`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid} className="space-y-1">
                                <FieldContent className="relative">
                                  <Input
                                    value={field.value ?? ""} // ✅ Safely fall back to "" if value is null
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      field.onChange(val === "" ? null : val); // ✅ Sets null in state if empty
                                    }}
                                    id={`form-images.${index}.largeUrl`}
                                    aria-invalid={fieldState.invalid}
                                    placeholder="Large URL"
                                    className="h-7 text-xs bg-background" 
                                  />
                                </FieldContent>
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-[11px] font-medium px-1.5 flex items-center gap-1" />}
                              </Field>
                            )}
                          />
                          
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  appendImage({ 
                    originalUrl: "",
                    thumbUrl: "",
                    smallUrl: "",
                    mediumUrl: "",
                    largeUrl: "",
                  });
                  // Auto-expand the newly created item
                  setExpandedIndex(imageFields.length);
                }} 
                disabled={imageFields.length >= 5}
                className="h-8 text-xs gap-1.5 shadow-xs w-full" 
              >
                <Plus className="w-3.5 h-3.5" /> Bind Image URL
              </Button>
          </div>

          {/* Custom Fields */}
          <Card className="shadow-xs">
             <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-primary" />
                  Custom Fields
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Configure additional fields to capture information specific to your business.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Custom Fields 1 through 5 */}
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <FormInput
                      key={`custom${num}`}
                      name={`customFields.custom${num}`}
                      control={control}
                      label={`Custom ${num}`}
                      placeholder={`Enter custom ${num} value`}
                      classNameLabel="text-muted-foreground font-semibold text-xs"
                    />
                  ))}
                </div>

                {/* Column 2: Custom Fields 6 through 10 */}
                <div className="space-y-2">
                  {[6, 7, 8, 9, 10].map((num) => (
                    <FormInput
                      key={`custom${num}`}
                      name={`customFields.custom${num}`}
                      control={control}
                      label={`Custom ${num}`}
                      placeholder={`Enter custom ${num} value`}
                      classNameLabel="text-muted-foreground font-semibold text-xs"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>


        </div>
      </div>

      {/* Form Action Controls Bar */}
      <div className="flex items-center justify-between gap-4 border-t pt-5 mt-6">
        <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5 text-xs px-5">
          {isSubmitting ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Data...</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> {isEditMode ? "Commit Modifications" : "Save Product"}</>
          )}
        </Button>
      </div>
    </form>
  );
}


 {/* <FormSelect
                  name="variantSignature"
                  control={control}
                  label="Target Matrix Attribute Configuration Slot"
                  placeholder="-- Select Variant Slot --"
                  options={productGroups.map((item) => ({
                    id: item.inflowId,
                    name: item.name,
                  }))}
                  emptyMessage="No attribute slot available"
                  classNameLabel="text-muted-foreground font-semibold"
                />
                <Controller
                  control={control}
                  name="variantSignature"
                  render={({ field, fieldState }) => (
                    <Field className="col-span-1">
                      <FieldLabel >Target Matrix Attribute Configuration Slot</FieldLabel>
                      <Select onValueChange={field.onChange} >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Variant Slot" />
                        </SelectTrigger>
                        <SelectContent>
                          { productGroups.length === 0 ? (
                            <SelectItem value="">No attribute slot available</SelectItem>
                          ) : (
                            computedVariantSlotsFromOptions.map((v) => {
                              const isOccupiedByOther = v.productId && v.productId !== form.getValues("inflowId");
                              return (
                                <SelectItem 
                                  key={v.signature} 
                                  value={v.signature}
                                  disabled={!!isOccupiedByOther} // Locks out slots belonging to alternate products
                                >
                                  {getVariantLabel(v)}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <FieldError className="text-xs">{fieldState.error.message}</FieldError>}
                    </Field>
                  )}
                /> */}
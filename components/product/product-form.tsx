"use client";

import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, ProductInput } from "@/schemas/product.schema";
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
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { generateSku2Variant2 } from "@/helpers/genSKU";
import { useEffect, useMemo } from "react";
import { BrandSelect } from "../shared/brand-select";
import { CategorySelect } from "../shared/category-select";

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
  uoms: UomLookupReference[]; // 🟢 Added global metrics dependency array
  groups: ProductGroupLookupDetail[];
  pricingSchemes: {
    inflowId: string;
    name: string;
  }[]
  initialData?: any | null;
}

export function ProductForm({  brands, uoms, groups: productGroups, pricingSchemes = [], initialData }: ProductFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  // Pre-calculate baseline pricing matrices mapped over existing master templates
  const initialPrices = pricingSchemes.map((scheme) => {
    const existingPrice = initialData?.prices?.find((p: any) => p.pricingSchemeId === scheme.inflowId);
    return {
      inflowId: existingPrice?.inflowId || undefined,
      pricingSchemeId: scheme.inflowId,
      priceType: existingPrice?.priceType || "Normal",
      unitPrice: existingPrice?.unitPrice ? Number(existingPrice.unitPrice) : 0,
      fixedMarkup: existingPrice?.fixedMarkup ? Number(existingPrice.fixedMarkup) : 0,
    };
  });

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      inflowId: initialData?.inflowId,
      productGroupId: (initialData as any)?.variant?.productGroupId || "",
      variantSignature: (initialData as any)?.variant?.signature || "",
      sku: initialData?.sku || "",
      name: initialData?.name || "",
      description: initialData?.description || "",
      itemType: initialData?.itemType || "Stock",
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

      // Seed extended valuation allocations
      initialCost: initialData?.cost?.cost ? Number(initialData.cost.cost) : 0,
      prices: initialData?.prices?.map((p: any) => ({
        id: p.id,
        inflowId: p.inflowId,
        pricingSchemeId: p.pricingSchemeId,
        priceType: p.priceType || "Normal",
        unitPrice: p.unitPrice ? Number(p.unitPrice) : 0,
        fixedMarkup: p.fixedMarkup ? Number(p.fixedMarkup) : 0,
      })) || [
        // Fallback initial clean block if registering a brand new product
        { pricingSchemeId: pricingSchemes[0]?.inflowId || "", priceType: "Normal", unitPrice: 0, fixedMarkup: 0 }
      ],

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
      images: initialData?.images?.map((img: any) => ({ id: img.id, originalUrl: img.originalUrl })) || [],
    },
  });

  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = form;
  const { fields: priceFields, append: appendPrice, remove: removePrice } = useFieldArray({
    control,
    name: "prices"
  });
  // Watch the matrix relationship variables
  const watchedGroupId = useWatch({ control, name: "productGroupId" });
  const watchedVariantSignature = useWatch({ control, name: "variantSignature" });

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

  // const computedVariantSlotsFromOptions = useMemo(() => {
  //   if (!selectedGroupDetails || !selectedGroupDetails.options || selectedGroupDetails.options.length === 0) {
  //     return [];
  //   }

  //   // 1. Extract option structural array trees with the global attribute value ID included
  //   const arraysToCombine = selectedGroupDetails.options.map(opt => 
  //     opt.values.map(val => ({
  //       optionId: opt.inflowId,
  //       optionValueId: val.inflowId,
  //       // 🎯 CRUCIAL FIX: Bring down the core attribute ID that matches your backend fingerprintId
  //       attributeValueId: val.attributeValue?.id || "", 
  //       value: val.attributeValue?.value || ""
  //     }))
  //   );

  //   // Classic Cartesian Product calculation function
  //   const getCartesian = (arrays: any[][]): any[][] => {
  //     return arrays.reduce((acc, curr) => acc.flatMap(d => curr.map(e => [...d, e])), [[]]);
  //   };

  //   const intersections = getCartesian(arraysToCombine);

  //   return intersections.map((combination: any[]) => {
  //     // 🎯 CRUCIAL FIX: Build signature matching the backend sorted attributeValue.id architecture
  //     const signature = combination.map(c => c.attributeValueId).sort().join("-");
  //     const labelString = combination.map(c => c.value).join(" / ");

  //     // Now this exact lookup will find your DB variant records seamlessly!
  //     const matchedDbVariant = selectedGroupDetails.variants?.find(v => v.signature === signature);

  //     return {
  //       signature,
  //       labelString,
  //       productId: matchedDbVariant?.productId || null,
  //       product: matchedDbVariant?.product || null,
  //       selections: combination.map(c => ({
  //         optionId: c.optionId,
  //         optionValueId: c.optionValueId,
  //         optionValue: { attributeValue: { value: c.value } }
  //       }))
  //     };
  //   });
  // }, [selectedGroupDetails]);

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

  const barcodeArray = useFieldArray({ control, name: "barcodes" });
  const imageArray = useFieldArray({ control, name: "images" });

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

  const onSubmit = async (values: ProductInput) => {

    console.log("Submitting values:", values);
    
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
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6">
      
      <FieldGroup className="gap-6">

        {/* Core Properties Row */}
        <FieldSet className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FieldLegend className="col-span-1 md:col-span-3 flex items-center gap-2 border-b pb-2">
            <Package className="w-4 h-4 text-primary" /> Master SKU Core Identification
          </FieldLegend>

          <Field className="md:col-span-2">
            <FieldLabel>Product Master Display Title *</FieldLabel>
            <Input placeholder="e.g. Premium Ergonomic Office Chair" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message as string}</span>}
          </Field>

          <Field className="col-span-1">
            <FieldLabel>SKU / Custom Identity *</FieldLabel>
            <Input placeholder="PROD-CHAIR-001" disabled={isEditMode} {...register("sku")} />
            {errors.sku && <span className="text-xs text-destructive">{errors.sku.message as string}</span>}
          </Field>

          <FieldSet className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 md:col-span-3">
            <FieldLegend className="col-span-1 md:col-span-2 flex items-center gap-2 border-b pb-2">
              Matrix Relationship Binding
            </FieldLegend>

            {/* 1. Select the Product Group cluster */}
            <Field>
              <FieldLabel>Product Group Cluster</FieldLabel>
              <select 
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3"
                {...register("productGroupId")}
                onChange={(e) => {
                  register("productGroupId").onChange(e);
                  setValue("variantSignature", ""); 
                }}
              >
                <option value="">-- No Group (Standalone Product) --</option>
                {productGroups?.map((group) => (
                  <option key={group.inflowId} value={group.inflowId}>{group.name}</option>
                ))}
              </select>
            </Field>

            {/* 2. Select the specific Variant Intersection slot */}
            {selectedGroupDetails && (
              <Field>
                <FieldLabel>Target Matrix Attribute Configuration Slot</FieldLabel>
                <select 
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 animate-in fade-in duration-200 focus:ring-1 focus:ring-primary"
                  {...register("variantSignature")}
                >
                  <option value="">-- Assign to New Custom Variant Slot --</option>
                  {computedVariantSlotsFromOptions.map((v) => {
                    // A slot is marked as occupied if a productId exists, unless matched to our active entity frame
                    const isOccupiedByOther = v.productId && v.productId !== form.getValues("inflowId");

                    return (
                      <option 
                        key={v.signature} 
                        value={v.signature}
                        disabled={!!isOccupiedByOther} // Locks out slots belonging to alternate products
                      >
                        {getVariantLabel(v)}
                      </option>
                    );
                  })}
                </select>
                {errors.variantSignature && (
                  <span className="text-xs text-destructive">{errors.variantSignature.message as string}</span>
                )}
              </Field>
            )}
          </FieldSet>

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

          <Field className="md:col-span-1">
            <FieldLabel>Manufacturer / Brand Assignment</FieldLabel>
            <Controller
              name="brandId"
              control={control}
              render={({ field }) => <BrandSelect value={field.value ?? undefined} onChange={field.onChange} />}
            />
          </Field>

          <Field className="md:col-span-1">
            <FieldLabel>Master Catalog Department Category</FieldLabel>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => <CategorySelect value={field.value ?? undefined} onChange={field.onChange} />}
            />
          </Field>

          {/* 🟢 MODIFIED: Base System UOM is now a clean drop-down selection list */}
          <Field className="col-span-1">
            <FieldLabel>Base System UOM *</FieldLabel>
            <select 
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 shadow-2xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              {...register("standardUomName")}
            >
              <option value="">-- Choose Base Unit --</option>
              {uoms.map((u) => (
                <option key={u.id} value={u.code}>{u.name} ({u.code})</option>
              ))}
            </select>
            {errors.standardUomName && <span className="text-xs text-destructive">{errors.standardUomName.message as string}</span>}
          </Field>

          <Field className="md:col-span-3">
            <FieldLabel>Public Summary Description</FieldLabel>
            <Textarea placeholder="Provide descriptive high-fidelity characteristics detailing materials..." rows={3} {...register("description")} />
          </Field>
        </FieldSet>


        

        {/* Operational Flow Settings */}
        <FieldSet className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-4">
          <FieldLegend className="col-span-1 md:col-span-3 flex items-center gap-2 border-b pb-2">
            <Settings className="w-4 h-4 text-muted-foreground" /> Operational Configurations & Strategy
          </FieldLegend>

          <Field className="col-span-1">
            <FieldLabel>Item Classification Type</FieldLabel>
            <select className="w-full text-xs h-9 rounded-md border border-input bg-background px-3" {...register("itemType")}>
              <option value="Stock">Stock Item</option>
              <option value="NonStock">Non-Stock Service</option>
              <option value="Serialized">Unique Serialized Asset</option>
            </select>
          </Field>

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

        {/* Dimensions & Logistics Metrics Section */}
        <FieldSet className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
          <FieldLegend className="col-span-2 md:col-span-4 flex items-center gap-2 border-b pb-2">
            <Scale className="w-4 h-4 text-muted-foreground" /> Dimensional Logistics & Compliance
          </FieldLegend>

          <Field>
            <FieldLabel>Absolute Weight (kg)</FieldLabel>
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
        </FieldSet>

        {/* Operational Multi-tier UOM Calculations */}
        <FieldSet className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
          <FieldLegend className="col-span-1 md:col-span-2 flex items-center gap-2 border-b pb-2">
            <Link2 className="w-4 h-4 text-muted-foreground" /> Operational Multi-tier UOM Calculations
          </FieldLegend>

          {/* Purchasing Mapping Block */}
          <div className="p-4 bg-muted/20 border rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inbound Supply / Purchasing Conversion</h4>
            <Field>
              <FieldLabel>Inbound UOM Unit Tag</FieldLabel>
              {/* 🟢 MODIFIED: Input text field replaced with dynamic UOM Selector */}
              <select 
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 shadow-2xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                {...register("purchasingUom.name")}
              >
                <option value="">-- Select Inbound Unit --</option>
                {uoms.map((u) => (
                  <option key={u.id} value={u.code}>{u.name} ({u.code})</option>
                ))}
              </select>
              {errors.purchasingUom?.name && <span className="text-xs text-destructive">{(errors.purchasingUom as any).name.message}</span>}
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field>
                <FieldLabel>Standard Base Qty</FieldLabel>
                <Input type="number" step="0.0001" {...register("purchasingUom.standardQuantity", { valueAsNumber: true })} />
                {errors.purchasingUom?.standardQuantity && <span className="text-xs text-destructive">{(errors.purchasingUom as any).standardQuantity.message}</span>}
              </Field>
              <Field>
                <FieldLabel>Equal to Pack Volume</FieldLabel>
                <Input type="number" step="0.0001" {...register("purchasingUom.uomQuantity", { valueAsNumber: true })} />
                {errors.purchasingUom?.uomQuantity && <span className="text-xs text-destructive">{(errors.purchasingUom as any).uomQuantity.message}</span>}
              </Field>
            </div>
          </div>

          {/* Sales Conversion Mapping Block */}
          <div className="p-4 bg-muted/20 border rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Outbound / Sales Channels Conversion</h4>
            <Field>
              <FieldLabel>Outbound UOM Unit Tag</FieldLabel>
              {/* 🟢 MODIFIED: Input text field replaced with dynamic UOM Selector */}
              <select 
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 shadow-2xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                {...register("salesUom.name")}
              >
                <option value="">-- Select Outbound Unit --</option>
                {uoms.map((u) => (
                  <option key={u.id} value={u.code}>{u.name} ({u.code})</option>
                ))}
              </select>
              {errors.salesUom?.name && <span className="text-xs text-destructive">{(errors.salesUom as any).name.message}</span>}
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field>
                <FieldLabel>Standard Base Qty</FieldLabel>
                <Input type="number" step="0.0001" {...register("salesUom.standardQuantity", { valueAsNumber: true })} />
                {errors.salesUom?.standardQuantity && <span className="text-xs text-destructive">{(errors.salesUom as any).standardQuantity.message}</span>}
              </Field>
              <Field>
                <FieldLabel>Equal to Pack Volume</FieldLabel>
                <Input type="number" step="0.0001" {...register("salesUom.uomQuantity", { valueAsNumber: true })} />
                {errors.salesUom?.uomQuantity && <span className="text-xs text-destructive">{(errors.salesUom as any).uomQuantity.message}</span>}
              </Field>
            </div>
          </div>
        </FieldSet>

        {/* Traceability Control Flags */}
        <FieldSet className="border-t pt-4">
          <FieldLegend className="flex items-center gap-2 border-b pb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" /> Traceability Control Flags
          </FieldLegend>

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
        </FieldSet>

        {/* Lifespan Variables Block */}
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

        {/* 🏢 Financial Valuations Cost & Multi-Scheme Matrix Controls */}
        {/* 🏢 Dynamic Multi-Tier Pricing Matrix Section */}
        <FieldSet className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <FieldLegend className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Multi-Scheme Pricing Matrix
            </FieldLegend>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => appendPrice({ pricingSchemeId: pricingSchemes[0]?.inflowId || "", priceType: "Normal", unitPrice: 0, fixedMarkup: 0 })} 
              className="h-7 text-xs gap-1"
            >
              <Plus className="w-3 h-3" /> Append Price Tier
            </Button>
          </div>

          {/* Standard Base Cost input row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-xl border">
            <Field className="md:col-span-1">
              <FieldLabel>Standard Base Cost ($) *</FieldLabel>
              <Input 
                type="number" 
                step="0.00001" 
                placeholder="0.00" 
                {...register("initialCost", { valueAsNumber: true })} 
              />
              {errors.initialCost && <span className="text-xs text-destructive">{errors.initialCost.message}</span>}
            </Field>

            {/* Multiple Pricing Rows Box Container */}
            <div className="md:col-span-3 space-y-2">
              <FieldLabel>Price Matrix Lines Mapping</FieldLabel>
              
              {priceFields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center border p-2.5 rounded-xl bg-background shadow-2xs">
                  
                  {/* Target Scheme Dropdown Selection */}
                  <div className="sm:col-span-4">
                    <select
                      className="w-full text-xs h-8 rounded-md border border-input bg-background px-2 py-1 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                      {...register(`prices.${idx}.pricingSchemeId` as const)}
                    >
                      {pricingSchemes.map((scheme) => (
                        <option key={scheme.inflowId} value={scheme.inflowId}>
                          {scheme.name}
                        </option>
                      ))}
                    </select>
                    {errors.prices?.[idx]?.pricingSchemeId && (
                      <span className="text-[10px] text-destructive block mt-0.5">{errors.prices[idx].pricingSchemeId?.message}</span>
                    )}
                  </div>

                  {/* Price Type Assignment Selection */}
                  <div className="sm:col-span-3">
                    <select
                      className="w-full text-xs h-8 rounded-md border border-input bg-background px-2 py-1 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                      {...register(`prices.${idx}.priceType` as const)}
                    >
              <option value="Normal">Normal</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Promo">Promo</option>
            </select>
          </div>

          {/* Value Inputs Group */}
          <div className="sm:col-span-2">
            <Input 
              type="number" 
              step="0.00001" 
              placeholder="Price ($)"
              className="h-8 text-xs text-right"
              {...register(`prices.${idx}.unitPrice` as const, { valueAsNumber: true })} 
            />
            {errors.prices?.[idx]?.unitPrice && (
              <span className="text-[10px] text-destructive block mt-0.5">{errors.prices[idx].unitPrice?.message}</span>
            )}
          </div>

          <div className="sm:col-span-2">
            <Input 
              type="number" 
              step="0.00001" 
              placeholder="Markup ($)"
              className="h-8 text-xs text-right"
              {...register(`prices.${idx}.fixedMarkup` as const, { valueAsNumber: true })} 
            />
          </div>

          {/* Action Delete Trigger Button */}
          <div className="sm:col-span-1 flex justify-center">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              disabled={priceFields.length <= 1}
              onClick={() => removePrice(idx)} 
              className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-30 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          
        </div>
      ))}
    </div>
  </div>
</FieldSet>

        {/* Internal Administration Remarks */}
        <FieldSet className="border-t pt-4">
          <Field>
            <FieldLabel>Internal System Administrative Remarks</FieldLabel>
            <Textarea placeholder="Add internal operational notices..." rows={2} {...register("remarks")} />
          </Field>
        </FieldSet>

        {/* Dynamic 1:Many Barcodes Registry Rows */}
        <FieldSet className="border-t pt-4">
          <div className="flex items-center justify-between border-b pb-2">
            <FieldLegend className="flex items-center gap-2"><Barcode className="w-4 h-4 text-muted-foreground" /> Global Trade Barcode Identifiers Mapping</FieldLegend>
            <Button type="button" variant="outline" size="sm" onClick={() => barcodeArray.append({ barcode: "" })} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Append Barcode</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {barcodeArray.fields.map((field, idx) => (
              <div key={field.id} className="flex flex-col gap-1 border p-2 rounded-xl bg-background shadow-2xs">
                <div className="flex items-center gap-2">
                  <Input placeholder="GTIN-13, EAN, or UPC value string" className="text-xs h-8 flex-1" {...register(`barcodes.${idx}.barcode` as const)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => barcodeArray.remove(idx)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
                {errors.barcodes?.[idx]?.barcode && <span className="text-[10px] text-destructive px-1">{errors.barcodes[idx].barcode?.message}</span>}
              </div>
            ))}
          </div>
        </FieldSet>

        {/* Dynamic CDN Image Url Asset Links Array Mapping Block */}
        <FieldSet className="border-t pt-4">
          <div className="flex items-center justify-between border-b pb-2">
            <FieldLegend className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-muted-foreground" /> Media Asset Resource link Registries</FieldLegend>
            <Button type="button" variant="outline" size="sm" onClick={() => imageArray.append({ originalUrl: "" })} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Bind Image URL</Button>
          </div>
          <div className="space-y-2 mt-3">
            {imageArray.fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-1 bg-muted/10 p-2 border rounded-xl">
                <div className="flex items-center gap-3">
                  <Input placeholder="https://cdn.yourstore.com/..." className="text-xs h-8 flex-1 bg-background" {...register(`images.${index}.originalUrl` as const)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => imageArray.remove(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
                {errors.images?.[index]?.originalUrl && <span className="text-[10px] text-destructive px-1">{errors.images[index].originalUrl?.message}</span>}
              </div>
            ))}
          </div>
        </FieldSet>

        {/* Global Action Bottom Controls Row */}
        <div className="flex items-center justify-between gap-4 border-t pt-5">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1.5"><ArrowLeft className="w-4 h-4" /> Cancel</Button>
          <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[150px]">
            {isSubmitting ? "Writing Product Matrix..." : isEditMode ? "Update Product Record" : "Register Catalog SKU"}
          </Button>
        </div>

      </FieldGroup>
    </form>
  );
}
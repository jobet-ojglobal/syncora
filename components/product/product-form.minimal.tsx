// components/ProductForm.tsx
"use client";

import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, ProductInput } from "@/schemas/product.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, ArrowLeft, Package, Barcode, Scale, Calendar, Image as ImageIcon, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { generateSku2Variant2 } from "@/helpers/genSKU";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo } from "react";
import { CategorySelect } from "../shared/category-select";

interface BrandLookupOption {
  id: string;
  name: string;
}

interface CategoryOption {
  inflowId: string;
  name: string;
}

interface ProductFormProps {
  categories: CategoryOption[];
  brands: BrandLookupOption[];
  initialData?: any | null;
}

export function ProductForm({ categories, brands, initialData }: ProductFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      inflowId: initialData?.inflowId,
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
      originCountry: initialData?.originCountry || "",
      hsTariffNumber: initialData?.hsTariffNumber || "",
      remarks: initialData?.remarks || "",
      standardUomName: initialData?.standardUomName || "PCS",
      purchasingUom: {
        name: initialData?.purchasingUom?.name || "Box",
        standardQuantity: initialData?.purchasingUom?.standardQuantity ? Number(initialData.purchasingUom.standardQuantity) : 1,
        uomQuantity: initialData?.purchasingUom?.uomQuantity ? Number(initialData.purchasingUom.uomQuantity) : 1,
      },
      salesUom: {
        name: initialData?.salesUom?.name || "Each",
        standardQuantity: initialData?.salesUom?.standardQuantity ? Number(initialData.salesUom.standardQuantity) : 1,
        uomQuantity: initialData?.salesUom?.uomQuantity ? Number(initialData.salesUom.uomQuantity) : 1,
      },
      barcodes: initialData?.barcodes?.map((b: any) => ({ id: b.id, barcode: b.barcode })) || [],
      images: initialData?.images?.map((img: any) => ({ id: img.id, originalUrl: img.originalUrl })) || [],
    },
  });

  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = form;

  // Barcode and Image Row Field Arrays
  const barcodeArray = useFieldArray({ control, name: "barcodes" });
  const imageArray = useFieldArray({ control, name: "images" });

  const watchedName = useWatch({
    control,
    name: "name",
  });

  const watchedBrandId = useWatch({
    control,
    name: "brandId",
  });

  

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map(b => [b.id, b.name])),
    [brands]
  );

  useEffect(() => {
    if (isEditMode || !watchedBrandId) return;

    const brandName = brandMap[watchedBrandId];

    if (!brandName || !watchedName) return;

    const sku = generateSku2Variant2(
      brandName,
      watchedName,
      []
    );

    setValue("sku", sku);
  }, [watchedName, watchedBrandId, brandMap, isEditMode, setValue]);

  const generateSkuSlugFromName = () => {
    if (!watchedName || !watchedBrandId) return;

    const brandName = brandMap[watchedBrandId] || "";

    const sku = generateSku2Variant2(
      brandName,
      watchedName,
      []
    );

    setValue("sku", sku, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async (values: ProductInput) => {
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
            <div className="flex gap-2">
              <Input placeholder="e.g. Premium Ergonomic Office Chair" {...register("name")} />
            </div>
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </Field>
          

          <Field>
            <FieldLabel>SKU / Custom Identity *</FieldLabel>
            <div className="flex gap-2">
              <Input placeholder="PROD-CHAIR-001" disabled={isEditMode} {...register("sku")} />
              {/* {!isEditMode && <Button type="button" variant="outline" size="sm" onClick={generateSkuSlugFromName} className="text-xs h-9 shrink-0">SKU</Button>} */}
            </div>
            {errors.sku && <span className="text-xs text-destructive">{errors.sku.message}</span>}
          </Field>
          

          <Field className="md:col-span-1">
            <FieldLabel>Master Catalog Department Category</FieldLabel>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => <CategorySelect value={field.value ?? undefined} onChange={field.onChange} />}
            />
          </Field>

          <Field>
            <FieldLabel>Manufacturer / Brand Assignment</FieldLabel>
            <select className="w-full text-xs h-9 rounded-md border border-input bg-background px-3" {...register("brandId")}>
              <option value="">-- Unassigned (White-label) --</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>

          <Field className="md:col-span-3">
            <FieldLabel>Public Summary Description</FieldLabel>
            <Textarea placeholder="Provide descriptive high-fidelity characteristics detailing materials, finishes, and specs..." rows={3} {...register("description")} />
          </Field>
        </FieldSet>

        {/* 📐 Dimensions & Logistics Metrics Section */}
        <FieldSet className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
          <FieldLegend className="col-span-2 md:col-span-4 flex items-center gap-2 border-b pb-2">
            <Scale className="w-4 h-4 text-muted-foreground" /> Dimensional Logistics & Compliance
          </FieldLegend>

          <Field>
            <FieldLabel>Absolute Weight (kg)</FieldLabel>
            <Input type="number" step="0.0001" placeholder="0.0000" {...register("weight")} />
          </Field>
          <Field>
            <FieldLabel>Width (cm)</FieldLabel>
            <Input type="number" step="0.0001" placeholder="0.0" {...register("width")} />
          </Field>
          <Field>
            <FieldLabel>Height (cm)</FieldLabel>
            <Input type="number" step="0.0001" placeholder="0.0" {...register("height")} />
          </Field>
          <Field>
            <FieldLabel>Length (cm)</FieldLabel>
            <Input type="number" step="0.0001" placeholder="0.0" {...register("length")} />
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

        {/* 🔄 Advanced UOM Conversion Rules Configurations */}
        <FieldSet className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
          <FieldLegend className="col-span-1 md:col-span-2 flex items-center gap-2 border-b pb-2">
            <Link2 className="w-4 h-4 text-muted-foreground" /> Operational Multi-tier UOM Calculations
          </FieldLegend>

          {/* Purchasing Mapping Block */}
          <div className="p-4 bg-muted/20 border rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inbound Supply / Purchasing Conversion</h4>
            <Field>
              <FieldLabel>Inbound UOM Unit Tag</FieldLabel>
              <Input placeholder="e.g. Box, Case, Pallet" {...register("purchasingUom.name")} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field>
                <FieldLabel>Standard Base Units Quantity</FieldLabel>
                <Input type="number" step="0.0001" {...register("purchasingUom.standardQuantity")} />
              </Field>
              <Field>
                <FieldLabel>Equal to Pack Volume</FieldLabel>
                <Input type="number" step="0.0001" {...register("purchasingUom.uomQuantity")} />
              </Field>
            </div>
          </div>

          {/* Sales Conversion Mapping Block */}
          <div className="p-4 bg-muted/20 border rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Outbound / Sales Channels Conversion</h4>
            <Field>
              <FieldLabel>Outbound UOM Unit Tag</FieldLabel>
              <Input placeholder="e.g. Pack, Each, Blister" {...register("salesUom.name")} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field>
                <FieldLabel>Standard Base Units Quantity</FieldLabel>
                <Input type="number" step="0.0001" {...register("salesUom.standardQuantity")} />
              </Field>
              <Field>
                <FieldLabel>Equal to Pack Volume</FieldLabel>
                <Input type="number" step="0.0001" {...register("salesUom.uomQuantity")} />
              </Field>
            </div>
          </div>
        </FieldSet>

        {/* 🧬 Batches, Traceability, and Expiry Tracking Rules Grid */}
        <FieldSet className="border-t pt-4">
          <FieldLegend className="flex items-center gap-2 border-b pb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" /> Traceability Control Flags
          </FieldLegend>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="flex items-center justify-between border p-3 rounded-xl bg-muted/10">
              <div><FieldLabel className="mb-0 text-xs font-semibold">Lot Tracking</FieldLabel></div>
              <Controller control={control} name="trackLots" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
            </div>
            <div className="flex items-center justify-between border p-3 rounded-xl bg-muted/10">
              <div><FieldLabel className="mb-0 text-xs font-semibold">Serial Tracking</FieldLabel></div>
              <Controller control={control} name="trackSerials" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
            </div>
            <div className="flex items-center justify-between border p-3 rounded-xl bg-muted/10">
              <div><FieldLabel className="mb-0 text-xs font-semibold">Expiry Tracking</FieldLabel></div>
              <Controller control={control} name="trackExpiry" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
            </div>
          </div>
        </FieldSet>

        {/* 🏷️ Dynamic 1:Many Barcodes Registry Rows */}
        <FieldSet className="border-t pt-4">
          <div className="flex items-center justify-between border-b pb-2">
            <FieldLegend className="flex items-center gap-2"><Barcode className="w-4 h-4 text-muted-foreground" /> Global Trade Barcode Identifiers Mapping</FieldLegend>
            <Button type="button" variant="outline" size="sm" onClick={() => barcodeArray.append({ barcode: "" })} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Append Barcode</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {barcodeArray.fields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2 border p-2 rounded-xl bg-background shadow-2xs">
                <Input placeholder="GTIN-13, EAN, or UPC value string" className="text-xs h-8 flex-1" {...register(`barcodes.${idx}.barcode` as const)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => barcodeArray.remove(idx)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        </FieldSet>

        {/* 🖼️ Dynamic CDN Image Url Asset Links Array Mapping Block */}
        <FieldSet className="border-t pt-4">
          <div className="flex items-center justify-between border-b pb-2">
            <FieldLegend className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-muted-foreground" /> Media Asset Resource link Registries</FieldLegend>
            <Button type="button" variant="outline" size="sm" onClick={() => imageArray.append({ originalUrl: "" })} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Bind Image URL</Button>
          </div>
          <div className="space-y-2 mt-3">
            {imageArray.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-3 bg-muted/10 p-2 border rounded-xl">
                <Input placeholder="https://cdn.yourstore.com/assets/products/...jpg" className="text-xs h-8 flex-1 bg-background" {...register(`images.${index}.originalUrl` as const)} />
                {errors.images?.[index]?.originalUrl && <span className="text-[10px] text-destructive">{errors.images[index].originalUrl?.message}</span>}
                <Button type="button" variant="ghost" size="icon" onClick={() => imageArray.remove(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
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
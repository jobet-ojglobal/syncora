"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductSchema, CreateProductInput } from "@/schemas/product.schema";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";

export function ProductForm() {
  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      brandId: "",
      weight: undefined,
      width: undefined,
      height: undefined,
      length: undefined,
      isActive: true,
      trackExpiry: false,
      trackLots: false,
      trackSerials: false,
      productGroupId: "", 
      defaultPrice: 0,
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = form;
  const onSubmit = async (values: CreateProductInput) => {
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to compile product catalog entity");
      reset();
    } catch (error) {
      console.error("Submission error:", error);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-card rounded-xl border shadow-sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          
          {/* Section 1: Core Definitions */}
          <FieldSet>
            <FieldLegend>Core Specifications</FieldLegend>
            <FieldDescription>Identity attributes detailing base information listings.</FieldDescription>
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="p-name">Product Name *</FieldLabel>
                  <Input id="p-name" placeholder="Premium Leather Boots" {...register("name")} />
                  {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="p-sku">SKU Code *</FieldLabel>
                  <Input id="p-sku" placeholder="FTWR-LTHR-01" {...register("sku")} />
                  {errors.sku && <span className="text-xs text-destructive">{errors.sku.message}</span>}
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="p-desc">Catalog Description</FieldLabel>
                <Textarea id="p-desc" placeholder="Provide depth detailing product engineering..." className="resize-none" {...register("description")} />
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator />

          {/* Section 2: Architectural Grouping Relations */}
          <FieldSet>
            <FieldLegend>Architecture & Pricing</FieldLegend>
            <FieldDescription>Map this individual stock unit into your relational store groups.</FieldDescription>
            <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="p-group">Parent Product Group ID *</FieldLabel>
                <Input id="p-group" placeholder="Group inflowProdGroupId" {...register("productGroupId")} />
                {errors.productGroupId && <span className="text-xs text-destructive">{errors.productGroupId.message}</span>}
              </Field>
              <Field>
                <FieldLabel htmlFor="p-price">Default Variant Price ($) *</FieldLabel>
                <Input id="p-price" type="number" step="0.01" {...register("defaultPrice")} />
                {errors.defaultPrice && <span className="text-xs text-destructive">{errors.defaultPrice.message}</span>}
              </Field>
              <Field>
                <FieldLabel htmlFor="p-brand">Brand ID Reference</FieldLabel>
                <Input id="p-brand" placeholder="Optional Brand structural ID" {...register("brandId")} />
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator />

          {/* Section 3: Physical Parameters */}
          <FieldSet>
            <FieldLegend>Logistics & Dimensions</FieldLegend>
            <FieldGroup className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field><FieldLabel htmlFor="p-w">Weight (kg)</FieldLabel><Input id="p-w" type="number" step="0.001" {...register("weight")} /></Field>
              <Field><FieldLabel htmlFor="p-wd">Width (cm)</FieldLabel><Input id="p-wd" type="number" step="0.01" {...register("width")} /></Field>
              <Field><FieldLabel htmlFor="p-h">Height (cm)</FieldLabel><Input id="p-h" type="number" step="0.01" {...register("height")} /></Field>
              <Field><FieldLabel htmlFor="p-l">Length (cm)</FieldLabel><Input id="p-l" type="number" step="0.01" {...register("length")} /></Field>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator />

          {/* Section 4: Inventory Control Toggles */}
          <FieldSet>
            <FieldLegend>Inventory & Compliance Flags</FieldLegend>
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field orientation="horizontal" className="items-center gap-3">
                <Controller control={control} name="isActive" render={({ field }) => (
                  <Checkbox id="p-active" checked={field.value} onCheckedChange={field.onChange} />
                )} />
                <FieldLabel htmlFor="p-active" className="cursor-pointer">Active in Storefront</FieldLabel>
              </Field>

              <Field orientation="horizontal" className="items-center gap-3">
                <Controller control={control} name="trackExpiry" render={({ field }) => (
                  <Checkbox id="p-exp" checked={field.value} onCheckedChange={field.onChange} />
                )} />
                <FieldLabel htmlFor="p-exp" className="cursor-pointer">Track Expirations</FieldLabel>
              </Field>

              <Field orientation="horizontal" className="items-center gap-3">
                <Controller control={control} name="trackLots" render={({ field }) => (
                  <Checkbox id="p-lots" checked={field.value} onCheckedChange={field.onChange} />
                )} />
                <FieldLabel htmlFor="p-lots" className="cursor-pointer">Track Batch/Lot Numbers</FieldLabel>
              </Field>

              <Field orientation="horizontal" className="items-center gap-3">
                <Controller control={control} name="trackSerials" render={({ field }) => (
                  <Checkbox id="p-ser" checked={field.value} onCheckedChange={field.onChange} />
                )} />
                <FieldLabel htmlFor="p-ser" className="cursor-pointer">Track Serial Identification</FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>

          {/* Form Actions */}
          <Field orientation="horizontal" className="justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => reset()} disabled={isSubmitting}>
              Reset Form
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving record..." : "Create New Product Entry"}
            </Button>
          </Field>

        </FieldGroup>
      </form>
    </div>
  );
}
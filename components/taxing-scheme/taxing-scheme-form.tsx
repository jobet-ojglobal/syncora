"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taxingSchemeSchema, TaxingSchemeInput } from "@/schemas/taxing-scheme.schema";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowLeft, Receipt, Settings2, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "../shared/form-input";
import { FormSwitch } from "../shared/form-switch";

interface TaxingSchemeFormProps {
  initialData?: TaxingSchemeInput | null;
}

export function TaxingSchemeForm({ initialData }: TaxingSchemeFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<TaxingSchemeInput>({
    resolver: zodResolver(taxingSchemeSchema),
    defaultValues: initialData || {
      name: "",
      isActive: true,
      isDefault: false,
      calculateTax2OnTax1: false,
      tax1Name: "VAT",
      tax1OnShipping: false,
      tax2Name: "",
      tax2OnShipping: false,
      taxCodes: [],
    },
  });

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;

  const { fields: taxCodeFields, append: appendTaxCode, remove: removeTaxCode } = useFieldArray({
    control,
    name: "taxCodes",
  });

  const watchedTax1Name = watch("tax1Name") || "Tax 1";
  const watchedTax2Name = watch("tax2Name");
  const hasTier2 = !!watchedTax2Name;

  const onSubmit = async (values: TaxingSchemeInput) => {
    try {
      const response = await fetch("/api/admin/taxing-scheme", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "System rejected fiscal ledger configuration.");
      }

      toast.success(isEditMode ? "Taxing schema profile rules saved" : "New fiscal taxation scheme registered");
      router.push("/dashboard/settings/financial/taxing");
      router.refresh();
    } catch (err: any) {
      toast.error("Pipeline Sync Interrupted", { description: err.message });
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form Validation Failed:", errors);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="w-full text-xs font-medium space-y-6 ">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-primary" /> 
                  Master Fiscal Taxation Group Setup
                </CardTitle>
                <CardDescription className="text-[11px]">Configure spatial deployment nodes, shipping markers, and tax profiles.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4" >
                <FormInput
                  name="name"
                  control={control}
                  label="Taxing Scheme Collective Label"
                  placeholder="e.g. North America Sales Tax"
                  classNameLabel="text-muted-foreground font-semibold"
                  required
                />
                <FormSwitch
                  name="isActive"
                  control={control}
                  variant="card"
                  label="Active Status"
                  description="Enable or disable this taxing scheme."
                  className=" p-2.5"
                />
                <FormSwitch
                  name="isDefault"
                  control={control}
                  variant="card"
                  label="Default Scheme"
                  description="Set this scheme as the default for new transactions."
                  className=" p-2.5"
                />
              
            </CardContent>
          </Card>
        </div>

        {/* Right */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-primary" /> 
                  Taxation Rate Tiers Configuration
                </CardTitle>
                <CardDescription className="text-[11px]">Define multi-tier tax rates, shipping applicability, and cascading rules.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6" >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  name="tax1Name"
                  control={control}
                  label="Primary Tax Name"
                  placeholder="e.g. VAT"
                  classNameLabel="text-muted-foreground font-semibold"
                  required
                />
                <FormInput
                  name="tax2Name"
                  control={control}
                  label="Secondary Tax Name"
                  placeholder="e.g. GST"
                  classNameLabel="text-muted-foreground font-semibold"
                />
                <FormSwitch
                  name="tax1OnShipping"
                  control={control}
                  variant="card"
                  label="Apply to Shipping"
                  description={`Enable if ${watchedTax1Name} should be applied to shipping costs.`}
                  className=" p-2.5"
                />
                
                <FormSwitch
                  name="tax2OnShipping"
                  control={control}
                  variant="card"
                  label="Apply to Shipping"
                  description={`Enable if ${watchedTax2Name || "Tax 2"} should be applied to shipping costs.`}
                  className=" p-2.5"
                />
                <FormSwitch
                  name="calculateTax2OnTax1"
                  control={control}
                  variant="card"
                  label="Cascading Tax Calculation"
                  description={`Enable if ${watchedTax2Name || "Tax 2"} should be calculated on top of ${watchedTax1Name}.`}
                  className="sm:col-span-2 p-2.5"
                />
              </div>
            </CardContent>
          </Card>

          
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-primary" /> 
              Tax Code Matrix & Delivery Freight Rules
            </CardTitle>
            <CardDescription className="text-[11px]">
              Manage tax codes, their rates, and shipping applicability for this scheme.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {taxCodeFields.length > 0 ? (
            <div className="hidden md:grid grid-cols-12 gap-3 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1 items-center">
              <div className={hasTier2 ? "col-span-4" : "col-span-6"}>
                Tax Code Area/Zone Designation *
              </div>
              <div className="col-span-3 text-right">
                {watchedTax1Name || "Tax 1"} Rate (%)
              </div>
              {hasTier2 && (
                <div className="col-span-3 text-right">
                  {watchedTax2Name || "Tax 2"} Rate (%)
                </div>
              )}
              <div className="col-span-1 text-center">Default</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-muted/5 text-muted-foreground text-center">
              <p className="text-xs text-muted-foreground/80 italic">
                No tax codes defined yet. Use the button below to add a new tax code.
              </p>
            </div>
          )}

          {taxCodeFields.map((field, index) => (
            <div 
              key={field.id} 
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border-b pb-4 last:border-b-0 last:pb-0"
            >
              {/* Tax Code Name */}
              <div className={hasTier2 ? "md:col-span-4" : "md:col-span-6"}>
                <FormInput
                  name={`taxCodes.${index}.name`}
                  control={control}
                  placeholder="e.g. CA Sales Tax"
                  hideLabelOnDesktop // Use custom label or pass standard prop to keep mobile friendly
                  label="Tax Code Name"
                  required
                />
              </div>

              {/* Tax 1 Rate */}
              <div className="md:col-span-3">
                <FormInput
                  name={`taxCodes.${index}.tax1Rate`}
                  control={control}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  label={`${watchedTax1Name || "Tax 1"} Rate (%)`}
                  hideLabelOnDesktop
                  required
                />
              </div>

              {/* Tax 2 Rate (Conditional) */}
              {hasTier2 && (
                <div className="md:col-span-3">
                  <FormInput
                    name={`taxCodes.${index}.tax2Rate`}
                    control={control}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    label={`${watchedTax2Name || "Tax 2"} Rate (%)`}
                    hideLabelOnDesktop
                    required
                  />
                </div>
              )}

              {/* Default Selection Switch/Checkbox */}
              <div className="md:col-span-1 flex justify-center items-center py-1">
                <div className="col-span-1 md:col-span-1 flex flex-col items-start md:items-center justify-center">
                  <span className="block md:hidden text-[10px] uppercase font-bold text-muted-foreground mb-1">Default Jurisdiction</span>
                  <input
                    type="radio"
                    checked={watch(`taxCodes.${index}.isDefault`)}
                    className="w-4 h-4 text-primary bg-background border-input accent-primary cursor-pointer"
                    onChange={() => {
                      // Set selected index to true, set all other item indexes to false
                      taxCodeFields.forEach((_, i) => {
                        setValue(`taxCodes.${i}.isDefault`, i === index);
                      });
                    }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="md:col-span-1 flex justify-center items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTaxCode(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              appendTaxCode({
                name: "",
                isActive: true,
                tax1Rate: 0,
                tax2Rate: 0,
                isDefault: taxCodeFields.length === 0,
              })
            }
            className="w-full mt-2"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Tax Code
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : isEditMode ? "Update Scheme" : "Create Scheme"}
        </Button>
      </div>
    </form>
  );
}

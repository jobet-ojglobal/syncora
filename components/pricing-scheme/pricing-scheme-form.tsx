// components/PricingSchemeForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pricingSchemeSchema, PricingSchemeInput } from "@/schemas/pricing-scheme.schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Tags, Landmark, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "../shared/form-input";
import { FormSwitch } from "../shared/form-switch";
import { FormSelect } from "../shared/form-select";

interface CurrencyLookupNode {
  inflowId: string;
  name: string;
  isoCode: string;
}

interface PricingSchemeFormProps {
  initialData?: any | null;
  currencyLookup: CurrencyLookupNode[];
}

export function PricingSchemeForm({ initialData, currencyLookup }: PricingSchemeFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<PricingSchemeInput>({
    resolver: zodResolver(pricingSchemeSchema),
    defaultValues: initialData || {
      name: "",
      currencyId: "",
      isActive: true,
      isDefault: false,
      isTaxInclusive: false,
    },
  });

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;

  const watchedTaxInclusive = watch("isTaxInclusive");

  const onSubmit = async (values: PricingSchemeInput) => {
    try {
      const response = await fetch("/api/admin/pricing-scheme", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "System engine rejected matrix allocation settings.");
      }

      toast.success(isEditMode ? "Pricing parameters modified" : "New corporate pricing matrix established");
      router.push("/dashboard/settings/financial/pricing");
      router.refresh();
    } catch (err: any) {
      toast.error("Pipeline Communication Drop", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}  className="w-full text-xs font-medium space-y-6 ">
      <Card className="shadow-xs">
        <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Tags className="w-4 h-4 text-primary" /> 
              Strategy Tier Profile Setup
            </CardTitle>
            <CardDescription className="text-[11px]">Configure spatial deployment nodes, shipping markers, and tax profiles.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4" >
          <FormInput
            name="name"
            control={control}
            label="Pricing Scheme Display Title"
            placeholder="e.g., MSRP Base Tier, Wholesaler Tier 2, Distributer Matrix"
            classNameLabel="text-muted-foreground font-semibold"
            required
          />
          <FormSelect
            name="currencyId"
            control={control}
            label="Trading Settlement Currency Anchor"
            placeholder="-- Choose Currency Matrix Hub --"
            options={currencyLookup.map((cur) => ({
              id: cur.inflowId,
              name: `${cur.isoCode} - ${cur.name}`,
            }))}
            classNameLabel="text-muted-foreground font-semibold"
          />
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-primary" /> 
              Operational Governance Rules
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4" >
          <FormSwitch
            name="isActive"
            control={control}
            variant="card"
            label="Active Status"
            description="Enable or disable this pricing scheme."
            className=" p-2.5"
          />
          <FormSwitch
            name="isDefault"
            control={control}
            variant="card"
            label="Default Scheme"
            description="Set this pricing scheme as the default for new entries."
            className=" p-2.5"
          />
          <FormSwitch
            name="isTaxInclusive"
            control={control}
            variant="card"
            label="Tax Inclusive Pricing"
            description="Indicates if the pricing includes tax."
            className=" p-2.5"
          />
        </CardContent>
      </Card>

       {watchedTaxInclusive && (
        <Card className="shadow-xs">
          <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-primary" /> 
                Tax Inclusive Pricing Notice
              </CardTitle>
              <CardDescription className="text-[11px]">This pricing scheme is configured to include tax in the displayed prices.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2" >
            <p className="text-[11px] text-muted-foreground/80">
              All prices under this scheme will be displayed as tax-inclusive. Ensure that your tax rates are correctly configured to avoid discrepancies in final pricing.
            </p>
          </CardContent>
        </Card>
      )}

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
      
// components/PricingSchemeForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pricingSchemeSchema, PricingSchemeInput } from "@/schemas/pricing-scheme.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Tags, Landmark, ShieldAlert, BadgePercent } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";

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

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;

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
      router.push("/dashboard/pricing-scheme");
      router.refresh();
    } catch (err: any) {
      toast.error("Pipeline Communication Drop", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-4xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6 text-xs">
      <FieldGroup className="gap-6">
        
        {/* SECTION 1: Strategic Strategy Definitions Card */}
        <FieldSet className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <FieldLegend className="col-span-1 md:col-span-12 flex items-center gap-2 border-b pb-2 w-full text-foreground font-semibold text-sm">
            <Tags className="w-4 h-4 text-primary" /> Strategy Tier Profile Setup
          </FieldLegend>

          <Field className="md:col-span-6">
            <FieldLabel>Pricing Scheme Display Title *</FieldLabel>
            <Input placeholder="e.g., MSRP Base Tier, Wholesaler Tier 2, Distributer Matrix" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </Field>

          <Field className="md:col-span-6">
            <FieldLabel>Trading Settlement Currency Anchor *</FieldLabel>
            <select
              {...register("currencyId")}
              disabled={isEditMode}
              className="w-full rounded-md border border-input bg-background px-3 h-9 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring font-mono font-bold disabled:opacity-50"
            >
              <option value="">-- Choose Currency Matrix Hub --</option>
              {currencyLookup.map((cur) => (
                <option key={cur.inflowId} value={cur.inflowId}>
                  {cur.isoCode} - {cur.name}
                </option>
              ))}
            </select>
            {errors.currencyId && <span className="text-xs text-destructive block mt-1">{errors.currencyId.message}</span>}
          </Field>
        </FieldSet>

        {/* SECTION 2: Calculation Engine Strategy Parameters */}
        <FieldSet className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
          <FieldLegend className="col-span-1 sm:col-span-3 flex items-center gap-2 font-semibold text-foreground text-sm">
            <Landmark className="w-4 h-4 text-muted-foreground" /> Operational Governance Rules
          </FieldLegend>

          <Field className="lg:col-span-3 h-full">
            <div className="border rounded-lg bg-muted/20 p-4 min-h-[74px] flex justify-between items-center gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Publish Matrix
                </p>
                <p className="text-xs text-muted-foreground leading-normal">
                  Toggle active lookup status
                </p>
              </div>
              <Switch
                className="shrink-0"
                checked={watch("isActive")}
                onCheckedChange={(value) => setValue("isActive", value)}
              />
            </div>
          </Field>

          <Field className="lg:col-span-3 h-full">
            <div className="border rounded-lg bg-muted/20 p-4 min-h-[74px] flex justify-between items-center gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Global Default
                </p>
                <p className="text-xs text-muted-foreground leading-normal">
                  Auto-assign new customers
                </p>
              </div>
              <Switch
                className="shrink-0"
                checked={watch("isDefault")}
                onCheckedChange={(value) => setValue("isDefault", value)}
              />
            </div>
          </Field>

          <Field className="lg:col-span-3 h-full">
            <div className="border rounded-lg bg-muted/20 p-4 min-h-[74px] flex justify-between items-center gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Tax-Inclusive Matrix
                </p>
                <p className="text-xs text-muted-foreground leading-normal">
                  Absorb sales tax into base rate
                </p>
              </div>
              <Switch
                className="shrink-0"
                checked={watch("isTaxInclusive")}
                onCheckedChange={(value) => setValue("isTaxInclusive", value)}
              />
            </div>
          </Field>
         
        </FieldSet>

        {/* Dynamic Warning Alert Banner based on tax flags states */}
        {watchedTaxInclusive && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 text-amber-800 rounded-lg flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-150">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-[11px]">Tax Absorption Rule Applied</span>
              <p className="text-[10px] text-amber-700/90 mt-0.5 leading-normal">
                Enabling this setting instructs the calculation engine that listed retail
                item prices are <strong>tax-inclusive (gross)</strong>. During invoicing,
                the system derives the net amount using the formula:
                <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-[10px]">
                    Net Price = Gross Price ÷ (1 + Tax Rate)
                </code>
                instead of adding tax on top of the subtotal.
                </p>
            </div>
          </div>
        )}

        {/* Action controllers line strip bar */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[150px] text-xs">
            {isSubmitting ? "Compiling pricing rules..." : isEditMode ? "Save Strategy Changes" : "Deploy Pricing Scheme"}
          </Button>
        </div>

      </FieldGroup>
    </form>
  );
}
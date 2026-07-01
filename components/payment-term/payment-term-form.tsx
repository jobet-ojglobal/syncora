// components/PaymentTermsForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Scale, CalendarClock, Hash, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { PaymentTermsInput, paymentTermsSchema } from "@/schemas/payment-term.schema";

interface PaymentTermsFormProps {
  initialData?: any | null;
}

export function PaymentTermsForm({ initialData }: PaymentTermsFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<PaymentTermsInput>({
    resolver: zodResolver(paymentTermsSchema),
    defaultValues: initialData || {
      name: "",
      daysDue: null,
      isActive: true,
    },
  });

  const { register, setValue, watch, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (values: PaymentTermsInput) => {
    try {
      const response = await fetch("/api/admin/payment-terms", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Operational framework matrix rejected updates parameters.");
      }

      toast.success(isEditMode ? "Maturity metrics parameters saved" : "New settlement terms rule deployed");
      router.push("/dashboard/payment-terms");
      router.refresh();
    } catch (err: any) {
      toast.error("Pipeline Write Aborted", { description: err.message });
    }
  };

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)} 
      className="w-full mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6 text-xs"
    >
      <FieldGroup className="gap-6">
        
        <FieldSet className="space-y-4">
          <FieldLegend className="flex items-center gap-2 font-semibold text-foreground text-sm border-b pb-2 w-full">
            <Scale className="w-4 h-4 text-primary" /> Matrix Maturity Profile Configuration
          </FieldLegend>

          {/* FIELD 2: Display Title Text Designation Handle String */}
          <Field >
            <FieldLabel>Clear Display Term Title Name *</FieldLabel>
            <Input
              {...register("name")}
              placeholder="Example: Net 30 Days Calendar Framework"
              className="h-9 text-xs"
            />
            <FieldDescription>
              Public descriptive ledger name designation displayed on accounting checkout routers.
            </FieldDescription>
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          {/* FIELD 3: Integer Limit Tracking Metric Window Calculation Days */}
          <Field >
            <FieldLabel>Days Delta Threshold Until Collection Maturity</FieldLabel>
            <div className="relative">
              <CalendarClock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <Input
                type="number"
                {...register("daysDue", { valueAsNumber: true })}
                placeholder="Leave completely blank for immediate Due On Receipt styles"
                className="pl-9 h-9 text-xs font-mono"
              />
            </div>
            <FieldDescription>
              The whole integer window used by aging accounts ledgers to flag dynamic receivables delinquency.
            </FieldDescription>
            {errors.daysDue && <FieldError>{errors.daysDue.message}</FieldError>}
          </Field>

          <FieldSeparator />

        <Field className="lg:col-span-3 h-full">
          <div className="border rounded-lg bg-muted/20 p-4 min-h-[74px] flex justify-between items-center gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                Operational Rule Status
              </p>
              <p className="text-xs text-muted-foreground leading-normal">
                Controls if dynamic checkout routers can inherit this baseline parameters tracking entry.
              </p>
            </div>
            <Switch
                className="shrink-0"
                checked={watch("isActive")}
                onCheckedChange={(value) => setValue("isActive", value)}
            />
          </div>
        </Field>

        </FieldSet>

        {/* Action Controls Toolbar Footer Panel */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()} 
            className="gap-1.5 text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Terms Matrix
          </Button>
          
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            size="sm" 
            className="min-w-[160px] text-xs gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Committing Entry...
              </>
            ) : isEditMode ? (
              "Save Parameter Changes"
            ) : (
              "Deploy Payment Rule"
            )}
          </Button>
        </div>

      </FieldGroup>
    </form>
  );
}
"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Scale, CalendarClock, ArrowLeft, Loader2 } from "lucide-react";
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
import { paymentTermsSchema } from "@/schemas/payment-term.schema";

interface PaymentTermsFormProps {
  initialData?: {
    name: string;
    daysDue: number | null;
    isActive: boolean;
  } | null;
}

// 1. Define local UI state types. HTML number inputs natively return strings.
interface FormValues {
  name: string;
  daysDue: string | number;
  isActive: boolean;
}

export function PaymentTermsForm({ initialData }: PaymentTermsFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  // 2. Drive the form state with FormValues
  const form = useForm<FormValues>({
    defaultValues: {
      name: initialData?.name ?? "",
      daysDue: initialData?.daysDue ?? "",
      isActive: initialData?.isActive ?? true,
    },
  });

  const { 
    register, 
    setValue, 
    watch, 
    handleSubmit, 
    setError,
    formState: { errors, isSubmitting } 
  } = form;

  const onSubmit = async (data: FormValues) => {
    try {
      // 3. Validate and transform UI data using the Zod schema right at submission border
      const result = paymentTermsSchema.safeParse(data);
      
      if (!result.success) {
        // Map Zod validation errors back onto the UI fields
        result.error.issues.forEach((issue) => {
          setError(issue.path[0] as any, { message: issue.message });
        });
        return;
      }

      // validatedValues is now fully typed as PaymentTermsInput (with daysDue as number | null)
      const validatedValues = result.data;

      const response = await fetch("/api/admin/payment-terms", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedValues),
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

          {/* NAME FIELD */}
          <Field>
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

          {/* DAYS DUE FIELD */}
          <Field>
            <FieldLabel>Days Delta Threshold Until Collection Maturity</FieldLabel>
            <div className="relative">
              <CalendarClock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <Input
                type="number"
                {...register("daysDue")}
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

          {/* STATUS SWITCH */}
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

        {/* CONTROLS FOOTER */}
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
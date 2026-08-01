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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "../shared/form-input";
import { FormSelect } from "../shared/form-select";
import { FormSwitch } from "../shared/form-switch";

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
    control,
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
      router.push("/dashboard/settings/financial/payment-terms");
      router.refresh();
    } catch (err: any) {
      toast.error("Pipeline Write Aborted", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full text-xs font-medium space-y-6 ">
      <Card className="shadow-xs">
        <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-primary" /> 
               Matrix Maturity Profile Configuration
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4" >
          <FormInput
            name="name"
            control={control}
            label="Clear Display Term Title Name"
            placeholder="Example: Net 30 Days Calendar Framework"
            classNameLabel="text-muted-foreground font-semibold"
            required
          />
          <FormInput
            name="daysDue"
            control={control}
            label="Maturity Days Due"
            placeholder="e.g., 30, 60, 90"
            type="number"
            classNameLabel="text-muted-foreground font-semibold"
          />
          <FormSwitch
            name="isActive"
            control={control}
            variant="card"
            label="Active Status"
            description="Toggle to enable or disable this payment term rule in the system."
            className="sm:col-span-3 p-2.5"
          />
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
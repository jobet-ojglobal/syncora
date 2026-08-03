"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  adjustmentReasonSchema,
  AdjustmentReasonInput,
} from "@/schemas/adjustment-reason.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FormSwitch } from "../shared/form-switch";
import { ArrowLeft } from "lucide-react";
import { FormInput } from "../shared/form-input";

interface AdjustmentReasonFormProps {
  initialData?: {
    id: string;
    inflowId: string;
    name: string;
    isActive: boolean;
    isInternal: boolean;
  } | null;
  onSuccess?: () => void;
}

export function AdjustmentReasonForm({
  initialData,
  onSuccess,
}: AdjustmentReasonFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<AdjustmentReasonInput>({
    resolver: zodResolver(adjustmentReasonSchema),
    defaultValues: {
      id: initialData?.id,
      name: initialData?.name || "",
      isActive: initialData?.isActive ?? true,
      isInternal: initialData?.isInternal ?? false,
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (values: AdjustmentReasonInput) => {
    try {
      const endpoint = "/api/admin/adjustment-reasons";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save adjustment reason.");
      }

      toast.success(
        isEditMode ? "Adjustment Reason Updated" : "Adjustment Reason Created",
        {
          description: `Successfully processed "${values.name}".`,
        }
      );

      router.push("/dashboard/inventory/adjustments/reasons");
      router.refresh();

      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Transaction Error", {
        description: err.message || "Failed to persist adjustment reason.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full text-xs font-medium space-y-6 ">
      <Card className="shadow-xs">
        <CardContent className="space-y-2" >
          <FormInput
              name="name"
              control={control}
              label="Reason Name"
              placeholder="e.g., Damaged Stock, Shrinkage, Audit Variance"
              classNameLabel="text-muted-foreground font-semibold"
              required
            />

            {/* Active Toggle */}
            <FormSwitch
                name="isActive"
                control={control}
                label="Active Status"
                variant="card"
                description="Controls whether this reason is selectable in active operations."
                className="sm:col-span-2 p-2.5"
            />

            {/* Internal Toggle */}
            <FormSwitch
                name="isInternal"
                control={control}
                label="Internal Only"
                variant="card"
                description="Restrict visibility of this adjustment code to system admins."
                className="sm:col-span-2 p-2.5"
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
          {isSubmitting ? "Processing..." : isEditMode ? "Update Reason" : "Create Reason"}
        </Button>
      </div>
    </form>
  );
}
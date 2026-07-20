"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  adjustmentReasonSchema,
  AdjustmentReasonInput,
} from "@/schemas/adjustment-reason.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; // or standard <input type="checkbox" />
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { FormSwitch } from "../shared/form-switch";

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
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
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

      router.push("/dashboard/settings/adjustment-reasons");
      router.refresh();

      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Transaction Error", {
        description: err.message || "Failed to persist adjustment reason.",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-xl mx-auto p-6 bg-card border rounded-xl shadow-sm"
    >
      <FieldGroup className="gap-5">
        <FieldSet>
          <FieldLegend>
            {isEditMode
              ? `Modify ${initialData?.name}`
              : "Register Adjustment Reason"}
          </FieldLegend>

          <FieldGroup className="gap-4 mt-4">
            {/* Name */}
            <Field>
              <FieldLabel htmlFor="reason-name">Reason Name *</FieldLabel>
              <Input
                id="reason-name"
                placeholder="e.g., Damaged Stock, Shrinkage, Audit Variance"
                {...register("name")}
              />
              {errors.name && (
                <span className="text-xs text-destructive">
                  {errors.name.message}
                </span>
              )}
            </Field>

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
          </FieldGroup>
        </FieldSet>

        {/* Action Buttons */}
        <div className="flex flex-row items-center justify-end gap-4 w-full mt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => reset()}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving changes..."
              : isEditMode
              ? "Save Changes"
              : "Create Adjustment Reason"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
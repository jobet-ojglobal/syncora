// components/BrandForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandSchema, BrandInput } from "@/schemas/brand.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

interface BrandFormProps {
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
  } | null;
  onSuccess?: () => void;
}

export function BrandForm({ initialData, onSuccess }: BrandFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<BrandInput>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      id: initialData?.id,
      name: initialData?.name || "",
      description: initialData?.description || "",
      logoUrl: initialData?.logoUrl || "",
      websiteUrl: initialData?.websiteUrl || "",
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (values: BrandInput) => {
    try {
      const endpoint = "/api/admin/brands";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Network transaction failed.");
      }

      toast.success(isEditMode ? "Brand Updated" : "Brand Created", {
        description: `Successfully processed profiles for "${values.name}".`,
      });

      router.push("/dashboard/brands");
      router.refresh();

      // if (!isEditMode) {
      //   reset(); // Clear form values if creating fresh profiles
      // }

      // if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Transaction Error", { description: err.message || "Failed to save profile structural assets." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-xl mx-auto p-6 bg-card border rounded-xl shadow-sm">
      <FieldGroup className="gap-5">
        <FieldSet>
          <FieldLegend>{isEditMode ? `Modify ${initialData?.name} Profile` : "Register Manufacturer Brand"}</FieldLegend>
          
          <FieldGroup className="gap-4 mt-4">
            {/* Brand Title Name */}
            <Field>
              <FieldLabel htmlFor="brand-name">Brand Label Name *</FieldLabel>
              <Input id="brand-name" placeholder="e.g., Sony, Logitech" {...register("name")} />
              {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
            </Field>

            {/* Logo Image Link */}
            <Field>
              <FieldLabel htmlFor="brand-logo">Logo Asset URL</FieldLabel>
              <Input id="brand-logo" placeholder="https://cdn.example.com/logos/sony.png" {...register("logoUrl")} />
              {errors.logoUrl && <span className="text-xs text-destructive">{errors.logoUrl.message}</span>}
            </Field>

            {/* Official Website Target */}
            <Field>
              <FieldLabel htmlFor="brand-web">Official Website Link</FieldLabel>
              <Input id="brand-web" placeholder="https://www.sony.com" {...register("websiteUrl")} />
              {errors.websiteUrl && <span className="text-xs text-destructive">{errors.websiteUrl.message}</span>}
            </Field>

            {/* Description Summary Info */}
            <Field>
              <FieldLabel htmlFor="brand-desc">Corporate Profile Description</FieldLabel>
              <Textarea id="brand-desc" rows={4} placeholder="Summarize background context milestones..." {...register("description")} />
            </Field>
          </FieldGroup>
        </FieldSet>

        <div className="flex flex-row items-center justify-end gap-4 w-full mt-2">
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" disabled={isSubmitting} >
            {isSubmitting ? "Writing data alterations..." : isEditMode ? "Save Profile Changes" : "Create Master Brand Profile"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
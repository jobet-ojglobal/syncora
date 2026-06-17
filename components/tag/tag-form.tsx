// components/TagForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tagSchema, TagInput } from "@/schemas/tag.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Tag } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface TagFormProps {
  initialData?: { id: string; name: string } | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TagForm({ initialData, onSuccess, onCancel }: TagFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TagInput>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      id: initialData?.id,
      name: initialData?.name || "",
    },
  });

  const onSubmit = async (values: TagInput) => {
    try {
      const endpoint = "/api/admin/tags";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed taxonomy label processing configuration.");
      }

      toast.success(isEditMode ? "Classification Tag updated" : "New dynamic tag registered");

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard/tags");
        router.refresh();
      }
      
    } catch (err: any) {
      toast.error("Taxonomy Write Failure", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6">
      <FieldGroup className="gap-4">
        
        <div className="flex items-center gap-2 border-b pb-2">
          <Tag className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            {isEditMode ? "Edit Taxonomy Component" : "Create New Catalog Tag"}
          </h2>
        </div>

        <Field>
          <FieldLabel>Dynamic Tag Metric Name *</FieldLabel>
          <Input 
            placeholder="e.g. Winter-Collection, Fragile, Clearance" 
            className="text-xs h-9"
            {...register("name")} 
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Tags help organize cross-relational filtering across your storefront and inventory views.
          </p>
          {errors.name && <span className="text-xs text-destructive mt-1 block">{errors.name.message}</span>}
        </Field>

        {/* Action Controls Footer */}
        <div className={`flex items-center  gap-4 border-t pt-4 mt-2 ${isEditMode ? 'justify-end' : 'justify-between'}`}>
          { !isEditMode && (
              <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Cancel
              </Button>
          )}
          
          <Button type="submit" disabled={isSubmitting} size="sm">
            {isSubmitting ? "Saving rules..." : isEditMode ? "Update Tag" : "Register Tag"}
          </Button>
        </div>

      </FieldGroup>
    </form>
  );
}
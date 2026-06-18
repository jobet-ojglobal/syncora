// components/CategoryForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { CategoryInput, categorySchema } from "@/schemas/category.schema";
import { useRouter } from "next/navigation";

interface CategoryFlatOption {
  id: string;
  inflowId: string;
  name: string;
}

interface BrandFormProps {
  initialData?: {
    id: string;
    inflowId: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    parentId: string | null;
  } | null;
  onSuccess?: () => void;
}

export function CategoryForm({ initialData, onSuccess }: BrandFormProps) {
  const [flatCategories, setFlatCategories] = useState<CategoryFlatOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      id: initialData?.id,
      name: initialData?.name || "",
      description: initialData?.description || "",
      imageUrl: initialData?.imageUrl || "",
      parentId: initialData?.parentId || "root-level", // Select UI placeholder default
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = form;

  // Fetch available categories to populate the Parent Category dropdown
  const fetchCategoryOptions = async () => {
    try {
      const res = await fetch("/api/admin/categories/basic"); // Your endpoint returning inflowId + name
      if (res.ok) {
          const data: CategoryFlatOption[] = await res.json();
          
          // 🛑 SAFEGUARD: Remove this specific item from options stack 
          // to prevent circular dependencies (e.g. Cameras can't be a parent of Cameras)
          const validParents = data.filter(cat => cat.id !== initialData?.inflowId);
          setFlatCategories(validParents);
      }
    } catch (err) {
      console.error("Failed to fetch parent options:", err);
    }
  };

  useEffect(() => {
    fetchCategoryOptions().then(() => setIsLoading(false));
  }, []);

  const onSubmit = async (values: CategoryInput) => {
    try {
      const endpoint = "/api/admin/categories";
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

      toast.success(isEditMode ? "Category Updated" : "Category Created", {
        description: `Successfully processed profiles for "${values.name}".`,
      });

      router.push("/dashboard/categories");
      router.refresh();
    } catch (err: any) {
      toast.error("Transaction Error", { description: err.message || "Failed to save profile structural assets." });
    }
  };

  if (isLoading) return <div className="text-center p-6 text-xs text-muted-foreground">Loading classification structure...</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-xl mx-auto p-6 bg-card border rounded-xl shadow-sm">
      <FieldGroup className="gap-5">
        <FieldSet>
          <FieldLegend>Create Product Category</FieldLegend>
          
          <FieldGroup className="gap-4 mt-4">
            {/* Category Name */}
            <Field>
              <FieldLabel htmlFor="cat-name">Category Name *</FieldLabel>
              <Input id="cat-name" placeholder="e.g., Digital Cameras" {...register("name")} />
              {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
            </Field>

            {/* Parent Category Lookup Selector */}
            <Field>
              <FieldLabel htmlFor="cat-parent">Parent Hierarchy Option</FieldLabel>
              <Controller
                control={control}
                name="parentId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || "root-level"}>
                    <SelectTrigger id="cat-parent">
                      <SelectValue placeholder="Select parent structural level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root-level">None (Top-Level Root Category)</SelectItem>
                      {flatCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.inflowId}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {/* Thumbnail URL */}
            <Field>
              <FieldLabel htmlFor="cat-img">Banner/Image URL</FieldLabel>
              <Input id="cat-img" placeholder="https://cdn.example.com/assets/images/cam.jpg" {...register("imageUrl")} />
              {errors.imageUrl && <span className="text-xs text-destructive">{errors.imageUrl.message}</span>}
            </Field>

            {/* Description Text area */}
            <Field>
              <FieldLabel htmlFor="cat-desc">Description</FieldLabel>
              <Textarea id="cat-desc" rows={3} placeholder="Provide category context summaries..." {...register("description")} />
            </Field>
          </FieldGroup>
        </FieldSet>

        <div className="flex flex-row items-center justify-end gap-4 w-full mt-2">
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating structural record..." : "Save Classification"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
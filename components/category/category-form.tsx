// components/CategoryForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCategorySchema, CreateCategoryInput } from "@/schemas/category.schema";
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

interface CategoryFlatOption {
  id: string;
  label: string;
}

export function CategoryForm() {
  const [flatCategories, setFlatCategories] = useState<CategoryFlatOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      parentId: "root-level", // Select UI placeholder default
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = form;

  // Fetch available categories to populate the Parent Category dropdown
  const fetchCategoryOptions = async () => {
    try {
      const res = await fetch("/api/admin/categories/basic"); // Your endpoint returning inflowId + name
      if (res.ok) {
        const data = await res.json();
        setFlatCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch parent options:", err);
    }
  };

  useEffect(() => {
    fetchCategoryOptions().then(() => setIsLoading(false));
  }, []);

  const onSubmit = async (values: CreateCategoryInput) => {
    try {
      // Clean fallback string token back into an applicable DB null configuration
      const payload = {
        ...values,
        parentId: values.parentId === "root-level" ? null : values.parentId,
      };

      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await response.json();

      if (!response.ok) {
        throw new Error(
            res.message ||
            "Could not process transactions"
        );
      }

      toast.success("Category Created", {
        description: `Successfully added ${values.name} taxonomy.`,
      });

      // Clear layout and refresh parent options array dropdown stack
      reset({ name: "", description: "", imageUrl: "", parentId: "root-level" });
      await fetchCategoryOptions();
    } catch (err) {
      let error = err instanceof Error
        ? err.message
        : "Failed to create category listing."
      toast.error("Error", { description: error});
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
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
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

        <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
          {isSubmitting ? "Creating structural record..." : "Save Classification"}
        </Button>
      </FieldGroup>
    </form>
  );
}
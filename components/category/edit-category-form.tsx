// // components/EditCategoryForm.tsx
// "use client";

// import { useEffect, useState } from "react";
// import { useForm, Controller } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { editCategorySchema, EditCategoryInput } from "@/schemas/category.schema";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { toast } from "sonner";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Field,
//   FieldGroup,
//   FieldLabel,
//   FieldLegend,
//   FieldSet,
// } from "@/components/ui/field";

// interface CategoryFlatOption {
//   id: string;
//   label: string;
// }

// interface EditCategoryFormProps {
//   initialCategory: {
//     id: string;
//     name: string;
//     description: string | null;
//     imageUrl: string | null;
//     parentId: string | null;
//   };
//   onSuccess?: () => void; // Optional callback to trigger parent sidebar list sync reloads
// }

// export function EditCategoryForm({ initialCategory, onSuccess }: EditCategoryFormProps) {
//   const [flatCategories, setFlatCategories] = useState<CategoryFlatOption[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   const form = useForm<EditCategoryInput>({
//     resolver: zodResolver(editCategorySchema),
//     defaultValues: {
//       id: initialCategory.id,
//       name: initialCategory.name,
//       description: initialCategory.description || "",
//       imageUrl: initialCategory.imageUrl || "",
//       parentId: initialCategory.parentId || "root-level",
//     },
//   });

//   const { register, handleSubmit, control, formState: { errors, isSubmitting } } = form;

//   useEffect(() => {
//     async function fetchCategoryOptions() {
//       try {
//         const res = await fetch("/api/admin/categories/basic");
//         if (res.ok) {
//           const data: CategoryFlatOption[] = await res.json();
          
//           // 🛑 SAFEGUARD: Remove this specific item from options stack 
//           // to prevent circular dependencies (e.g. Cameras can't be a parent of Cameras)
//           const validParents = data.filter(cat => cat.id !== initialCategory.id);
//           setFlatCategories(validParents);
//         }
//       } catch (err) {
//         console.error("Failed to load possible taxonomy targets:", err);
//       } finally {
//         setIsLoading(false);
//       }
//     }
//     fetchCategoryOptions();
//   }, [initialCategory.id]);

//   const onSubmit = async (values: EditCategoryInput) => {
//     try {
//       const payload = {
//         ...values,
//         parentId: values.parentId === "root-level" ? null : values.parentId,
//       };

//       const response = await fetch(`/api/admin/categories/${initialCategory.id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const res = await response.json();

//       if (!response.ok) {
//         throw new Error(
//             res.message ||
//             "Could not process category modification"
//         );
//       }

//       toast.success("Category Updated", {
//         description: `Successfully modified properties for ${values.name}.`,
//       });

//       if (onSuccess) onSuccess();
//     } catch (err) {
//       let error = err instanceof Error
//         ? err.message
//         : "Failed to update category alterations."
//       toast.error("Error", { description: error});
//     }
//   };

//   if (isLoading) return <div className="text-center p-6 text-xs text-muted-foreground">Hydrating layout fields...</div>;

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-xl mx-auto p-6 bg-card border rounded-xl shadow-sm">
//       <FieldGroup className="gap-5">
//         <FieldSet>
//           <FieldLegend>Modify Category System Properties</FieldLegend>
          
//           <FieldGroup className="gap-4 mt-4">
//             {/* Category Name */}
//             <Field>
//               <FieldLabel htmlFor="edit-cat-name">Category Name *</FieldLabel>
//               <Input id="edit-cat-name" {...register("name")} />
//               {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
//             </Field>

//             {/* Parent Category Dropdown Selection */}
//             <Field>
//               <FieldLabel htmlFor="edit-cat-parent">Hierarchical Parent Relationship</FieldLabel>
//               <Controller
//                 control={control}
//                 name="parentId"
//                 render={({ field }) => (
//                   <Select onValueChange={field.onChange} value={field.value || "root-level"}>
//                     <SelectTrigger id="edit-cat-parent">
//                       <SelectValue placeholder="Assign level categorization..." />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="root-level">None (Top-Level Root Category)</SelectItem>
//                       {flatCategories.map((cat) => (
//                         <SelectItem key={cat.id} value={cat.id}>
//                           {cat.label}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 )}
//               />
//             </Field>

//             {/* Thumbnail Image URL */}
//             <Field>
//               <FieldLabel htmlFor="edit-cat-img">Banner Image URL</FieldLabel>
//               <Input id="edit-cat-img" placeholder="https://cdn.example.com/image.jpg" {...register("imageUrl")} />
//               {errors.imageUrl && <span className="text-xs text-destructive">{errors.imageUrl.message}</span>}
//             </Field>

//             {/* Description Area */}
//             <Field>
//               <FieldLabel htmlFor="edit-cat-desc">Description</FieldLabel>
//               <Textarea id="edit-cat-desc" rows={3} {...register("description")} />
//             </Field>
//           </FieldGroup>
//         </FieldSet>

//         <div className="flex gap-3 mt-2">
//           <Button type="submit" disabled={isSubmitting} className="w-full">
//             {isSubmitting ? "Saving tracking changes..." : "Commit Update Changes"}
//           </Button>
//         </div>
//       </FieldGroup>
//     </form>
//   );
// }
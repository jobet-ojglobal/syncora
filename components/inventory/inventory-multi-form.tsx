"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inventorySchema, InventoryInput } from "@/schemas/inventory.multi.schema";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Warehouse, Boxes, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { ProductLineCard } from "./product-line-card";
import { InventoryLineModal } from "./inventory-line-modal";

interface SelectionOption {
  inflowId: string;
  name: string;
}

interface SublocationOption {
  id: string;
  name: string;
  locationId: string;
}

interface InventoryFormProps {
  locations: SelectionOption[];
  initialData?: any | null;
}

export function InventoryFormV2({ locations, initialData }: InventoryFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [modalOpen, setModalOpen] = useState(false);

  // Facility-dependent state
  const [products, setProducts] = useState<SelectionOption[]>([]);
  const [sublocations, setSublocations] = useState<SublocationOption[]>([]);
  const [isLoadingLocationData, setIsLoadingLocationData] = useState(false);

  const form = useForm<InventoryInput>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      id: initialData?.id,
      locationId: initialData?.locationId || "",
      remarks: initialData?.remarks || "",
      lines:
        initialData?.lines?.map((line: any) => ({
          id: line.id,
          productId: line.productId,
          quantityOnHand: Number(line.quantityOnHand) || 0,
          quantityReserved: Number(line.quantityReserved) || 0,
          quantityAvailable: Number(line.quantityAvailable) || 0,
          bins:
            line.bins?.map((bin: any) => ({
              id: bin.id,
              sublocationId: bin.sublocationId || "",
              quantity: Number(bin.quantity) || 0,
            })) || [],
        })) || [],
    },
  });

  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = form;

  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLocationId = useWatch({ control, name: "locationId" });
  const isFirstRender = useRef(true);

  // Fetch products and sublocations on location selection
  useEffect(() => {
    if (!watchedLocationId) {
      setProducts([]);
      setSublocations([]);
      return;
    }

    const fetchLocationData = async () => {
      setIsLoadingLocationData(true);
      try {
        const [productsRes, sublocationsRes] = await Promise.all([
          fetch(`/api/locations/${watchedLocationId}/products`),
          fetch(`/api/locations/${watchedLocationId}/sublocations`),
        ]);

        if (productsRes.ok && sublocationsRes.ok) {
          const productsData = await productsRes.json();
          const sublocationsData = await sublocationsRes.json();

          setProducts(productsData.products || []);
          setSublocations(sublocationsData.sublocations || []);
        } else {
          toast.error("Failed to load facility data");
        }
      } catch (err) {
        console.error("Error fetching location dependencies:", err);
        toast.error("Error loading location data");
      } finally {
        setIsLoadingLocationData(false);
      }
    };

    fetchLocationData();
  }, [watchedLocationId]);

  // Reset lines when switching facility mid-session
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setValue("lines", []);
  }, [watchedLocationId, setValue]);

  // Submit Handler with Bulk Auto-Assignment
  const onSubmit = async (values: InventoryInput) => {
    try {
      const endpoint = "/api/admin/inventory";
      const method = isEditMode ? "PATCH" : "POST";

      // 1. Locate designated Bulk/Unassigned sublocation slot for this facility
      const bulkSublocation = sublocations.find(
        (sub) =>
          sub.name.toLowerCase().includes("bulk") ||
          sub.name.toLowerCase().includes("unassigned")
      );

      // 2. Process each product line and allocate remaining unassigned quantities
      const processedLines = (values.lines || []).map((line) => {
        const activeBins = line.bins || [];
        const binTotal = activeBins.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
        const onHand = Number(line.quantityOnHand) || 0;
        const reserved = Number(line.quantityReserved) || 0;
        const unassigned = onHand - binTotal;

        const finalBins = [...activeBins];

        // Assign unassigned balance to bulk zone if present and unassigned > 0
        if (unassigned > 0 && bulkSublocation) {
          const existingBulkIndex = finalBins.findIndex(
            (b) => b.sublocationId === bulkSublocation.id
          );

          if (existingBulkIndex >= 0) {
            finalBins[existingBulkIndex] = {
              ...finalBins[existingBulkIndex],
              quantity: (Number(finalBins[existingBulkIndex].quantity) || 0) + unassigned,
            };
          } else {
            finalBins.push({
              sublocationId: bulkSublocation.id,
              quantity: unassigned,
            });
          }
        }

        // Clean out empty/zero quantity bin rows
        const cleanedBins = finalBins.filter(
          (b) => b.sublocationId && Number(b.quantity) > 0
        );

        return {
          ...line,
          quantityOnHand: onHand,
          quantityReserved: reserved,
          quantityAvailable: onHand - reserved,
          bins: cleanedBins,
        };
      });

      const cleanedPayload = {
        ...values,
        lines: processedLines,
      };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed stock adjustment process allocation.");
      }

      toast.success(isEditMode ? "Stock Levels Updated" : "Inventory Initialized Successfully");
      router.push("/dashboard/inventory");
      router.refresh();
    } catch (err: any) {
      toast.error("Process Deviation Error", { description: err.message });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6"
    >
      <FieldGroup className="gap-5">
        <FieldSet>
          <FieldLegend className="flex items-center gap-2 text-base font-semibold">
            <Boxes className="w-5 h-5 text-primary" />
            {isEditMode ? "Edit Inventory" : "New Inventory Entry"}
          </FieldLegend>

          {/* Location Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field>
              <FieldLabel className="text-xs font-semibold flex items-center gap-1">
                <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                Target Facility Terminal *
              </FieldLabel>
              <div className="relative">
                <select
                  disabled={isEditMode || lineFields.length > 0}
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 disabled:opacity-60"
                  {...register("locationId")}
                >
                  <option value="">-- Choose Storage Facility --</option>
                  {locations.map((loc) => (
                    <option key={loc.inflowId} value={loc.inflowId}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                {isLoadingLocationData && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {errors.locationId && (
                <span className="text-xs text-destructive">{errors.locationId.message}</span>
              )}
            </Field>
          </div>
        </FieldSet>

        {/* Dynamic Product Lines Section */}
        <FieldSet className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <FieldLegend className="text-sm font-semibold flex items-center gap-2">
                Product Bin Allocations
              </FieldLegend>
              <p className="text-[11px] text-muted-foreground">
                Select products and map their stock quantities across designated bin slots.
              </p>
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!watchedLocationId || isLoadingLocationData}
              onClick={() => setModalOpen(true)}
              className="h-8 text-xs gap-1.5"
            >
              {isLoadingLocationData ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Select Products
            </Button>
          </div>

          {lineFields.length === 0 ? (
            <div className="border border-dashed rounded-xl p-8 text-center bg-muted/20">
              <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="w-6 h-6 opacity-50" />
                <span className="text-xs font-medium">
                  {!watchedLocationId
                    ? "Please select a storage facility first."
                    : isLoadingLocationData
                    ? "Loading facility data..."
                    : "No products assigned. Click 'Select Products' to begin."}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {lineFields.map((fieldItem, lineIndex) => (
                <ProductLineCard
                  key={fieldItem.id}
                  lineIndex={lineIndex}
                  control={control}
                  register={register}
                  setValue={setValue}
                  errors={errors}
                  products={products}
                  sublocations={sublocations}
                  onRemoveLine={() => removeLine(lineIndex)}
                />
              ))}
            </div>
          )}
        </FieldSet>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-xs gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || lineFields.length === 0}
            size="sm"
            className="min-w-[140px]"
          >
            {isSubmitting
              ? "Saving..."
              : isEditMode
              ? "Apply Changes"
              : "Commit Inventory"}
          </Button>
        </div>
      </FieldGroup>

      {/* Modal */}
      {modalOpen && (
        <InventoryLineModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          products={products}
          existingLines={lineFields}
          onSave={(selectedItems) => {
            // Iterate through selected items from the modal and append each line
            selectedItems.forEach((item) => {
              if (item.productId) {
                appendLine({
                  productId: item.productId,
                  quantityOnHand: 0,
                  quantityReserved: 0,
                  quantityAvailable: 0,
                  bins: [], // Initial empty bins array for nested allocations
                });
              }
            });

            setModalOpen(false);
          }}
        />
      )}
    </form>
  );
}
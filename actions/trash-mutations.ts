"use server"
import { ModelName, SoftDeleteRepository } from "@/lib/softDeleteRepository";
import { revalidatePath } from "next/cache";
import { TrashItem } from "./trash";

// Map UI identifiers to Prisma model names
const modelMap: Record<TrashItem["modelType"], ModelName> = {
  User: "user",
  Attribute: "attribute",
  Category: "category",
  Currency: "currency",
  "Taxing Scheme": "taxingScheme",
  "Pricing Scheme": "pricingScheme",
  "Payment Term": "paymentTerm",
  Product: "product",
  Brand: "brand",
  Customer: "customer",
  Vendor: "vendor",
  "Product Group": "productGroup",
  Location: "location",
  "Team Member": "teamMember",
  "Adjustment Reason": "adjustmentReason"
};

export async function restoreItem(id: string, modelType: TrashItem["modelType"]) {
  try {
    const modelName = modelMap[modelType];
    if (!modelName) throw new Error("Invalid model type");

    await SoftDeleteRepository.restore(modelName, id);
    
    revalidatePath("/dashboard/settings/trash");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to restore item." };
  }
}

export async function permanentDeleteItem(id: string, modelType: TrashItem["modelType"]) {
  try {
    const modelName = modelMap[modelType];
    if (!modelName) throw new Error("Invalid model type");

    await SoftDeleteRepository.permanentDelete(modelName, id);

    revalidatePath("/dashboard/settings/trash");
    return { success: true };
  } catch (error: any) {
    console.error("Critical failure dropping catalog configuration elements:", error);
    return { error: error.message || "Internal Database execution permanently delete error occurred." };
  }
}

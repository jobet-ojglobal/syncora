"use server"
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Helper to map UI string identifiers to Prisma model keys
const getModelClient = (modelType: string) => {
  const modelMap: Record<string, any> = {
    "Brand": prisma.brand,
    "Category": prisma.category,
    "Product": prisma.product,
    "Taxing Scheme": prisma.taxingScheme,
    "Tax Code": prisma.taxCode,
    "Customer": prisma.customer,
  };
  return modelMap[modelType];
};

export async function restoreItem(id: string, modelType: string) {
  try {
    const modelClient = getModelClient(modelType);
    if (!modelClient) throw new Error("Invalid model type");

    // Utilizing your Prisma Extension restore function
    await modelClient.restore(id);
    
    revalidatePath("/dashboard/settings/trash");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to restore item." };
  }
}

export async function permanentDeleteItem(id: string, modelType: string) {
  try {
    const modelClient = getModelClient(modelType);
    if (!modelClient) throw new Error("Invalid model type");

    // Hard delete bypasses the soft-delete extension natively
    await modelClient.delete({ where: { id } });

    revalidatePath("/dashboard/settings/trash");
    return { success: true };
  } catch (error: any) {
    console.error("Critical failure dropping catalog configuration elements:", error);
    return { error: error.message || "Internal Database execution permanently delete error occurred.." };
  }
}
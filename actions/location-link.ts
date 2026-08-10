// app/actions/location-link.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function linkSublocationToLocation(
  sublocationId: string,
  linkedLocationId: string | null,
  currentLocationId: string
) {
  try {
    await prisma.sublocation.update({
      where: { id: sublocationId },
      data: {
        linkedLocationId: linkedLocationId,
      },
    });

    revalidatePath(`/dashboard/locations/${currentLocationId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to link sublocation:", error);
    return { success: false, error: error.message };
  }
}
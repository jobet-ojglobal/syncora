// Example: Next.js API Route or Server Action

import { prisma } from "@/lib/prisma";

export async function createTransferOrder(data: any) {
  const { 
    sourceLocationId, 
    targetLocationId, 
    remarks, 
    requestedById, 
    lines // This comes from your React Hook Form
  } = data;

  // 1. Flatten the lines based on the source allocations
  const prismaLinesToCreate = [];

  for (const line of lines) {
    // If the modal generated multiple bin allocations, split them here
    if (line.sourceAllocations && line.sourceAllocations.length > 0) {
      for (const alloc of line.sourceAllocations) {
        // Skip allocations with 0 quantity just to be safe
        if (Number(alloc.quantity) <= 0) continue;

        prismaLinesToCreate.push({
          productId: line.productId,
          // Convert empty strings to null for Prisma relation
          sourceSublocationId: alloc.sublocationId ? alloc.sublocationId : null, 
          targetSublocationId: line.targetSublocationId ? line.targetSublocationId : null,
          quantity: Number(alloc.quantity),
        });
      }
    } else {
      // Fallback in case a line somehow bypassed the allocation logic
      prismaLinesToCreate.push({
        productId: line.productId,
        sourceSublocationId: line.sourceSublocationId ? line.sourceSublocationId : null,
        targetSublocationId: line.targetSublocationId ? line.targetSublocationId : null,
        quantity: Number(line.quantity),
      });
    }
  }

  // 2. Execute the Prisma creation query
  try {
    const transferOrder = await prisma.transferOrder.create({
      data: {
        transferNumber: `TR-${Date.now()}`, // Replace with your actual numbering logic
        sourceLocationId,
        targetLocationId,
        remarks,
        requestedById,
        status: "DRAFT", // or PENDING based on your business logic
        lines: {
          create: prismaLinesToCreate,
        },
      },
      // Include lines in the response so you can verify the split worked
      include: {
        lines: true,
      },
    });

    return { success: true, data: transferOrder };
  } catch (error) {
    console.error("Failed to create transfer order:", error);
    return { success: false, error: "Failed to create transfer order" };
  }
}
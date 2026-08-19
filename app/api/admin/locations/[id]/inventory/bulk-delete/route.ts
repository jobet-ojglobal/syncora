import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

interface Props {
  params: Promise<{
    id: string;
  }>;
}

const BATCH_SIZE = 500;
const DELAY_MS = 300;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function DELETE(
  request: NextRequest, 
  { params }: Props
) {
  try {
    const { id: locationId } = await params;

    // 1. Verify location exists
    const location = await prisma.location.findUnique({
      where: { inflowId: locationId },
      select: { id: true, inflowId: true, name: true },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload. 'ids' must be a non-empty array of strings." },
        { status: 400 }
      );
    }

    // Validate that all elements in ids are non-empty strings
    const validIds = ids.filter((id): id is string => typeof id === "string" && id.trim() !== "");
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "No valid inventory item IDs provided." },
        { status: 400 }
      );
    }

    // Helper to slice validIds into smaller chunks
    const chunks: string[][] = [];
    for (let i = 0; i < validIds.length; i += BATCH_SIZE) {
      chunks.push(validIds.slice(i, i + BATCH_SIZE));
    }

    let deletedBinItems = 0;
    let deletedInventories = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkIds = chunks[i];

      // 2. Delete targeted InventoryBinItems matching location and payload IDs
      const binItemResult = await prisma.inventoryBinItem.deleteMany({
        where: {
          id: { in: chunkIds },
          locationId: location.inflowId,
        },
      });
      deletedBinItems += binItemResult.count;

      // 3. Delete targeted Inventories matching location and payload IDs
      const inventoryResult = await prisma.inventory.deleteMany({
        where: {
          id: { in: chunkIds },
          locationId: location.inflowId,
        },
      });
      deletedInventories += inventoryResult.count;

      // Delay between batch chunks (skips on the last iteration)
      if (i < chunks.length - 1) {
        await delay(DELAY_MS);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Selected inventory items deleted for location: ${location.name}`,
      stats: {
        deletedBinItems,
        deletedInventories,
      },
    });
  } catch (error) {
    console.error("Failed to delete selected inventory items:", error);
    return NextResponse.json(
      { error: "An error occurred while deleting inventory items." },
      { status: 500 }
    );
  }
}

// export async function DELETE(request: Request, { params }: RouteParams) {
//   try {
//     const { locationId } = await params;

//     if (!locationId) {
//       return NextResponse.json(
//         { error: "Location ID parameter is required" },
//         { status: 400 }
//       );
//     }

//     // Parse and validate request body
//     const body = await request.json().catch(() => null);
//     const { ids } = body || {};

//     if (!Array.isArray(ids) || ids.length === 0) {
//       return NextResponse.json(
//         { error: "Invalid payload. 'ids' must be a non-empty array of strings." },
//         { status: 400 }
//       );
//     }

//     // Validate that all elements in ids are non-empty strings
//     const validIds = ids.filter((id): id is string => typeof id === "string" && id.trim() !== "");
//     if (validIds.length === 0) {
//       return NextResponse.json(
//         { error: "No valid inventory item IDs provided." },
//         { status: 400 }
//       );
//     }

//     // Execute deletion within an atomic transaction
//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Optional: Ensure target items belong to the specified location
//       const matchingCount = await tx.inventory.count({
//         where: {
//           id: { in: validIds },
//           locationId: locationId,
//         },
//       });

//       if (matchingCount === 0) {
//         throw new Error("No matching inventory records found for this location.");
//       }

//       // 2. Delete associated child records (e.g., storage bins) if cascade delete isn't configured in Prisma schema
//       await prisma.inventoryBinItem.deleteMany({
//         where: { id: { in: ids } },
//       });

//       // 3. Delete the inventory stock rows
//       const deleteResult = await prisma.inventory.deleteMany({
//         where: { id: { in: validIds } },
//       });

//       return deleteResult;
//     });

//     return NextResponse.json(
//       {
//         success: true,
//         message: `Successfully deleted ${result.count} inventory record(s).`,
//         deletedCount: result.count,
//       },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     console.error("[BULK_DELETE_INVENTORY_ERROR]", error);

//     return NextResponse.json(
//       {
//         error: error.message || "An unexpected error occurred while deleting inventory records.",
//       },
//       { status: 500 }
//     );
//   }
// }


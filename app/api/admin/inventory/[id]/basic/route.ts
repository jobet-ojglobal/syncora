// app/api/inventory/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust path to your Prisma client instance

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Inventory ID is required." },
        { status: 400 }
      );
    }

    // Fetch single inventory record with relation mappings
    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            inflowId: true,
            name: true,
            sku: true,
            image: true,
            trackSerials: true,
          },
        },
        location: {
          select: {
            id: true,
            inflowId: true,
            name: true,
          },
        },
        preferredSourceLocation: {
          select: {
            id: true,
            inflowId: true,
            name: true,
          },
        },
        bins: {
          include: {
            sublocation: {
              select: {
                id: true,
                name: true,
                locationId: true,
              },
            },
            inventoryBinItems: {
              where: {
                status: "IN_STOCK",
              },
              select: {
                id: true,
                serialNumber: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory record not found." },
        { status: 404 }
      );
    }

    // Convert Prisma Decimals to Numbers for React Hook Form / JSON hydration
    const formattedData = {
      id: inventory.id,
      productId: inventory.productId,
      locationId: inventory.locationId,
      quantityOnHand: Number(inventory.quantityOnHand ?? 0),
      quantityAvailable: Number(inventory.quantityAvailable ?? 0),
      quantityReserved: Number(inventory.quantityReserved ?? 0),
      reorderThreshold: Number(inventory.reorderThreshold ?? 0),
      reorderQuantity: Number(inventory.reorderQuantity ?? 0),
      isAutoReorderEnabled: inventory.isAutoReorderEnabled,
      preferredSourceLocationId: inventory.preferredSourceLocationId,

      // Product & Location Reference Details
      product: inventory.product,
      location: inventory.location,
      preferredSourceLocation: inventory.preferredSourceLocation,

      // Bins Allocation & Sublocation Detail
      bins: inventory.bins.map((bin) => ({
        id: bin.id,
        sublocationId: bin.sublocationId,
        sublocationName: bin.sublocation.name,
        quantity: Number(bin.quantity ?? 0),
        serials: bin.inventoryBinItems.map((item) => ({
          id: item.id,
          serialNumber: item.serialNumber,
          status: item.status,
        })),
      })),

      // Flattened array of all assigned serial numbers in stock
      serials: inventory.bins.flatMap((bin) =>
        bin.inventoryBinItems.map((item) => ({
          id: item.id,
          serialNumber: item.serialNumber,
          binId: bin.id,
          sublocationId: bin.sublocationId,
        }))
      ),

      lastCountedAt: inventory.lastCountedAt,
      lastMovementAt: inventory.lastMovementAt,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };

    return NextResponse.json(formattedData, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory detail:", error);
    return NextResponse.json(
      { error: "Failed to retrieve inventory details." },
      { status: 500 }
    );
  }
}

// // app/api/inventory/[id]/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";


// interface Props {
//   params: Promise<{
//     id: string;
//   }>;
// }

// // =====================================================
// // GET INVENTORY
// // =====================================================

// export async function GET(
//   request: NextRequest,
//   { params }: Props
// ) {
//   try {
//     const { id } =
//       await params;

//     if (!id) {
//       return NextResponse.json(
//         { error: "Inventory ledger record target identifier token is required." },
//         { status: 400 }
//       );
//     }

//     // Query core stock balance record along with active storage bin breakdowns
//     const stockRecord = await prisma.inventory.findUnique({
//       where: { id: id },
//       include: {
//         bins: {
//           select: {
//             id: true,
//             sublocationId: true,
//             quantity: true
//           }
//         }
//       }
//     });

//     if (!stockRecord) {
//       return NextResponse.json(
//         { error: "The targeted inventory position index could not be located inside active ledgers." },
//         { status: 404 }
//       );
//     }

//     // Remap numeric types: Coerce high-precision Decimals to standard Floats for UI form values
//     const formattedInventory = {
//       id: stockRecord.id,
//       productId: stockRecord.productId,
//       locationId: stockRecord.locationId,
//       quantityOnHand: Number(stockRecord.quantityOnHand),
//       quantityAvailable: stockRecord.quantityAvailable ? Number(stockRecord.quantityAvailable) : 0,
//       quantityReserved: stockRecord.quantityReserved ? Number(stockRecord.quantityReserved) : 0,
//       bins: stockRecord.bins.map((bin) => ({
//         id: bin.id,
//         sublocationId: bin.sublocationId,
//         quantity: Number(bin.quantity)
//       }))
//     };

//     return NextResponse.json(formattedInventory, { status: 200 });
//   } catch (error) {
//     console.error("Critical failure pulling target inventory allocation matrix:", error);
//     return NextResponse.json(
//       { error: "Internal Database query execution failure during stock record parsing." },
//       { status: 500 }
//     );
//   }
// }
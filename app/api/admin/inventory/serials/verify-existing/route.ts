import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust path to your Prisma client instance

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, serials } = body;

    // 1. Validation
    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(serials) || serials.length === 0) {
      return NextResponse.json({ existingSerials: [] });
    }

    // 2. Clean & sanitize input candidate serials
    const cleanSerials = Array.from(
      new Set(
        serials
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      )
    );

    if (cleanSerials.length === 0) {
      return NextResponse.json({ existingSerials: [] });
    }

    // 3. Query existing active serials for this product
    // Note: Adjust the status filter depending on your business rules.
    // If ANY serial status means it cannot be re-added, omit the `status` condition.
    const existingItems = await prisma.inventoryBinItem.findMany({
      where: {
        productId: productId,
        serialNumber: {
          in: cleanSerials,
        },
        // Optionally restrict to active inventory states:
        status: {
          in: ["IN_STOCK", "RESERVED"],
        },
      },
      select: {
        serialNumber: true,
      },
    });

    // 4. Extract array of found serial strings
    const existingSerials = existingItems.map((item) => item.serialNumber);

    return NextResponse.json({ existingSerials });
  } catch (error) {
    console.error("[VERIFY_EXISTING_SERIALS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// import { prisma } from "@/lib/prisma";
// import { SerialStatus } from "@/generated/prisma/client";

// interface StockAdjustmentLineInput {
//   productId: string;
//   locationId: string;
//   serials?: string[];
//   bins?: {
//     sublocationId: string; // Map to inventoryBinId
//     quantity: number;
//     serials?: string[];
//   }[];
// }

// /**
//  * Validates array of serial numbers against existing DB entries.
//  * Returns any serial numbers that ALREADY exist in the database.
//  */
// export async function checkExistingSerials(productId: string, serials: string[]) {
//   if (!serials || serials.length === 0) return [];

//   const existing = await prisma.inventoryBinItem.findMany({
//     where: {
//       serialNumber: {
//         in: serials,
//       },
//     },
//     select: {
//       serialNumber: true,
//       status: true,
//     },
//   });

//   return existing;
// }

// /**
//  * Creates new serialized items or re-assigns existing items into inventory bins safely.
//  */
// export async function processStockAdjustmentSerials({
//   productId,
//   locationId,
//   serials = [],
//   bins = [],
// }: StockAdjustmentLineInput) {
//   if (serials.length === 0) return;

//   // 1. Prevent duplicate serials inside the request payload itself
//   const uniquePayloadSerials = Array.from(new Set(serials));
//   if (uniquePayloadSerials.length !== serials.length) {
//     throw new Error("Duplicate serial numbers supplied in request payload.");
//   }

//   // Map out which serial belongs to which bin
//   const serialToBinMap = new Map<string, string>();
//   for (const bin of bins) {
//     if (bin.sublocationId && bin.serials) {
//       for (const sn of bin.serials) {
//         serialToBinMap.set(sn, bin.sublocationId);
//       }
//     }
//   }

//   return await prisma.$transaction(async (tx) => {
//     // 2. Query existing items in DB
//     const existingItems = await tx.inventoryBinItem.findMany({
//       where: {
//         serialNumber: {
//           in: uniquePayloadSerials,
//         },
//       },
//     });

//     const existingMap = new Map(existingItems.map((item) => [item.serialNumber, item]));

//     const createOps: Array<{
//       productId: string;
//       locationId: string;
//       inventoryBinId: string | null;
//       serialNumber: string;
//       status: SerialStatus;
//     }> = [];

//     const updateOps: Array<{
//       id: string;
//       inventoryBinId: string | null;
//       status: SerialStatus;
//     }> = [];

//     for (const sn of uniquePayloadSerials) {
//       const assignedBinId = serialToBinMap.get(sn) || null;
//       const existing = existingMap.get(sn);

//       if (!existing) {
//         // Create new serial item in stock
//         createOps.push({
//           productId,
//           locationId,
//           inventoryBinId: assignedBinId,
//           serialNumber: sn,
//           status: SerialStatus.IN_STOCK,
//         });
//       } else {
//         // Handle existing serial: check logic rules
//         if (existing.productId !== productId) {
//           throw new Error(
//             `Serial "${sn}" is already assigned to a different product.`
//           );
//         }

//         // Update bin location or state if needed
//         updateOps.push({
//           id: existing.id,
//           inventoryBinId: assignedBinId,
//           status: SerialStatus.IN_STOCK,
//         });
//       }
//     }

//     // Execute bulk batch operations
//     if (createOps.length > 0) {
//       await tx.inventoryBinItem.createMany({
//         data: createOps,
//         skipDuplicates: false, // Ensures transaction fails cleanly on unhandled race conditions
//       });
//     }

//     if (updateOps.length > 0) {
//       await Promise.all(
//         updateOps.map((op) =>
//           tx.inventoryBinItem.update({
//             where: { id: op.id },
//             data: {
//               inventoryBinId: op.inventoryBinId,
//               status: op.status,
//             },
//           })
//         )
//       );
//     }
//   });
// }
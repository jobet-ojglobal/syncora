import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust this path to your client instance
import { transferOrderSchema } from "@/schemas/transfer.schema";
import { TransferOrderStatus } from "@/generated/prisma/enums";
import { TransferOrderRow } from "@/types/transfer-dto.type";

/**
 * 📄 FETCH ALL TRANSFER MANIFESTS WITH CONDENSED AGGREGATES
 */
// export async function GET() {
//   try {
//     const orders = await prisma.transferOrder.findMany({
//       include: {
//         sourceLocation: true,
//         targetLocation: true,
//         lines: {
//           include: {
//             product: true,
//             sourceSublocation: true,
//             targetSublocation: true,
//           }
//         }
//       },
//       orderBy: { createdAt: "desc" }
//     });

//     // Map database shape to match your TransferOrderRow UI interface requirements
//     const formattedOrders = orders.map(order => ({
//       id: order.id,
//       transferNumber: order.transferNumber,
//       sourceLocationName: order.sourceLocation.name,
//       targetLocationName: order.targetLocation.name,
//       status: order.status,
//       remarks: order.remarks,
//       linesCount: order.lines.length,
//       transferredAt: order.transferredAt?.toISOString() || null,
//       receivedAt: order.receivedAt?.toISOString() || null,
//       createdAt: order.createdAt.toISOString(),
//       lines: order.lines.map(line => ({
//         id: line.id,
//         productName: line.product.name,
//         productSku: line.product.sku || "N/A",
//         sourceBinName: line.sourceSublocation?.name || "Floor / Bulk Area",
//         targetBinName: line.targetSublocation?.name || "Floor / Bulk Area",
//         quantity: Number(line.quantity)
//       }))
//     }));

//     return NextResponse.json(formattedOrders, { status: 200 });
//   } catch (error) {
//     console.error("Failed fetching transfer manifest indices:", error);
//     return NextResponse.json({ error: "Fulfillment Pipeline sync failure." }, { status: 500 });
//   }
// }

/**
 * 🟢 CREATE FRESH PENDING TRANSFER MASTER LOG ENTRY
 */
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const result = transferOrderSchema.safeParse(body);

//     if (!result.success) {
//       return NextResponse.json({ error: "Validation failure", details: result.error }, { status: 400 });
//     }

//     const { transferNumber, sourceLocationId, targetLocationId, status, remarks, lines } = result.data;

//     const duplicateCheck = await prisma.transferOrder.findUnique({ where: { transferNumber } });
//     if (duplicateCheck) {
//       return NextResponse.json({ error: `Manifest Tracking Sequence ${transferNumber} already exists.` }, { status: 409 });
//     }

//     const newOrder = await prisma.$transaction(async (tx) => {
//       const orderRoot = await tx.transferOrder.create({
//         data: {
//           transferNumber,
//           sourceLocationId,
//           targetLocationId,
//           status: status === "IN_TRANSIT" || status === "RECEIVED" ? "DRAFT" : status, // Force state regression safety
//           remarks,
//         }
//       });

//       await tx.transferOrderLine.createMany({
//         data: lines.map(line => ({
//           transferOrderId: orderRoot.id,
//           productId: line.productId,
//           sourceSublocationId: line.sourceSublocationId || null,
//           targetSublocationId: line.targetSublocationId || null,
//           quantity: line.quantity,
//         }))
//       });

//       return orderRoot;
//     });

//     return NextResponse.json(newOrder, { status: 201 });
//   } catch (error) {
//     console.error("Failed executing transfer initialization:", error);
//     return NextResponse.json({ error: "Internal ledger submission failure." }, { status: 500 });
//   }
// }



// // app/api/admin/transfers/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// api get transferorder (TO) list
export async function GET() {
  try {
    const orders = await prisma.transferOrder.findMany({
      include: {
        sourceLocation: { select: { name: true } },
        targetLocation: { select: { name: true } },
        // If you have user relations defined in your schema, un-comment these:
        // requestedBy: { select: { name: true } },
        // approvedBy: { select: { name: true } },
        // receivedBy: { select: { name: true } },
        lines: {
          include: {
            product: { select: { name: true, sku: true } },
            sourceSublocation: { select: { name: true } },
            targetSublocation: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const parsedOrders: TransferOrderRow[] = orders.map((order) => ({
      id: order.id,
      transferNumber: order.transferNumber,
      sourceLocationId: order.sourceLocationId,
      sourceLocationName: order.sourceLocation?.name ?? "N/A",
      targetLocationId: order.targetLocationId,
      targetLocationName: order.targetLocation?.name ?? "N/A",
      status: order.status as TransferOrderRow["status"],
      remarks: order.remarks ?? null,
      createdAt: order.createdAt.toISOString(),
      transferredAt: order.transferredAt ? order.transferredAt.toISOString() : null,
      receivedAt: order.receivedAt ? order.receivedAt.toISOString() : null,
      // Maps to requestedById since schema uses requestedById instead of createdById
      createdByName: (order as Record<string, any>).requestedBy?.name ?? null,
      approvedByName: (order as Record<string, any>).approvedBy?.name ?? null,
      receivedByName: (order as Record<string, any>).receivedBy?.name ?? null,
      lines: order.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name ?? "Unknown Product",
        productSku: l.product?.sku ?? "N/A",
        quantity: Number(l.quantity),
        quantityReceived:
          l.quantityReceived !== null && l.quantityReceived !== undefined
            ? Number(l.quantityReceived)
            : null,
        discrepancyQuantity:
          l.discrepancyQuantity !== null && l.discrepancyQuantity !== undefined
            ? Number(l.discrepancyQuantity)
            : null,
        discrepancyReason: l.discrepancyReason ?? null,
        sourceSublocationId: l.sourceSublocationId ?? null,
        sourceSublocationName: l.sourceSublocation?.name ?? null,
        targetSublocationId: l.targetSublocationId ?? null,
        targetSublocationName: l.targetSublocation?.name ?? null,
      })),
    }));

    return NextResponse.json(parsedOrders, { status: 200 });
  } catch (error) {
    console.error("Master transfer orders query failure:", error);
    return NextResponse.json(
      { error: "Internal Database query transaction processing error." },
      { status: 500 }
    );
  }
}

// Helper function to generate custom transfer order sequential IDs (e.g., TO-10001)
async function generateTransferNumber(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) {
  const count = await tx.transferOrder.count();
  const nextNum = (count + 1).toString().padStart(5, "0");
  return `TO-${nextNum}`;
}

// ==========================================
// 1. POST: Create New Transfer Order
// ==========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate payload against schema
    const validationResult = transferOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // TODO: Replace with authenticated user ID from your session context
    const currentUserId = "USER_SYSTEM_SESSION_ID";

    // Run creation inside an isolated transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check stock availability for all source lines
      for (const line of data.lines) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: data.sourceLocationId,
            },
          },
        });

        const available = inventory?.quantityAvailable?.toNumber() ?? 0;
        if (!inventory || available < line.quantity) {
          throw new Error(
            `Insufficient available stock for product ${line.productId} at source location. Available: ${available}, Required: ${line.quantity}`
          );
        }
      }

      // 2. Generate new Transfer Number
      const transferNumber = await generateTransferNumber(tx);

      // 3. Create Transfer Order header and nested line items
      const newTransferOrder = await tx.transferOrder.create({
        data: {
          transferNumber,
          sourceLocationId: data.sourceLocationId,
          targetLocationId: data.targetLocationId,
          status: data.status as TransferOrderStatus,
          remarks: data.remarks,
          requestedById: currentUserId,
          lines: {
            create: data.lines.map((line) => ({
              productId: line.productId,
              sourceSublocationId: line.sourceSublocationId,
              targetSublocationId: line.targetSublocationId,
              quantity: line.quantity,
              quantityReceived: 0,
            })),
          },
        },
        include: {
          lines: true,
        },
      });

      return newTransferOrder;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error("[TRANSFER_ORDER_POST_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create transfer order." },
      { status: 500 }
    );
  }
}

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const {
//       sourceLocationId,
//       targetLocationId,
//       remarks,
//       requestedById = "SM North" ,
//       lines,
//     } = body; 

//     // 1. Basic Validation
//     if (!sourceLocationId || !targetLocationId || !requestedById || !lines || !Array.isArray(lines)) {
//       return NextResponse.json(
//         { error: "Missing required fields or invalid lines data." },
//         { status: 400 }
//       );
//     }

//     // 2. Flatten the lines based on sourceAllocations
//     const prismaLinesToCreate = [];

//     for (const line of lines) {
//       // If the UI generated multi-bin allocations, split them into separate lines
//       if (line.sourceAllocations && line.sourceAllocations.length > 0) {
//         for (const alloc of line.sourceAllocations) {
//           // Skip any 0 quantity allocations
//           if (Number(alloc.quantity) <= 0) continue;

//           prismaLinesToCreate.push({
//             productId: line.productId,
//             // Prisma expects null instead of an empty string for optional relations
//             sourceSublocationId: alloc.sublocationId || null,
//             targetSublocationId: line.targetSublocationId || null,
//             quantity: Number(alloc.quantity),
//           });
//         }
//       } else {
//         // Fallback in case a line lacks the sourceAllocations array
//         if (Number(line.quantity) > 0) {
//           prismaLinesToCreate.push({
//             productId: line.productId,
//             sourceSublocationId: line.sourceSublocationId || null,
//             targetSublocationId: line.targetSublocationId || null,
//             quantity: Number(line.quantity),
//           });
//         }
//       }
//     }

//     // Ensure we actually have lines to create after flattening
//     if (prismaLinesToCreate.length === 0) {
//       return NextResponse.json(
//         { error: "Transfer order must contain at least one valid product line with a quantity greater than zero." },
//         { status: 400 }
//       );
//     }

//     // Generate a unique transfer number (you can replace this with your own sequence logic)
//     const transferNumber = `TR-${Date.now()}`;

//     // 3. Save to database
//     // Prisma handles this as a single transaction automatically when using nested writes (lines: { create: ... })
//     const transferOrder = await prisma.transferOrder.create({
//       data: {
//         transferNumber,
//         sourceLocationId,
//         targetLocationId,
//         remarks,
//         requestedById,
//         status: "DRAFT",
//         lines: {
//           create: prismaLinesToCreate,
//         },
//       },
//       include: {
//         // Return the nested lines so the frontend can verify the split was successful
//         lines: {
//           include: {
//             sourceSublocation: true,
//             targetSublocation: true,
//           }
//         },
//       },
//     });

//     return NextResponse.json({ success: true, data: transferOrder }, { status: 201 });
//   } catch (error) {
//     console.error("[TRANSFER_ORDER_POST]", error);
//     return NextResponse.json(
//       { error: "Failed to create transfer order. Please try again." },
//       { status: 500 }
//     );
//   }
// }


// export async function PATCH(
//   req: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const body = await req.json();
//     const {
//       sourceLocationId,
//       targetLocationId,
//       remarks,
//       lines,
//     } = body;

//     const transferOrderId = params.id;

//     // 1. Flatten lines based on sourceAllocations matrix logic
//     const prismaLinesToCreate = [];

//     for (const line of lines) {
//       if (line.sourceAllocations && line.sourceAllocations.length > 0) {
//         for (const alloc of line.sourceAllocations) {
//           if (Number(alloc.quantity) <= 0) continue;

//           prismaLinesToCreate.push({
//             productId: line.productId,
//             sourceSublocationId: alloc.sublocationId || null,
//             targetSublocationId: line.targetSublocationId || null,
//             quantity: Number(alloc.quantity),
//           });
//         }
//       } else {
//         if (Number(line.quantity) > 0) {
//           prismaLinesToCreate.push({
//             productId: line.productId,
//             sourceSublocationId: line.sourceSublocationId || null,
//             targetSublocationId: line.targetSublocationId || null,
//             quantity: Number(line.quantity),
//           });
//         }
//       }
//     }

//     if (prismaLinesToCreate.length === 0) {
//       return NextResponse.json(
//         { error: "Transfer order must contain at least one line with a positive quantity." },
//         { status: 400 }
//       );
//     }

//     // 2. Perform transaction: Delete old lines, update header details, and create new flattened lines
//     const updatedOrder = await prisma.$transaction(async (tx) => {
//       // Remove existing lines to cleanly replace multi-bin allocations
//       await tx.transferOrderLine.deleteMany({
//         where: { transferOrderId },
//       });

//       // Update order and insert the fresh set of split lines
//       return await tx.transferOrder.update({
//         where: { id: transferOrderId },
//         data: {
//           sourceLocationId,
//           targetLocationId,
//           remarks,
//           lines: {
//             create: prismaLinesToCreate,
//           },
//         },
//         include: {
//           lines: {
//             include: {
//               sourceSublocation: true,
//               targetSublocation: true,
//             },
//           },
//         },
//       });
//     });

//     return NextResponse.json({ success: true, data: updatedOrder }, { status: 200 });
//   } catch (error) {
//     console.error("[TRANSFER_ORDER_PATCH]", error);
//     return NextResponse.json(
//       { error: "Failed to update transfer order." },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { transferNumber, sourceLocationId, targetLocationId, status, remarks, lines } = body;

//     if (!transferNumber?.trim() || !sourceLocationId || !targetLocationId) {
//       return NextResponse.json({ error: "Missing required core delivery identifier indices parameters." }, { status: 400 });
//     }

//     // Verify system identifier collision constraints safety
//     const uniqueCollision = await prisma.transferOrder.findUnique({ where: { transferNumber } });
//     if (uniqueCollision) {
//       return NextResponse.json({ error: `A Transfer routing manifest numbered "${transferNumber}" already exists.` }, { status: 409 });
//     }

//     const postedTransferOrder = await prisma.$transaction(async (tx) => {
//       // Step A: Formulate the primary root transfer record sheet node
//       const orderRoot = await tx.transferOrder.create({
//         data: {
//           transferNumber: transferNumber.trim(),
//           sourceLocationId,
//           targetLocationId,
//           status,
//           remarks: remarks?.trim() || null,
//           transferredAt: status === "IN_TRANSIT" || status === "RECEIVED" ? new Date() : null,
//           receivedAt: status === "RECEIVED" ? new Date() : null,
//           lines: {
//             create: lines.map((l: any) => ({
//               productId: l.productId,
//               sourceSublocationId: l.sourceSublocationId || null,
//               targetSublocationId: l.targetSublocationId || null,
//               quantity: l.quantity,
//             }))
//           }
//         },
//         include: { lines: true }
//       });

//       // Step B: IF marked directly as RECEIVED, automatically adjust physical warehouse quantities safely
//       if (status === "RECEIVED") {
//         for (const line of orderRoot.lines) {
          
//           // 1. Deduct stock balance allocations from the Source Location node
//           await tx.inventory.update({
//             where: {
//               productId_locationId: { productId: line.productId, locationId: sourceLocationId }
//             },
//             data: {
//               quantityOnHand: { decrement: line.quantity },
//               quantityAvailable: { decrement: line.quantity }
//             }
//           });

//           if (line.sourceSublocationId) {
//             await tx.inventoryBin.update({
//               where: { productId_sublocationId: { productId: line.productId, sublocationId: line.sourceSublocationId } },
//               data: { quantity: { decrement: line.quantity } }
//             });
//           }

//           // 2. Increment stock balance parameters down at the Target Location hub node
//           await tx.inventory.upsert({
//             where: {
//               productId_locationId: { productId: line.productId, locationId: targetLocationId }
//             },
//             update: {
//               quantityOnHand: { increment: line.quantity },
//               quantityAvailable: { increment: line.quantity }
//             },
//             create: {
//               productId: line.productId,
//               locationId: targetLocationId,
//               quantityOnHand: line.quantity,
//               quantityAvailable: line.quantity,
//               quantityReserved: 0
//             }
//           });

//           if (line.targetSublocationId) {
//             await tx.inventoryBin.upsert({
//               where: { productId_sublocationId: { productId: line.productId, sublocationId: line.targetSublocationId } },
//               update: { quantity: { increment: line.quantity } },
//               create: {
//                 inventoryId: (await tx.inventory.findFirst({ where: { productId: line.productId, locationId: targetLocationId } }))!.id,
//                 productId: line.productId,
//                 sublocationId: line.targetSublocationId,
//                 quantity: line.quantity
//               }
//             });
//           }

//         }
//       }

//       return orderRoot;
//     });

//     return NextResponse.json(postedTransferOrder, { status: 201 });
//   } catch (error: any) {
//     console.error("Consignment transaction process crashed:", error);
//     return NextResponse.json({ error: "Internal Database execution pipeline transaction aborted exception." }, { status: 500 });
//   }
// }

// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { id, status, remarks } = body;

//     if (!id) {
//       return NextResponse.json({ error: "Missing required core identifying target key parameter pointer." }, { status: 400 });
//     }

//     // Capture the historical workflow transition state pattern to avoid double processing updates
//     const currentOrder = await prisma.transferOrder.findUnique({
//       where: { id },
//       include: { lines: true }
//     });

//     if (!currentOrder) {
//       return NextResponse.json({ error: "Target order manifest data sheet could not be located." }, { status: 404 });
//     }

//     if (currentOrder.status === "RECEIVED") {
//       return NextResponse.json({ error: "Locked Consignment manifest dataset. Received stocks are immutable metrics points." }, { status: 422 });
//     }

//     const modifiedOrder = await prisma.$transaction(async (tx) => {
      
//       const order = await tx.transferOrder.update({
//         where: { id },
//         data: {
//           status,
//           remarks: remarks?.trim() || null,
//           transferredAt: (status === "IN_TRANSIT" || status === "RECEIVED") && !currentOrder.transferredAt ? new Date() : currentOrder.transferredAt,
//           receivedAt: status === "RECEIVED" ? new Date() : null
//         },
//         include: { lines: true }
//       });

//       // If transitioning to RECEIVED during update, process stock shifts instantly
//       if (status === "RECEIVED" && currentOrder.status !== "RECEIVED") {
//         for (const line of order.lines) {
          
//           await tx.inventory.update({
//             where: { productId_locationId: { productId: line.productId, locationId: currentOrder.sourceLocationId } },
//             data: {
//               quantityOnHand: { decrement: line.quantity },
//               quantityAvailable: { decrement: line.quantity }
//             }
//           });

//           if (line.sourceSublocationId) {
//             await tx.inventoryBin.update({
//               where: { productId_sublocationId: { productId: line.productId, sublocationId: line.sourceSublocationId } },
//               data: { quantity: { decrement: line.quantity } }
//             });
//           }

//           await tx.inventory.upsert({
//             where: { productId_locationId: { productId: line.productId, locationId: currentOrder.targetLocationId } },
//             update: {
//               quantityOnHand: { increment: line.quantity },
//               quantityAvailable: { increment: line.quantity }
//             },
//             create: {
//               productId: line.productId,
//               locationId: currentOrder.targetLocationId,
//               quantityOnHand: line.quantity,
//               quantityAvailable: line.quantity,
//               quantityReserved: 0
//             }
//           });

//           if (line.targetSublocationId) {
//             await tx.inventoryBin.upsert({
//               where: { productId_sublocationId: { productId: line.productId, sublocationId: line.targetSublocationId } },
//               update: { quantity: { increment: line.quantity } },
//               create: {
//                 inventoryId: (await tx.inventory.findFirst({ where: { productId: line.productId, locationId: currentOrder.targetLocationId } }))!.id,
//                 productId: line.productId,
//                 sublocationId: line.targetSublocationId,
//                 quantity: line.quantity
//               }
//             });
//           }
//         }
//       }

//       return order;
//     });

//     return NextResponse.json(modifiedOrder, { status: 200 });
//   } catch (error: any) {
//     console.error("Consignment update processing exception layer crashed:", error);
//     return NextResponse.json({ error: "Internal Database modification transaction processing failure." }, { status: 500 });
//   }
// }
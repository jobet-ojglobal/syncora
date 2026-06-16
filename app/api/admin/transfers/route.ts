import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust this path to your client instance
import { transferOrderSchema } from "@/schemas/transfer.schema";

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

export async function GET() {
  try {
    const orders = await prisma.transferOrder.findMany({
      include: {
        sourceLocation: { select: { name: true } },
        targetLocation: { select: { name: true } },
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

    const parsedOrders = orders.map((order) => ({
      id: order.id,
      transferNumber: order.transferNumber,
      sourceLocationName: order.sourceLocation.name,
      targetLocationName: order.targetLocation.name,
      status: order.status,
      remarks: order.remarks,
      linesCount: order.lines.length,
      transferredAt: order.transferredAt ? order.transferredAt.toISOString() : null,
      receivedAt: order.receivedAt ? order.receivedAt.toISOString() : null,
      createdAt: order.createdAt.toISOString(),
      // Format lines inner sub-payload for the expander view panel
      lines: order.lines.map((l) => ({
        id: l.id,
        productName: l.product.name,
        productSku: l.product.sku || "N/A",
        sourceBinName: l.sourceSublocation?.name || "Bulk Floor",
        targetBinName: l.targetSublocation?.name || "Bulk Floor",
        quantity: Number(l.quantity),
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
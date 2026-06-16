import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust this path to your client instance

/**
 * 🟡 STATE ENGINE MODIFICATIONS & LEDGER LEDGER ADJUSTMENTS
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status: targetStatus, remarks } = body;

    if (!id) return NextResponse.json({ error: "Missing transfer order reference id token." }, { status: 400 });

    // Acquire current state under exclusive lookup parameters
    const currentOrder = await prisma.transferOrder.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!currentOrder) return NextResponse.json({ error: "Target transfer order manifest was not found." }, { status: 404 });
    
    const oldStatus = currentOrder.status;

    // Guard Constraint: Block changes to terminal conditions
    if (oldStatus === "RECEIVED" || oldStatus === "CANCELLED") {
      return NextResponse.json({ error: "Locked Manifest: Completed or voided shipments cannot be modified." }, { status: 422 });
    }

    // Short circuit if only modifying text fields without shifting state positions
    if (oldStatus === targetStatus) {
      const updatedRemarks = await prisma.transferOrder.update({
        where: { id },
        data: { remarks }
      });
      return NextResponse.json(updatedRemarks, { status: 200 });
    }

    // Execute state adjustments transaction
    const processingResult = await prisma.$transaction(async (tx) => {

      // SCENARIO 1: DISPATCH MANIFEST (DRAFT/PENDING -> IN_TRANSIT)
      if (targetStatus === "IN_TRANSIT" && (oldStatus === "DRAFT" || oldStatus === "PENDING")) {
        for (const line of currentOrder.lines) {
          const qty = Number(line.quantity);

          // A: Decrement stock from master base row location entry
          const sourceInv = await tx.inventory.findUnique({
            where: { productId_locationId: { productId: line.productId, locationId: currentOrder.sourceLocationId } }
          });

          if (!sourceInv || Number(sourceInv.quantityAvailable) < qty) {
            throw new Error(`Inssuficient Stock: Missing item units for SKU reference token ${line.productId} at origin site.`);
          }

          await tx.inventory.update({
            where: { id: sourceInv.id },
            data: {
              quantityOnHand: { decrement: qty },
              quantityAvailable: { decrement: qty }
            }
          });

          // B: Decrement stock from exact source bin if mapped
          if (line.sourceSublocationId) {
            const sourceBin = await tx.inventoryBin.findFirst({
              where: { 
                productId: line.productId, 
                sublocationId: line.sourceSublocationId,
                inventoryId: sourceInv.id
              }
            });

            if (!sourceBin || Number(sourceBin.quantity) < qty) {
              throw new Error(`Insufficient Sublocation Volume inside selected bin node.`);
            }

            await tx.inventoryBin.update({
              where: { id: sourceBin.id },
              data: { quantity: { decrement: qty } }
            });
          }
        }

        return await tx.transferOrder.update({
          where: { id },
          data: { status: "IN_TRANSIT", remarks, transferredAt: new Date() }
        });
      }

      // SCENARIO 2: ARRIVAL RECEIPTS SUCCESS (IN_TRANSIT -> RECEIVED)
      if (targetStatus === "RECEIVED" && oldStatus === "IN_TRANSIT") {
        for (const line of currentOrder.lines) {
          const qty = Number(line.quantity);

          // A: Upsert Master Inventory root node target layout block
          let targetInv = await tx.inventory.findUnique({
            where: { productId_locationId: { productId: line.productId, locationId: currentOrder.targetLocationId } }
          });

          if (!targetInv) {
            targetInv = await tx.inventory.create({
              data: {
                productId: line.productId,
                locationId: currentOrder.targetLocationId,
                quantityOnHand: qty,
                quantityAvailable: qty,
                quantityReserved: 0
              }
            });
          } else {
            await tx.inventory.update({
              where: { id: targetInv.id },
              data: {
                quantityOnHand: { increment: qty },
                quantityAvailable: { increment: qty }
              }
            });
          }

          // B: Upsert targeted Sublocation inner bin tracking rows
          if (line.targetSublocationId) {
            const targetBin = await tx.inventoryBin.findFirst({
              where: {
                inventoryId: targetInv.id,
                productId: line.productId,
                sublocationId: line.targetSublocationId
              }
            });

            if (!targetBin) {
              await tx.inventoryBin.create({
                data: {
                  inventoryId: targetInv.id,
                  productId: line.productId,
                  sublocationId: line.targetSublocationId,
                  quantity: qty
                }
              });
            } else {
              await tx.inventoryBin.update({
                where: { id: targetBin.id },
                data: { quantity: { increment: qty } }
              });
            }
          }
        }

        return await tx.transferOrder.update({
          where: { id },
          data: { status: "RECEIVED", remarks, receivedAt: new Date() }
        });
      }

      // SCENARIO 3: SHIPPED CANCELATION REVERSION RECOVERY (IN_TRANSIT -> CANCELLED)
      if (targetStatus === "CANCELLED" && oldStatus === "IN_TRANSIT") {
        for (const line of currentOrder.lines) {
          const qty = Number(line.quantity);

          // Put stock back into original root location layout profile
          await tx.inventory.update({
            where: { productId_locationId: { productId: line.productId, locationId: currentOrder.sourceLocationId } },
            data: {
              quantityOnHand: { increment: qty },
              quantityAvailable: { increment: qty }
            }
          });

          // Put stock back into specific source sublocation bin mapping node
          if (line.sourceSublocationId) {
            const matchingInvRoot = await tx.inventory.findUnique({
              where: { productId_locationId: { productId: line.productId, locationId: currentOrder.sourceLocationId } }
            });

            const sourceBin = await tx.inventoryBin.findFirst({
              where: {
                inventoryId: matchingInvRoot?.id,
                productId: line.productId,
                sublocationId: line.sourceSublocationId
              }
            });

            if (sourceBin) {
              await tx.inventoryBin.update({
                where: { id: sourceBin.id },
                data: { quantity: { increment: qty } }
              });
            }
          }
        }

        return await tx.transferOrder.update({
          where: { id },
          data: { status: "CANCELLED", remarks }
        });
      }

      // SCENARIO 4: STANDARD FALLBACK FOR EARLY STAGE VOIDS (DRAFT/PENDING -> CANCELLED)
      if (targetStatus === "CANCELLED" && (oldStatus === "DRAFT" || oldStatus === "PENDING")) {
        return await tx.transferOrder.update({
          where: { id },
          data: { status: "CANCELLED", remarks }
        });
      }

      throw new Error(`Invalid state movement exception pathway from ${oldStatus} to ${targetStatus}`);
    });

    return NextResponse.json(processingResult, { status: 200 });
  } catch (error: any) {
    console.error("State Processing Transaction Exception:", error);
    return NextResponse.json({ error: error.message || "State processing pipeline breakdown encountered." }, { status: 500 });
  }
}
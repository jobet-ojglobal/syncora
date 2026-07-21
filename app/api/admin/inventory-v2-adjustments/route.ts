import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inventoryAdjustmentSchema } from "@/schemas/inventory-v2.schema";

// POST: Register stock adjustments, update inventory balances, and generate ledgers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = inventoryAdjustmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create main Adjustment header
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          adjustmentNumber: data.adjustmentNumber,
          reason: data.reason,
          notes: data.notes,
          performedById: data.performedById,
          status: data.status,
          lines: {
            create: data.lines.map((line) => ({
              productId: line.productId,
              locationId: line.locationId,
              sublocationId: line.sublocationId || null,
              quantityBefore: line.quantityBefore,
              quantityAdjusted: line.quantityAdjusted,
              quantityAfter: line.quantityAfter,
              reason: line.reason,
            })),
          },
        },
        include: { lines: true },
      });

      // 2. Process stock adjustments & ledger entries if status is POSTED
      if (data.status === "POSTED") {
        for (const line of data.lines) {
          // Upsert master inventory level balance
          const inventory = await tx.inventory.upsert({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: line.locationId,
              },
            },
            create: {
              productId: line.productId,
              locationId: line.locationId,
              quantityOnHand: line.quantityAfter,
              quantityAvailable: line.quantityAfter,
              lastMovementAt: new Date(),
            },
            update: {
              quantityOnHand: { increment: line.quantityAdjusted },
              quantityAvailable: { increment: line.quantityAdjusted },
              lastMovementAt: new Date(),
            },
          });

          // Update bin quantity if sublocation is specified
          if (line.sublocationId) {
            const existingBin = await tx.inventoryBin.findFirst({
              where: {
                inventoryId: inventory.id,
                sublocationId: line.sublocationId,
              },
            });

            if (existingBin) {
              await tx.inventoryBin.update({
                where: { id: existingBin.id },
                data: { quantity: { increment: line.quantityAdjusted } },
              });
            } else {
              await tx.inventoryBin.create({
                data: {
                  inventoryId: inventory.id,
                  sublocationId: line.sublocationId,
                  quantity: line.quantityAdjusted,
                },
              });
            }
          }

          // Write append-only transaction entry into InventoryLedger
          await tx.inventoryLedger.create({
            data: {
              productId: line.productId,
              locationId: line.locationId,
              sublocationId: line.sublocationId || null,
              transactionType: "ADJUSTMENT",
              referenceType: "ADJUSTMENT",
              referenceId: adjustment.id,
              performedById: data.performedById,
              quantityBefore: line.quantityBefore,
              quantityChange: line.quantityAdjusted,
              quantityAfter: line.quantityAfter,
              remarks: `${data.reason}: ${data.notes || "Stock adjustment"}`,
            },
          });
        }
      }

      return adjustment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[POST_INVENTORY_ADJUSTMENT_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to process stock adjustment." },
      { status: 500 }
    );
  }
}

// PATCH: Update an existing adjustment record or change status to POSTED
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = inventoryAdjustmentSchema.safeParse(body);

    if (!validation.success || !body.id) {
      return NextResponse.json(
        { error: "Validation failed or missing adjustment document ID." },
        { status: 400 }
      );
    }

    const data = validation.data;
    const adjustmentId = body.id;

    const result = await prisma.$transaction(async (tx) => {
      const existingDoc = await tx.inventoryAdjustment.findUnique({
        where: { id: adjustmentId },
      });

      if (!existingDoc) {
        throw new Error("Adjustment document not found.");
      }

      if (existingDoc.status === "POSTED") {
        throw new Error("Posted stock adjustments are immutable and cannot be modified.");
      }

      // Re-create lines
      await tx.inventoryAdjustmentLine.deleteMany({
        where: { adjustmentId },
      });

      const updatedDoc = await tx.inventoryAdjustment.update({
        where: { id: adjustmentId },
        data: {
          reason: data.reason,
          notes: data.notes,
          performedById: data.performedById,
          status: data.status,
          lines: {
            create: data.lines.map((line) => ({
              productId: line.productId,
              locationId: line.locationId,
              sublocationId: line.sublocationId || null,
              quantityBefore: line.quantityBefore,
              quantityAdjusted: line.quantityAdjusted,
              quantityAfter: line.quantityAfter,
              reason: line.reason,
            })),
          },
        },
        include: { lines: true },
      });

      // Apply changes if transitioning to POSTED status
      if (data.status === "POSTED") {
        for (const line of data.lines) {
          const inventory = await tx.inventory.upsert({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: line.locationId,
              },
            },
            create: {
              productId: line.productId,
              locationId: line.locationId,
              quantityOnHand: line.quantityAfter,
              quantityAvailable: line.quantityAfter,
              lastMovementAt: new Date(),
            },
            update: {
              quantityOnHand: { increment: line.quantityAdjusted },
              quantityAvailable: { increment: line.quantityAdjusted },
              lastMovementAt: new Date(),
            },
          });

          await tx.inventoryLedger.create({
            data: {
              productId: line.productId,
              locationId: line.locationId,
              sublocationId: line.sublocationId || null,
              transactionType: "ADJUSTMENT",
              referenceType: "ADJUSTMENT",
              referenceId: updatedDoc.id,
              performedById: data.performedById,
              quantityBefore: line.quantityBefore,
              quantityChange: line.quantityAdjusted,
              quantityAfter: line.quantityAfter,
              remarks: `${data.reason}: ${data.notes || "Stock adjustment posted"}`,
            },
          });
        }
      }

      return updatedDoc;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[PATCH_INVENTORY_ADJUSTMENT_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update stock adjustment." },
      { status: 500 }
    );
  }
}
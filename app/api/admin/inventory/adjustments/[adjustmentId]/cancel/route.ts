// app/api/inventory/adjustments/[id]/cancel/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/client";

const BATCH_SIZE = 100;
const DELAY_MS = 300;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(
  req: Request,
  { params }: { params: Promise<{ adjustmentId: string }> }
) {
  try {
    const { adjustmentId } = await params;

    if (!adjustmentId) {
      return NextResponse.json(
        { error: "Adjustment ID is required" },
        { status: 400 }
      );
    }

    const { performedById, remarks } = await req.json();

    if (!performedById) {
      return NextResponse.json(
        { error: "performedById is required." },
        { status: 400 }
      );
    }

    // 1. Initial validation and Reversal Adjustment creation
    const { originalAdjustment, cancellationAdjustment } = await prisma.$transaction(
      async (tx) => {
        const original = await tx.inventoryAdjustment.findUnique({
          where: { id: adjustmentId },
          include: {
            lines: {
              include: {
                serials: true,
                draftBins: true,
              },
            },
          },
        });

        if (!original) {
          throw new Error("Original adjustment not found.");
        }

        if (original.status !== "POSTED") {
          throw new Error(
            `Only POSTED adjustments can be cancelled. Current status: ${original.status}`
          );
        }

        // Mark original adjustment as VOIDED
        // await tx.inventoryAdjustment.update({
        //   where: { id: adjustmentId },
        //   data: {
        //     status: "VOIDED",
        //     lastModifiedById: performedById,
        //   },
        // });
        await tx.inventoryAdjustment.update({
          where: { id: adjustmentId },
          data: {
            status: "REVERTED",
            lastModifiedById: performedById,
          },
        });

        // Create the top-level reversing InventoryAdjustment
        const cancelInflowId = `CANCEL-${original.inflowId}`;
        const cancelAdjustmentNumber = `${original.adjustmentNumber}-REV`;

        const cancellation = await tx.inventoryAdjustment.create({
          data: {
            inflowId: cancelInflowId,
            adjustmentNumber: cancelAdjustmentNumber,
            adjustmentReasonId: original.adjustmentReasonId,
            remarks:
              remarks || `Reversal of adjustment #${original.adjustmentNumber}`,
            performedById,
            status: "POSTED",
          },
        });

        return { originalAdjustment: original, cancellationAdjustment: cancellation };
      }
    );

    // 2. Chunk lines into batches of BATCH_SIZE
    const lines = originalAdjustment.lines;
    const lineBatches: (typeof lines)[] = [];

    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      lineBatches.push(lines.slice(i, i + BATCH_SIZE));
    }

    // 3. Process batches sequentially with a delay between each batch
    for (let i = 0; i < lineBatches.length; i++) {
      const batch = lineBatches[i];

      await prisma.$transaction(async (tx) => {
        for (const line of batch) {
          const originalQty = new Decimal(line.quantityAdjusted);
          const invertedQty = originalQty.negated(); // Reverse (+) to (-) or (-) to (+)

          // Retrieve current master stock state
          const inventory = await tx.inventory.findUnique({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: line.locationId,
              },
            },
          });

          const currentOnHand = inventory?.quantityOnHand ?? new Decimal(0);
          const newOnHand = currentOnHand.add(invertedQty);

          if (newOnHand.isNegative()) {
            throw new Error(
              `Cannot revert line: Reversing this quantity causes negative stock for product ${line.productId}.`
            );
          }

          // Update master Inventory record
          await tx.inventory.update({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: line.locationId,
              },
            },
            data: {
              quantityOnHand: newOnHand,
              quantityAvailable: inventory?.quantityAvailable
                ? inventory.quantityAvailable.add(invertedQty)
                : newOnHand,
              lastMovementAt: new Date(),
            },
          });

          // Create Reversing Line
          const cancelLine = await tx.inventoryAdjustmentLine.create({
            data: {
              inflowId: `LINE-REV-${line.inflowId}`,
              adjustmentId: cancellationAdjustment.inflowId,
              productId: line.productId,
              locationId: line.locationId,
              inventoryBinId: line.inventoryBinId,
              quantityBefore: currentOnHand,
              quantityAdjusted: invertedQty,
              quantityAfter: newOnHand,
              reason: "CORRECTION",
              description: `Reversal line for ${line.inflowId}`,
            },
          });

          // Handle Bin-level changes (draftBins)
          for (const draftBin of line.draftBins) {
            const invertedBinQty = new Decimal(draftBin.quantity).negated();

            const inventoryBin = await tx.inventoryBin.findFirst({
              where: {
                inventory: {
                  productId: line.productId,
                  locationId: line.locationId,
                },
                sublocationId: draftBin.sublocationId,
              },
            });

            if (inventoryBin) {
              await tx.inventoryBin.update({
                where: { id: inventoryBin.id },
                data: { quantity: inventoryBin.quantity.add(invertedBinQty) },
              });
            }
          }

          // Handle Serial Numbers reversal
          for (const serial of line.serials) {
            const serialItem = await tx.inventoryBinItem.findUnique({
              where: { serialNumber: serial.serialNumber },
            });

            let newAction = serial.action;
            if (serial.action === "ADD") {
              newAction = "REMOVE";
              if (serialItem) {
                await tx.inventoryBinItem.update({
                  where: { id: serialItem.id },
                  data: { status: "DAMAGED" },
                });
              }
            } else if (serial.action === "REMOVE") {
              newAction = "ADD";
              if (serialItem) {
                await tx.inventoryBinItem.update({
                  where: { id: serialItem.id },
                  data: { status: "IN_STOCK" },
                });
              }
            }

            await tx.inventoryAdjustmentSerial.create({
              data: {
                adjustmentLineId: cancelLine.id,
                serialNumber: serial.serialNumber,
                action: newAction,
                inventoryBinItemId: serial.inventoryBinItemId,
                fromInventoryBinId: serial.toInventoryBinId,
                toInventoryBinId: serial.fromInventoryBinId,
              },
            });
          }

          // Append Reversing InventoryLedger record
          await tx.inventoryLedger.create({
            data: {
              productId: line.productId,
              locationId: line.locationId,
              transactionType: "ADJUSTMENT",
              referenceType: "ADJUSTMENT",
              referenceId: cancellationAdjustment.adjustmentNumber,
              performedById,
              quantityChange: invertedQty,
              quantityBefore: currentOnHand,
              quantityAfter: newOnHand,
              remarks: `Cancelled adjustment #${originalAdjustment.adjustmentNumber}`,
            },
          });
        }
      });

      // Pause briefly between processing batches if not on the final batch
      if (i < lineBatches.length - 1) {
        await delay(DELAY_MS);
      }
    }

    return NextResponse.json({
      message: "Adjustment successfully reversed in batches.",
      reversalAdjustment: cancellationAdjustment,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

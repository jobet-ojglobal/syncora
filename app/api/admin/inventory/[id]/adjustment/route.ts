import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Replace with your exact Prisma client path
import { AdjustmentReason, InventoryTransactionType } from "@/generated/prisma/enums";

// Helper function to generate a unique tracking code (e.g., ADJ-20260616-XYZW)
function generateAdjustmentNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ADJ-${dateStr}-${randomSuffix}`;
}

/**
 * 🟢 INITIALIZE FRESH STOCK LEDGER ENTRY WITH AUDITING
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      productId, 
      locationId, 
      quantityOnHand, 
      quantityReserved, 
      quantityAvailable, 
      bins,
      reason, // Expects an AdjustmentReason enum value
      notes,
      performedById // The ID of the authenticated user committing the operation
    } = body;

    if (!productId || !locationId || !performedById) {
      return NextResponse.json(
        { error: "Missing required product, destination facility, or actor profile tokens." }, 
        { status: 400 }
      );
    }

    // Verify system collision constraints to ensure uniqueness across [productId, locationId] rows
    const duplicateCheck = await prisma.inventory.findUnique({
      where: { productId_locationId: { productId, locationId } }
    });
    if (duplicateCheck) {
      return NextResponse.json(
        { error: "A stock configuration record for this specific product SKU already exists. Use PATCH controls instead." }, 
        { status: 409 }
      );
    }

    const createdInventoryNode = await prisma.$transaction(async (tx) => {
      // 1. Create the root Adjustment Header document
      const adjustmentHeader = await tx.inventoryAdjustment.create({
        data: {
          adjustmentNumber: generateAdjustmentNumber(),
          reason: (reason as AdjustmentReason) || "MANUAL",
          notes: notes || "Initial baseline inventory ledger registration",
          performedById: performedById,
        }
      });

      // 2. Generate the root stock profile block
      const invRoot = await tx.inventory.create({
        data: {
          productId,
          locationId,
          quantityOnHand,
          quantityReserved,
          quantityAvailable,
        }
      });

      // 3. Write Root Master Record Audit Logs
      await tx.inventoryAdjustmentLine.create({
        data: {
          adjustmentId: adjustmentHeader.id,
          productId,
          locationId,
          sublocationId: null,
          quantityBefore: 0.0000,
          quantityAdjusted: quantityOnHand,
          quantityAfter: quantityOnHand,
          reason: "Master Level Initialization",
        }
      });

      await tx.inventoryLedger.create({
        data: {
          productId,
          locationId,
          sublocationId: null,
          transactionType: "ADJUSTMENT" as InventoryTransactionType,
          referenceType: "InventoryAdjustment",
          referenceId: adjustmentHeader.id,
          quantityChange: quantityOnHand,
          quantityBefore: 0.0000,
          quantityAfter: quantityOnHand,
          performedById,
        }
      });

      // 4. Handle Sublocation Bins allocations if present
      if (bins && bins.length > 0) {
        for (const bin of bins) {
          // Create the individual physical bin row assignment
          await tx.inventoryBin.create({
            data: {
              inventoryId: invRoot.id,
              productId,
              sublocationId: bin.sublocationId,
              quantity: bin.quantity,
            }
          });

          // Append individual audit logs detailing child bin parameters
          await tx.inventoryAdjustmentLine.create({
            data: {
              adjustmentId: adjustmentHeader.id,
              productId,
              locationId,
              sublocationId: bin.sublocationId,
              quantityBefore: 0.0000,
              quantityAdjusted: bin.quantity,
              quantityAfter: bin.quantity,
              reason: "Bin Allocation Placement",
            }
          });

          await tx.inventoryLedger.create({
            data: {
              productId,
              locationId,
              sublocationId: bin.sublocationId,
              transactionType: "ADJUSTMENT" as InventoryTransactionType,
              referenceType: "InventoryAdjustment",
              referenceId: adjustmentHeader.id,
              quantityChange: bin.quantity,
              quantityBefore: 0.0000,
              quantityAfter: bin.quantity,
              performedById,
            }
          });
        }
      }

      return invRoot;
    });

    return NextResponse.json(createdInventoryNode, { status: 201 });
  } catch (error) {
    console.error("Failed to commit initial inventory ledger entries:", error);
    return NextResponse.json({ error: "Internal Database processing framework malfunction." }, { status: 500 });
  }
}

/**
 * 🟡 PATCH/CORRECT EXISTING STOCK LEDGERS AND INTERNAL STORAGE BINS WITH AUDITING
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      quantityOnHand, 
      quantityReserved, 
      quantityAvailable, 
      bins,
      reason,
      notes,
      performedById
    } = body;

    if (!id || !performedById) {
      return NextResponse.json(
        { error: "Missing master inventory record pointer ID or executing operator entity tokens." }, 
        { status: 400 }
      );
    }

    const synchronizedPayload = await prisma.$transaction(async (tx) => {
      // 1. Fetch current database snapshot before applying any updates
      const currentInventory = await tx.inventory.findUnique({
        where: { id },
        include: { bins: true }
      });

      if (!currentInventory) {
        throw new Error(`Inventory master profile target record '${id}' not verified.`);
      }

      // Convert decimal-like fields to working float numbers safely
      const masterBefore = Number(currentInventory.quantityOnHand);
      const masterAfter = quantityOnHand !== undefined ? Number(quantityOnHand) : masterBefore;
      const masterDelta = masterAfter - masterBefore;

      // 2. Initialize the global Tracking Header wrapper
      const adjustmentHeader = await tx.inventoryAdjustment.create({
        data: {
          adjustmentNumber: generateAdjustmentNumber(),
          reason: (reason as AdjustmentReason) || "CORRECTION",
          notes: notes || "Administrative inventory correction adjustment execution",
          performedById: performedById,
        }
      });

      // 3. Apply root level updates across item attributes
      const updatedInv = await tx.inventory.update({
        where: { id },
        data: {
          quantityOnHand: masterAfter,
          quantityReserved: quantityReserved !== undefined ? quantityReserved : currentInventory.quantityReserved,
          quantityAvailable: quantityAvailable !== undefined ? quantityAvailable : currentInventory.quantityAvailable,
        }
      });

      // 4. Trace changes on Master Inventory Counts
      if (masterDelta !== 0) {
        await tx.inventoryAdjustmentLine.create({
          data: {
            adjustmentId: adjustmentHeader.id,
            productId: updatedInv.productId,
            locationId: updatedInv.locationId,
            sublocationId: null,
            quantityBefore: masterBefore,
            quantityAdjusted: masterDelta,
            quantityAfter: masterAfter,
            reason: "Master Stock Threshold Recalibration",
          }
        });

        await tx.inventoryLedger.create({
          data: {
            productId: updatedInv.productId,
            locationId: updatedInv.locationId,
            sublocationId: null,
            transactionType: "ADJUSTMENT",
            referenceType: "InventoryAdjustment",
            referenceId: adjustmentHeader.id,
            quantityChange: masterDelta,
            quantityBefore: masterBefore,
            quantityAfter: masterAfter,
            performedById,
          }
        });
      }

      // 5. Audit sublocation storage bins array matrix
      if (bins && Array.isArray(bins)) {
        const activeBinIds = bins.map((b: any) => b.id).filter(Boolean);

        // A. Trace and purge drop-deleted storage assignments
        const binsToDelete = currentInventory.bins.filter(b => !activeBinIds.includes(b.id));
        for (const binToDelete of binsToDelete) {
          const binQtyBefore = Number(binToDelete.quantity);

          await tx.inventoryAdjustmentLine.create({
            data: {
              adjustmentId: adjustmentHeader.id,
              productId: updatedInv.productId,
              locationId: updatedInv.locationId,
              sublocationId: binToDelete.sublocationId,
              quantityBefore: binQtyBefore,
              quantityAdjusted: -binQtyBefore,
              quantityAfter: 0.0000,
              reason: "Sublocation Storage Assignment Voided",
            }
          });

          await tx.inventoryLedger.create({
            data: {
              productId: updatedInv.productId,
              locationId: updatedInv.locationId,
              sublocationId: binToDelete.sublocationId,
              transactionType: "ADJUSTMENT",
              referenceType: "InventoryAdjustment",
              referenceId: adjustmentHeader.id,
              quantityChange: -binQtyBefore,
              quantityBefore: binQtyBefore,
              quantityAfter: 0.0000,
              performedById,
            }
          });
        }

        // Wipe them from database storage completely
        await tx.inventoryBin.deleteMany({
          where: {
            inventoryId: id,
            id: { notIn: activeBinIds }
          }
        });

        // B. Reconcile remaining configuration mutations (Updates & Creations)
        for (const bin of bins) {
          if (bin.id) {
            const currentBinRecord = currentInventory.bins.find(b => b.id === bin.id);
            const binBefore = currentBinRecord ? Number(currentBinRecord.quantity) : 0;
            const binAfter = Number(bin.quantity);
            const binDelta = binAfter - binBefore;

            if (binDelta !== 0) {
              await tx.inventoryBin.update({
                where: { id: bin.id },
                data: { quantity: binAfter }
              });

              await tx.inventoryAdjustmentLine.create({
                data: {
                  adjustmentId: adjustmentHeader.id,
                  productId: updatedInv.productId,
                  locationId: updatedInv.locationId,
                  sublocationId: bin.sublocationId,
                  quantityBefore: binBefore,
                  quantityAdjusted: binDelta,
                  quantityAfter: binAfter,
                  reason: "Sublocation Volume Deviation Sync",
                }
              });

              await tx.inventoryLedger.create({
                data: {
                  productId: updatedInv.productId,
                  locationId: updatedInv.locationId,
                  sublocationId: bin.sublocationId,
                  transactionType: "ADJUSTMENT",
                  referenceType: "InventoryAdjustment",
                  referenceId: adjustmentHeader.id,
                  quantityChange: binDelta,
                  quantityBefore: binBefore,
                  quantityAfter: binAfter,
                  performedById,
                }
              });
            }
          } else {
            // New bin record addition
            const newBinQty = Number(bin.quantity);

            await tx.inventoryBin.create({
              data: {
                inventoryId: id,
                productId: updatedInv.productId,
                sublocationId: bin.sublocationId,
                quantity: newBinQty,
              }
            });

            await tx.inventoryAdjustmentLine.create({
              data: {
                adjustmentId: adjustmentHeader.id,
                productId: updatedInv.productId,
                locationId: updatedInv.locationId,
                sublocationId: bin.sublocationId,
                quantityBefore: 0.0000,
                quantityAdjusted: newBinQty,
                quantityAfter: newBinQty,
                reason: "Additional Sublocation Storage Bound",
              }
            });

            await tx.inventoryLedger.create({
              data: {
                productId: updatedInv.productId,
                locationId: updatedInv.locationId,
                sublocationId: bin.sublocationId,
                transactionType: "ADJUSTMENT",
                referenceType: "InventoryAdjustment",
                referenceId: adjustmentHeader.id,
                quantityChange: newBinQty,
                quantityBefore: 0.0000,
                quantityAfter: newBinQty,
                performedById,
              }
            });
          }
        }
      }

      return updatedInv;
    });

    return NextResponse.json(synchronizedPayload, { status: 200 });
  } catch (error: any) {
    console.error("Critical failure during stock ledger correction adjustment routing:", error);
    return NextResponse.json(
      { error: error.message || "Internal Database record process modification transaction exception." }, 
      { status: 500 }
    );
  }
}
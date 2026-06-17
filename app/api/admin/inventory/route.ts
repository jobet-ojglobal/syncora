// app/api/admin/inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InventoryService } from "@/services/inventory.service";

export async function GET() {
  try {
    const parsedStock = await InventoryService.getInventoryLedgerWthIntransit();

    return NextResponse.json(parsedStock, { status: 200 });
  } catch (error) {
    console.error("Master stock ledger pipeline failure:", error);
    return NextResponse.json({ error: "Internal inventory ledger query failure." }, { status: 500 });
  }
}


/**
 * 🟢 INITIALIZE FRESH STOCK LEDGER ENTRY
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, locationId, quantityOnHand, quantityReserved, quantityAvailable, bins } = body;

    if (!productId || !locationId) {
      return NextResponse.json({ error: "Missing product or destination facility mappings tokens." }, { status: 400 });
    }

    // Verify system collision constraints to ensure uniqueness across [productId, locationId] rows
    const duplicateCheck = await prisma.inventory.findUnique({
      where: { productId_locationId: { productId, locationId } }
    });
    if (duplicateCheck) {
      return NextResponse.json({ error: "A stock configuration record for this specific product SKU already exists at this warehouse site. Use modification controls instead." }, { status: 409 });
    }

    const createdInventoryNode = await prisma.$transaction(async (tx) => {
      // Step A: Generate the root stock ledger profile block
      const invRoot = await tx.inventory.create({
        data: {
          productId,
          locationId,
          quantityOnHand,
          quantityReserved,
          quantityAvailable,
        }
      });

      // Step B: If sublocation bins have assignments, generate child rows sequentially
      if (bins && bins.length > 0) {
        await tx.inventoryBin.createMany({
          data: bins.map((bin: any) => ({
            inventoryId: invRoot.id,
            productId,
            sublocationId: bin.sublocationId,
            quantity: bin.quantity,
          }))
        });
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
 * 🟡 PATCH/CORRECT EXISTING STOCK LEDGERS AND INTERNAL STORAGE BINS
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, quantityOnHand, quantityReserved, quantityAvailable, bins } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing master inventory record pointer ID identifier token." }, { status: 400 });
    }

    const synchronizedPayload = await prisma.$transaction(async (tx) => {
      // 1. Core update modifications down across root item parameters
      const updatedInv = await tx.inventory.update({
        where: { id },
        data: {
          quantityOnHand,
          quantityReserved,
          quantityAvailable,
        }
      });

      // 2. Map and parse incoming active sub-bin identifiers to trace removals
      const activeBinIds = bins.map((b: any) => b.id).filter(Boolean);

      // Clean out tracking nodes that were dropped from the UI fields array matrix
      await tx.inventoryBin.deleteMany({
        where: {
          inventoryId: id,
          id: { notIn: activeBinIds }
        }
      });

      // 3. Reconcile remaining configuration paths using upsert flows
      for (const bin of bins) {
        if (bin.id) {
          // Sync existing row measurements
          await tx.inventoryBin.update({
            where: { id: bin.id },
            data: { quantity: bin.quantity }
          });
        } else {
          // Construct freshly appended storage bin assignments
          await tx.inventoryBin.create({
            data: {
              inventoryId: id,
              productId: updatedInv.productId, // Pull reference values straight from the master record
              sublocationId: bin.sublocationId,
              quantity: bin.quantity,
            }
          });
        }
      }

      return updatedInv;
    });

    return NextResponse.json(synchronizedPayload, { status: 200 });
  } catch (error) {
    console.error("Critical failure during stock ledger correction adjustment routing:", error);
    return NextResponse.json({ error: "Internal Database record process transaction modification exception." }, { status: 500 });
  }
}
// app/api/admin/transfers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Modify Transfers (DRAFT STATUS)
 */
export async function PATCH(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 1. Destructure incoming components from your useForm body structure
    const { sourceLocationId, targetLocationId, remarks, lines } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing transfer ID parameter." }, { status: 400 });
    }

    // 2. Lock check: Prevent updates to finalized shipments (Immutable state safety)
    const existingTransfer = await prisma.transferOrder.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!existingTransfer) {
      return NextResponse.json({ error: "Transfer order not found." }, { status: 404 });
    }

    if (existingTransfer.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Immutable Record: This transfer order has broken out of DRAFT status and cannot be modified." },
        { status: 423 }
      );
    }

    // 3. Database Write Transaction
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      
      // Step A: Strip away old lines completely to wipe out deleted rows
      await tx.transferOrderLine.deleteMany({
        where: { transferOrderId: id }
      });

      // Step B: Re-insert lines with clean formatting and explicit null transforms for empty strings
      const dynamicLines = lines.map((line: any) => ({
        productId: line.productId,
        // Convert empty selection fields safely to null for clean relation indexes
        sourceSublocationId: line.sourceSublocationId === "" ? null : line.sourceSublocationId,
        targetSublocationId: line.targetSublocationId === "" ? null : line.targetSublocationId,
        quantity: line.quantity, // Decimals are safely map-cast via Prisma strings/numbers input
      }));

      // Step C: Execute top-level updates and append fresh operational components
      return await tx.transferOrder.update({
        where: { id },
        data: {
          sourceLocationId: sourceLocationId || null,
          targetLocationId: targetLocationId || null,
          remarks: remarks || null,
          lines: {
            createMany: {
              data: dynamicLines
            }
          }
        },
        include: {
          lines: true
        }
      });
    });

    return NextResponse.json(updatedTransfer, { status: 200 });

  } catch (error: any) {
    console.error("Critical error saving manifest modifications:", error);
    return NextResponse.json(
      { error: "Database engine write transaction failure during manifest modification routing save." },
      { status: 500 }
    );
  }
}

/**
 * 🛑 DESTRUCTIVE ACTIONS ENGINE: PURGE DRAFT TRANSFER MANIFESTS
 */
export async function DELETE(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing transfer order identifier token parameters." }, 
        { status: 400 }
      );
    }

    // 1. Fetch current order to check existence and state compliance
    const currentOrder = await prisma.transferOrder.findUnique({
      where: { id },
      select: { status: true, transferNumber: true }
    });

    if (!currentOrder) {
      return NextResponse.json(
        { error: "Target transfer order manifest was not found." }, 
        { status: 404 }
      );
    }

    // 2. Strict State Guard: Restrict deletion explicitly to DRAFT status
    if (currentOrder.status !== "DRAFT") {
      return NextResponse.json(
        { 
          error: `Purge Operation Aborted: Manifest (${currentOrder.transferNumber}) is currently locked in '${currentOrder.status}' phase. Only 'DRAFT' status indices can be permanently deleted.` 
        }, 
        { status: 422 }
      );
    }

    // 3. Execute cascades cleanly inside an atomic transaction block
    await prisma.$transaction(async (tx) => {
      // Clear dependent component line manifests first to satisfy foreign key constraints
      await tx.transferOrderLine.deleteMany({
        where: { transferOrderId: id }
      });

      // Clear the root transfer order node record
      await tx.transferOrder.delete({
        where: { id }
      });
    });

    return NextResponse.json(
      { message: `Transfer manifest ${currentOrder.transferNumber} successfully purged from storage ledgers.` }, 
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Purge Transaction Exception:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while breaking down database references." }, 
      { status: 500 }
    );
  }
}


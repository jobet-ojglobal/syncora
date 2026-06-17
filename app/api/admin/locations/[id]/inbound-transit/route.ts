import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { id: locationId } = await params;

    if (!locationId) {
      return NextResponse.json({ error: "Missing facility identification token." }, { status: 400 });
    }

    // Pull active transfer lines heading toward this warehouse location
    const inboundShipments = await prisma.transferOrderLine.findMany({
      where: {
        transferOrder: {
          targetLocationId: locationId,
          status: "IN_TRANSIT"
        }
      },
      include: {
        product: {
          select: { name: true, slug: true }
        },
        transferOrder: {
          select: {
            transferNumber: true,
            transferredAt: true,
            remarks: true,
            sourceLocation: { select: { name: true } }
          }
        },
        targetSublocation: { select: { name: true } } // Expected destination bin
      },
      orderBy: { transferOrder: { transferredAt: "desc" } }
    });

    // Format into a flat, highly consumable frontend tracking contract
    const formattedTracking = inboundShipments.map((line) => ({
      lineId: line.id,
      transferNumber: line.transferOrder.transferNumber,
      sourceFacility: line.transferOrder.sourceLocation.name,
      dispatchedAt: line.transferOrder.transferredAt,
      productId: line.productId,
      productName: line.product.name,
      productSlug: line.product.slug,
      quantityInTransit: Number(line.quantity),
      expectedDestinationBin: line.targetSublocation?.name || "Bulk Floor / Unassigned",
      remarks: line.transferOrder.remarks
    }));

    return NextResponse.json(formattedTracking, { status: 200 });
  } catch (error: any) {
    console.error("Inbound logistics trace failure:", error);
    return NextResponse.json({ error: "Failed to compile inbound transit log matrix." }, { status: 500 });
  }
}
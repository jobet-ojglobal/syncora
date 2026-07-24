import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id: locationId } = await params;

    const locationExists = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, inflowId: true },
    });

    if (!locationExists) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const inboundShipments = await prisma.transferOrderLine.findMany({
      where: {
        transferOrder: {
          targetLocationId: locationExists.inflowId,
          status: "IN_TRANSIT",
        },
      },
      include: {
        product: { select: { name: true, slug: true } },
        transferOrder: {
          select: {
            transferNumber: true,
            transferredAt: true,
            expectedArrival: true,
            remarks: true,
            sourceLocation: { select: { name: true } },
          },
        },
        targetSublocation: { select: { name: true } },
      },
      orderBy: { transferOrder: { transferredAt: "desc" } },
    });

    const formattedTracking = inboundShipments.map((line) => ({
      lineId: line.id,
      transferNumber: line.transferOrder.transferNumber,
      sourceFacility: line.transferOrder.sourceLocation.name,
      dispatchedAt: line.transferOrder.transferredAt,
      expectedArrival: line.transferOrder.expectedArrival,
      productId: line.productId,
      productName: line.product.name,
      productSlug: line.product.slug,
      quantityInTransit: Number(line.quantity),
      expectedDestinationBin: line.targetSublocation?.name || "Bulk Area",
      remarks: line.transferOrder.remarks,
    }));

    return NextResponse.json(formattedTracking, { status: 200 });
  } catch (error: any) {
    console.error("Inbound logistics trace failure:", error);
    return NextResponse.json(
      { error: "Failed to compile inbound transit log matrix." },
      { status: 500 }
    );
  }
}
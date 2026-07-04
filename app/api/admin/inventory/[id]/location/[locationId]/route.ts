// app/api/inventory/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    id: string;
    locationId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id, locationId } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Inventory ledger record target identifier token is required." },
        { status: 400 }
      );
    }

    // Query core stock balance record along with active storage bin breakdowns
    const stockRecord = await prisma.inventory.findUnique({
      where: { 
        productId_locationId: {
          productId: id,
          locationId: locationId
        }
      },
      include: {
        bins: {
          select: {
            id: true,
            sublocationId: true,
            quantity: true
          }
        }
      }
    });

    if (!stockRecord) {
      return NextResponse.json(
        { error: "The targeted inventory position index could not be located inside active ledgers." },
        { status: 404 }
      );
    }

    // Remap numeric types: Coerce high-precision Decimals to standard Floats for UI form values
    const formattedInventory = {
      id: stockRecord.id,
      productId: stockRecord.productId,
      locationId: stockRecord.locationId,
      quantityOnHand: Number(stockRecord.quantityOnHand),
      quantityAvailable: stockRecord.quantityAvailable ? Number(stockRecord.quantityAvailable) : 0,
      quantityReserved: stockRecord.quantityReserved ? Number(stockRecord.quantityReserved) : 0,
      bins: stockRecord.bins.map((bin) => ({
        id: bin.id,
        sublocationId: bin.sublocationId,
        quantity: Number(bin.quantity)
      }))
    };

    return NextResponse.json(formattedInventory, { status: 200 });
  } catch (error) {
    console.error("Critical failure pulling target inventory allocation matrix:", error);
    return NextResponse.json(
      { error: "Internal Database query execution failure during stock record parsing." },
      { status: 500 }
    );
  }
}
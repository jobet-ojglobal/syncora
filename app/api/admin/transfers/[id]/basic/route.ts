// app/api/transfers/[id]/basic/route.ts
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
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Transfer tracking identification parameter is required." },
        { status: 400 }
      );
    }

    // Query transfer data with all nested relations required to populate the multi-line form matrix
    const transferOrder = await prisma.transferOrder.findUnique({
      where: { id: id },
      include: {
        lines: {
          select: {
            id: true,
            productId: true,
            sourceSublocationId: true,
            targetSublocationId: true,
            quantity: true,
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    // Handle missing records safely
    if (!transferOrder) {
      return NextResponse.json(
        { error: "The targeted transfer order manifest record could not be located." },
        { status: 404 }
      );
    }

    // Explicitly clean up Decimal fields into standard numbers for UI validation rules
    const formattedPayload = {
      ...transferOrder,
      lines: transferOrder.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        sourceSublocationId: line.sourceSublocationId || "",
        targetSublocationId: line.targetSublocationId || "",
        quantity: Number(line.quantity)
      }))
    };

    return NextResponse.json(formattedPayload, { status: 200 });
  } catch (error) {
    console.error("Critical error extracting transfer metadata for modification:", error);
    return NextResponse.json(
      { error: "Internal Database query execution failure during manifest routing lookup." },
      { status: 500 }
    );
  }
}
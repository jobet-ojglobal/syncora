import { getSalesOrder } from "@/lib/partner/data/sales-order";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: Promise<{
    batchId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { batchId } = await params;

    const data = await getSalesOrder(batchId);

    return NextResponse.json({
      success: true,
      message: "Connected to inFlow Local",
      data,
    });
 
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}



import { getProductCostAdjustments } from '@/lib/inflow/data/product-cost-adjustment';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data =
        await getProductCostAdjustments();

    return NextResponse.json({
      success: true,
      message: "Connected to inFlow Cloud",
      data,
    })
 
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


import { NextResponse } from 'next/server';
import { getProductGroups } from '@/lib/inflow/data/product-group';

export async function GET() {
  try {
    const data =
        await getProductGroups();

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

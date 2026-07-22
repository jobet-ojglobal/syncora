import { NextResponse } from 'next/server';
import { getEntireCatalogs } from '@/lib/inflow/data/products';

export async function GET() {
  try {
    const data =
        await getEntireCatalogs();

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

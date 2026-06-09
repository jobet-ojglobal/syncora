import { NextResponse } from 'next/server';
import { getInventory } from '@/lib/inflow/data/inventory';

export async function GET() {
  try {
    const data =
        await getInventory();

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
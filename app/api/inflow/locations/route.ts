import { getLocations } from '@/lib/inflow/data/locations';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data =
        await getLocations();

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
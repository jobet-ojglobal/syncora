import { NextRequest, NextResponse } from 'next/server';
import { getEntireCatalogs } from '@/lib/inflow/data/products';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const limitParam = searchParams.get('count');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 50;
    const after = searchParams.get('after') || undefined;
    const data = await getEntireCatalogs(limit, after);

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

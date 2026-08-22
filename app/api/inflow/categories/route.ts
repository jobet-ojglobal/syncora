import { NextResponse } from 'next/server';
import { getCategories} from '@/lib/inflow/data/categories';

export async function GET() {
  try {
    const data =
        await getCategories();

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



import { NextResponse } from 'next/server';
import { getLocalProducts } from '@/lib/local001/data/products';

export async function GET() {
  try {
    const data =
      await getLocalProducts();

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

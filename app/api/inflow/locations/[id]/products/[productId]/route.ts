// api/inflow/locations/[id]/products/[productId]
import { getSublocationsByProductAndLocation } from '@/lib/inflow/data/locations';
import { NextRequest, NextResponse } from 'next/server';

interface Props {
  params: Promise<{
    id: string;
    productId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id, productId } = await params;

    const data =
      await getSublocationsByProductAndLocation(id, productId);

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
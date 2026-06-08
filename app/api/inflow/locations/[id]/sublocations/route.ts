// api/inflow/locations/[id]/sublocations
import { getSublocationsByLocation } from '@/lib/inflow/data/locations';
import { NextRequest, NextResponse } from 'next/server';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    const data =
      await getSublocationsByLocation(id);

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
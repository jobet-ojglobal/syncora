import { NextRequest, NextResponse } from 'next/server';
import { getLocalBatchProducts } from '@/lib/locations/data/product-local';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 50;
    const after = searchParams.get('after') || undefined;

    // Fetch single page batch
    const batch = await getLocalBatchProducts("http://100.85.147.26:8000", limit, after);

    if (!batch || batch.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          limit,
          after: null,
          nextCursor: null,
          hasMore: false,
        },
      });
    }

    const items = batch.map((fullProduct) => ({
      productId: fullProduct.productId,
    }));

    const nextCursor = batch[batch.length - 1]?.productId || null;

    return NextResponse.json({
      success: true,
      message: "Successfully fetched paginated batch",
      data: items,
      pagination: {
        limit,
        after: after || null,
        nextCursor,
        hasMore: batch.length === limit,
      },
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
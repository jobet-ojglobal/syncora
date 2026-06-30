import { getSalesOrders, upsertSalesOrder } from '@/lib/inflow/data/sales-orders';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const data =
        await getSalesOrders();

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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const sales = await upsertSalesOrder(body)

    return NextResponse.json(sales, { status: 201 });
  } catch (error) {
    console.error("Sales creation error runtime failure:", error);
    return NextResponse.json({ error: "Internal Database insertion engine breakdown error." }, { status: 500 });
  }
}
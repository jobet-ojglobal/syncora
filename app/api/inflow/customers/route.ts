
import { getCustomers, upsertCustomer } from '@/lib/inflow/data/customers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const data =
        await getCustomers();

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

    const customer = await upsertCustomer(body)

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Customer creation error runtime failure:", error);
    return NextResponse.json({ error: "Internal Database insertion engine breakdown error.", message: error }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { adminProductService } from "@/services/admin-product.service";
import { createProductGroupSchema } from "@/schemas/product-group.schema";
import { createProductGroupToInflow } from "@/lib/inflow/services/product-group.upsert";

export async function GET() {
  const products = await adminProductService.fetchAll();

  return NextResponse.json(products);
}

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const validated = createProductGroupSchema.parse(body);

    const product = await createProductGroupToInflow(
        validated
      );

    return NextResponse.json( product, 
      {
        status: 201,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 400,
      }
    );
  }
}
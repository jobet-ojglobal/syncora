// api/products
import { NextResponse } from "next/server";
import { adminProductService } from "@/services/product.service";
import { ProductService } from "@/modules/products/services/product.service";

export async function GET() {
  const products =
    await adminProductService.getProducts();

  return NextResponse.json(products);
}

const service = new ProductService();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const product =
      await service.create(body);

    return NextResponse.json(product);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { adminProductService } from "@/services/product.service";

export async function GET() {
  const products =
    await adminProductService.getProducts();

  return NextResponse.json(products);
}
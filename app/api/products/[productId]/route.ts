// import { NextResponse } from "next/server";
// import { ProductService } from "@/modules/products/services/product.service";

// const service = new ProductService();

// export async function PUT(
//   req: Request,
//   {
//     params,
//   }: {
//     params: Promise<{
//       productId: string;
//     }>;
//   }
// ) {
//   try {
//     const body = await req.json();

//     const { productId } = await params;

//     const product =
//       await service.update(
//         productId,
//         body
//       );

//     return NextResponse.json(product);
//   } catch (error) {
//     console.error(error);

//     return NextResponse.json(
//       { error: "Failed to update product" },
//       { status: 500 }
//     );
//   }
// }
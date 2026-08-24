// app/api/admin/products/empty/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 500;
const DELAY_MS = 150;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, any>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          let totalDeleted = 0;

          while (true) {
            // Find IDs to delete in batches
            const records = await prisma.product.findMany({
              select: { id: true, inflowId: true },
              take: BATCH_SIZE,
            });

            if (records.length === 0) break;

            const productIds = records.map((r) => r.id);
            const productInflowIds = records.map((r) => r.inflowId);

            // Transactional cascade cleaning of dependent models (prevents Foreign Key Constraint errors)
            await prisma.$transaction(async (tx) => {
              // 1. Delete mapping location entries
              await tx.productLocationMap.deleteMany({
                where: { productId: { in: productInflowIds } },
              });

              // 2. Delete Vendor Item references
              await tx.vendorItem.deleteMany({
                where: { productId: { in: productInflowIds } },
              });

              // 3. Delete Product Price records
              await tx.productPrice.deleteMany({
                where: { productId: { in: productInflowIds } },
              });

              // 4. Delete Product Attachments
              await tx.productAttachment.deleteMany({
                where: { productId: { in: productInflowIds } },
              });

              // 5. Delete Product Barcodes
              await tx.productBarcode.deleteMany({
                where: { productId: { in: productInflowIds } },
              });

              // 6. Delete Reorder Points
              await tx.reorderSetting.deleteMany({
                where: { productId: { in: productInflowIds } },
              });

              // 7. Delete BOM Component relationships (if exists)
            //   await tx.productBom.deleteMany({
            //     where: {
            //       OR: [
            //         { childProduct: { in: productInflowIds } },
            //         { componentProductId: { in: productInflowIds } },
            //       ],
            //     },
            //   });

              // 8. Finally delete Product batch
              const result = await tx.product.deleteMany({
                where: { id: { in: productIds } },
              });

              totalDeleted += result.count;
            });

            sendEvent({
              type: "progress",
              phase: "products",
              batchCount: records.length,
              totalDeleted,
            });

            await delay(DELAY_MS);
          }

          sendEvent({
            type: "complete",
            stats: { totalDeleted },
          });

          controller.close();
        } catch (err: any) {
          sendEvent({
            type: "error",
            error: err.message || "Product deletion failed",
          });
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }
}
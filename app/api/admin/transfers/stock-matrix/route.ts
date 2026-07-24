import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceLocationId = searchParams.get("sourceLocationId");
    const targetLocationId = searchParams.get("targetLocationId");

    if (!sourceLocationId) {
      return NextResponse.json({ matrix: [], sublocations: [] });
    }

    // 1. Fetch available sublocations for source and target
    const locationIds = [sourceLocationId, targetLocationId].filter(Boolean) as string[];
    const sublocations = await prisma.sublocation.findMany({
      where: { locationId: { in: locationIds } },
      select: { id: true, name: true, locationId: true },
    });

    // 2. Fetch inventories present at the source location
    const inventories = await prisma.inventory.findMany({
      where: { locationId: sourceLocationId },
      include: {
        product: {
          select: {
            id: true,
            inflowId: true,
            sku: true,
            name: true,
            slug: true,
            images: {
              orderBy: { position: "asc" },
              take: 1,
              select: { thumbUrl: true, originalUrl: true },
            },
          },
        },
        bins: {
          select: {
            sublocationId: true,
            quantity: true,
          },
        },
      },
    });

    const productIds = inventories.map((inv) => inv.productId);

    // 3. Fetch target location inventories with matching include signature
    let targetInventories: typeof inventories = [];
    if (targetLocationId) {
      targetInventories = await prisma.inventory.findMany({
        where: {
          locationId: targetLocationId,
          productId: { in: productIds },
        },
        include: {
          product: {
            select: {
              id: true,
              inflowId: true,
              sku: true,
              name: true,
              slug: true,
              images: {
                orderBy: { position: "asc" },
                take: 1,
                select: { thumbUrl: true, originalUrl: true },
              },
            },
          },
          bins: {
            select: {
              sublocationId: true,
              quantity: true,
            },
          },
        },
      });
    }

    const targetInvMap = new Map(targetInventories.map((inv) => [inv.productId, inv]));

    // 4. Assemble the matrix response
    const matrix = inventories.map((srcInv) => {
      const tgtInv = targetInvMap.get(srcInv.productId);

      const firstImage = srcInv.product.images[0];
      const thumbnail = firstImage?.thumbUrl || firstImage?.originalUrl || null;

      return {
        product: {
          id: srcInv.product.id,
          inflowId: srcInv.product.inflowId,
          sku: srcInv.product.sku,
          name: srcInv.product.name,
          slug: srcInv.product.slug,
          thumbnail,
        },
        stocks: {
          source: {
            quantityAvailable: Number(srcInv.quantityAvailable ?? srcInv.quantityOnHand),
            bins: srcInv.bins.map((b) => ({
              sublocationId: b.sublocationId,
              quantity: Number(b.quantity),
            })),
          },
          target: {
            quantityAvailable: Number(tgtInv?.quantityAvailable ?? tgtInv?.quantityOnHand ?? 0),
            bins:
              tgtInv?.bins.map((b) => ({
                sublocationId: b.sublocationId,
                quantity: Number(b.quantity),
              })) || [],
          },
        },
      };
    });

    return NextResponse.json({
      matrix,
      sublocations,
    });
  } catch (error: any) {
    console.error("Failed to load stock matrix:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
// app/api/admin/product-groups/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const structuralGroups = await prisma.productGroup.findMany({
      where: { deletedAt: null },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        _count: {
          select: { options: true }
        },
        // ⛓️ Deep fetch linked variants along with core product codes
        variants: {
          select: {
            id: true,
            inflowId: true,
            productId: true,
            product: {
              select: {
                id: true,
                sku: true,
                name: true
              }
            }
          }
        },
        images: {
            orderBy: { position: "asc" },
            take: 1,
            select: { thumbUrl: true, originalUrl: true }
          }
      },
      orderBy: { createdAt: "desc" }
    });

    const parsedGroups = structuralGroups.map(group => ({
      id: group.id,
      inflowId: group.inflowId,
      name: group.name,
      slug: group.slug,
      isActive: group.isActive,
      brandName: group.brand?.name || "Generic / None",
      categoryName: group.category?.name || "Unassigned Dept",
      optionsCount: group._count.options,
      createdAt: group.createdAt.toISOString(),
      thumbnail: group.images[0]?.thumbUrl || group.images[0]?.originalUrl || null,
      // Remap the variant payload array to explicitly stream loose SKU details to the UI
      linkedSkus: group.variants.map(v => ({
        variantId: v.inflowId,
        productId: v.product.id,
        skuCode: v.product?.sku || "NO-SKU",
        productName: v.product?.name || "Unknown Product Line"
      }))
    }));

    return NextResponse.json(parsedGroups, { status: 200 });
  } catch (error) {
    console.error("Master product groups processing exception layout crashed:", error);
    return NextResponse.json(
      { error: "Database transaction engine failure pulling catalog groups map." },
      { status: 500 }
    );
  }
}
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const isCloudSyncedParam = searchParams.get("isCloudSynced");
    const isLocalSyncedParam = searchParams.get("isLocalSynced");

    // Pagination Parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "25"))
    const skip = (page - 1) * limit

    // Filter Parameters
    const search = searchParams.get("search")?.trim() || ""
    const statusParam = searchParams.get("status")
    
    // 🟢 Extract and convert array parameters safely
    const brands = searchParams.get("brands")?.split(",").filter(Boolean) || []
    const categories = searchParams.get("categories")?.split(",").filter(Boolean) || []

    // Sorting Parameters
    const sortBy = searchParams.get("sortBy") || ""
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // Construct Prisma Query Object
    const whereClause: any = { deletedAt: null }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ]
    }

    if (statusParam === "active") {
      whereClause.isActive = true
    } else if (statusParam === "inactive") {
      whereClause.isActive = false
    }

    // Cloud Sync Filter
    if (isCloudSyncedParam === "true") {
      whereClause.isCloudSynced = true;
    } else if (isCloudSyncedParam === "false") {
      whereClause.isCloudSynced = false;
    }

    // Local Sync Filter
    if (isLocalSyncedParam === "true") {
      whereClause.isLocalSynced = true;
    } else if (isLocalSyncedParam === "false") {
      whereClause.isLocalSynced = false;
    }

    // 🟢 Server-side relational database filters array processing
    if (brands.length > 0) {
      whereClause.brand = {
        id: { in: brands }
      }
    }

    if (categories.length > 0) {
      whereClause.category = {
        id: { in: categories }
      }
    }

    // Sort evaluation block
    let orderByClause: any = { updatedAt: "desc" }
    if (sortBy === "sku" || sortBy === "name" || sortBy === "createdAt") {
      orderByClause = { [sortBy]: sortOrder }
    }

    // Execute Concurrent Query Payload Requests
    const [totalRecords, catalogItems] = await prisma.$transaction([
      prisma.product.count({ where: whereClause }),
      prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
          variant: { include: { group: { select: { name: true } } } },
          purchasingUom: { include: { uom: { select: { name: true, code: true } } } },
          salesUom: { include: { uom: { select: { name: true, code: true } } } },
          barcodes: { select: { barcode: true } },
          images: { orderBy: { position: "asc" }, take: 1, select: { thumbUrl: true, originalUrl: true } }
        },
        orderBy: orderByClause
      })
    ]);

    // 5. Parse Data to match your table shape
    const parsedProducts = catalogItems.map((prod) => {
      const purchasingCode = prod.purchasingUom?.uom?.code || prod.purchasingUom?.uom?.name;
      const salesCode = prod.salesUom?.uom?.code || prod.salesUom?.uom?.name;

      return {
        id: prod.id,
        inflowId: prod.inflowId,
        sku: prod.sku || "N/A",
        name: prod.name,
        groupName: prod.variant?.group.name,
        slug: prod.slug,
        isCloudSynced: prod.isCloudSynced,
        isLocalSynced: prod.isLocalSynced,
        itemType: prod.itemType || "Stock",
        isActive: prod.isActive,
        trackExpiry: prod.trackExpiry,
        trackLots: prod.trackLots,
        trackSerials: prod.trackSerials,
        brandName: prod.brand?.name || "Generic / White-label",
        categoryName: prod.category?.name || "Unassigned Dept",
        thumbnail: prod.images[0]?.originalUrl || prod.images[0]?.thumbUrl || null,
        barcodesCount: prod.barcodes.length,
        primaryBarcode: prod.barcodes[0]?.barcode || null,
        purchasingUomText: prod.purchasingUom && purchasingCode
          ? `${purchasingCode} (${Number(prod.purchasingUom.standardQuantity)}:${Number(prod.purchasingUom.uomQuantity)})`
          : "Not Set",
        salesUomText: prod.salesUom && salesCode
          ? `${salesCode} (${Number(prod.salesUom.standardQuantity)}:${Number(prod.salesUom.uomQuantity)})`
          : "Not Set",
        createdAt: prod.createdAt
      };
    });

    // Return the items along with total counters for your pagination components
    return NextResponse.json({
      data: parsedProducts,
      meta: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: page,
        limit
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Master product catalog pipeline failure:", error);
    return NextResponse.json(
      { error: "Internal product database query execution failure.", details: error.message }, 
      { status: 500 }
    );
  }
}
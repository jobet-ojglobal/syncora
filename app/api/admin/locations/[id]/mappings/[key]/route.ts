import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { includes } from "zod";

interface RouteParams {
  params: Promise<{
    id: string; // inflowId
    key: string; // mapping key, e.g. 'sublocations', 'taxingSchemes'
  }>;
}

// Map mapping key strings to their Prisma model names
const MODEL_MAPPING: Record<string, { model: string; nameField?: string; codeField?: string }> = {
  taxingSchemes: { model: "taxingSchemeLocationMap" },
  currencies: { model: "currencyLocationMap" },
  paymentTerms: { model: "paymentTermLocationMap" },
  costAdjustments: { model: "productCostAdjustmentLocationMap" },
  barcodes: { model: "productBarcodeLocationMap" },
  categories: { model: "categoryLocationMap" },
  pricingSchemes: { model: "pricingSchemeLocationMap" },
  customerBalances: { model: "customerBalanceLocationMap" },
  vendorCredits: { model: "vendorCreditLocationMap" },
  sublocations: { model: "sublocationLocationMap" },
  customers: { model: "customerLocationMap" },
  products: { model: "productLocationMap" },
  vendors: { model: "vendorLocationMap" },
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: locationId, key } = await params;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const mappingConfig = MODEL_MAPPING[key];
    if (!mappingConfig) {
      return NextResponse.json({ error: `Unsupported mapping key: ${key}` }, { status: 400 });
    }

    const prismaModel = (prisma as any)[mappingConfig.model];
    if (!prismaModel) {
      return NextResponse.json({ error: `Model handler missing for: ${key}` }, { status: 500 });
    }

    // Build base filter query
    const where: any = { locationId };

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { sublocationId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, rawRecords] = await Promise.all([
      prismaModel.count({ where }),
      prismaModel.findMany({
        where,
        includes: {

        },
        take: limit,
        skip,
        orderBy: { id: "desc" },
      }),
    ]);

    // Format output records uniformly for the modal frontend
    const records = rawRecords.map((item: any) => ({
      id: item.id,
      mappedEntityId: item.sublocationId || item.customerId || item.productId || item.vendorId || item.id,
      name: item.name || item.sublocationId || item.id,
      localId: item.localId ?? "-",
      createdAt: item.createdAt || new Date().toISOString(),
    }));

    return NextResponse.json({
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch mapping records:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: locationId, key } = await params;
    const { searchParams } = new URL(request.url);
    const unmapAll = searchParams.get("all") === "true";

    const mappingConfig = MODEL_MAPPING[key];
    if (!mappingConfig) {
      return NextResponse.json({ error: `Unsupported mapping key: ${key}` }, { status: 400 });
    }

    const prismaModel = (prisma as any)[mappingConfig.model];

    if (unmapAll) {
      // Delete all mapped items bound to this locationId
      const result = await prismaModel.deleteMany({
        where: { locationId },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // Otherwise, parse specific IDs array from body
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing or invalid 'ids' array" }, { status: 400 });
    }

    const result = await prismaModel.deleteMany({
      where: {
        id: { in: ids },
        locationId,
      },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Failed to unmap records:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
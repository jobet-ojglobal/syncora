import { InventoryService } from "@/services/inventory.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const params = {
      productId: searchParams.get("productId") || undefined,
      locationId: searchParams.get("locationId") || undefined,
      transactionType: searchParams.get("transactionType") || undefined,
      referenceType: searchParams.get("referenceType") || undefined,
      search: searchParams.get("search") || undefined,
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 50,
    };

    const data = await InventoryService.getLedgerEntries(params);

    const formattedEntries = data.items.map((entry) => ({
      id: entry.id,
      productId: entry.productId,
      productName: entry.product?.name ?? "Unknown Product",
      productSlug: entry.product?.slug ?? "-",
      locationName: entry.location?.name ?? "Unknown Location",
      sublocationName: entry.sublocation?.name ?? null,
      transactionType: entry.transactionType,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      quantityChange: Number(entry.quantityChange),
      quantityBefore: Number(entry.quantityBefore),
      quantityAfter: Number(entry.quantityAfter),
      unitCost: entry.unitCost ? Number(entry.unitCost) : null,
      batchNumber: entry.batchNumber,
      serialNumber: entry.serialNumber,
      remarks: entry.remarks,
      performedByName: entry.performedBy
        ? `${entry.performedBy.name ?? ""} ""}`.trim() || entry.performedBy.email
        : "System / Automated",
      createdAt: entry.createdAt.toISOString(),
    }));

    return NextResponse.json({
      entries: formattedEntries,
      meta: data.meta,
    });
  } catch (error) {
    console.error("Failed to query inventory ledger matrix:", error);
    return NextResponse.json(
      { error: "Internal Database processing error." },
      { status: 500 }
    );
  }
}
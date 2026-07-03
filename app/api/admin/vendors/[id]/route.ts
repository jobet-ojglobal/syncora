// app/api/admin/vendors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VendorService } from "@/services/vendor.service";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Required identifier param missing." }, { status: 400 });
    }

    const vendorFormReadyData = await VendorService.findById(id);

    if (!vendorFormReadyData) {
      return NextResponse.json({ error: "Vendor profile resource not found." }, { status: 404 });
    }

    console.log(vendorFormReadyData)

    return NextResponse.json(vendorFormReadyData, { status: 200 });
  } catch (error) {
    console.error("[VENDOR_GET_ITEM_ERROR]:", error);
    return NextResponse.json({ error: "Internal processing error during lookup vector extraction." }, { status: 500 });
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing required core customer profile registry identity string token tracking handle parameter." }, { status: 400 });
    }

    // 1. Locate the vendor matrix block and fetch the tied parent BusinessPartner key
    const targetVendor = await prisma.vendor.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        businessPartnerId: true,
        _count: {
          select: {
            products: true,
            purchaseOrders: true,
            vendorItems: true,
          },
        },
      },
    });

    if (!targetVendor) {
      return NextResponse.json(
        { error: "Target procurement vendor record missing or already processed inside subsystem tables." },
        { status: 404 }
      );
    }

    // 2. Enforce strict relational locking barriers to protect history layers
    const dynamicDependenciesCount = 
      targetVendor._count.products + 
      targetVendor._count.purchaseOrders + 
      targetVendor._count.vendorItems;

    if (dynamicDependenciesCount > 0) {
      return NextResponse.json(
        { 
          error: "Relational integrity block. This vendor profile maps to live product catalogs, pricing items rows, or purchase orders.",
          details: {
            linkedProducts: targetVendor._count.products,
            openPurchaseOrders: targetVendor._count.purchaseOrders,
            customSkusMapped: targetVendor._count.vendorItems
          }
        },
        { status: 422 } // Unprocessable Entity
      );
    }

    // 3. Execute atomic mutation script to flag archival milestones across rows
    await prisma.$transaction(async (tx) => {
      const horizontalTimestampMarker = new Date();

      // Soft-delete the vendor row node
      await tx.vendor.update({
        where: { id: targetVendor.id },
        data: { deletedAt: horizontalTimestampMarker },
      });

      // Deactivate global availability paths inside the parent business partner map
      await tx.businessPartner.update({
        where: { id: targetVendor.businessPartnerId },
        data: { isActive: false },
      });
    });

    return NextResponse.json(
      { success: true, message: "Vendor profile archived safely" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Critical error executing data pipeline archival sweep on target trade vendor:", error);
    return NextResponse.json(
      { error: "Internal server breakdown executing transactional database pruning routines." },
      { status: 500 }
    );
  }
}
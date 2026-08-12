import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params;

  try {
    const location = await prisma.location.findUnique({
      where: {
        inflowId: id,
      },
      select: {
        id: true,
        inflowId: true,
        name: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found." },
        { status: 404 }
      );
    }

    if (location.deletedAt || !location.isActive) {
      return NextResponse.json(
        {
          message: `"${location.name}" is already inactive.`,
        },
        { status: 200 }
      );
    }

    /*
     * Inventory
     *
     * We use quantityOnHand > 0 instead of simply counting Inventory
     * records because an Inventory record may exist with zero stock.
     */
    const inventory = await prisma.inventory.aggregate({
      where: {
        locationId: id,
        quantityOnHand: {
          gt: 0,
        },
      },
      _sum: {
        quantityOnHand: true,
      },
    });

    /*
     * Sales orders
     *
     * QUOTE is not considered an active order.
     */
    const salesOrdersCount = await prisma.salesOrder.count({
      where: {
        locationId: id,
        isCancelled: false,
        paymentStatus: {
          not: "QUOTE",
        },
        inventoryStatus: {
          not: "QUOTE",
        },
      },
    });

    /*
     * Purchase orders
     *
     * QUOTE is not considered an active purchase order.
     *
     * PAID alone does not necessarily mean the PO is completely
     * fulfilled, so we also inspect inventory status.
     */
    const purchaseOrdersCount = await prisma.purchaseOrder.count({
      where: {
        locationId: id,
        paymentStatus: {
          not: "QUOTE",
        },
        inventoryStatus: {
          not: "QUOTE",
        },
      },
    });

    /*
     * Transfers
     *
     * Ignore completed/cancelled transfers.
     */
    const transferOrdersCount = await prisma.transferOrder.count({
      where: {
        OR: [
          {
            sourceLocationId: id,
          },
          {
            targetLocationId: id,
          },
        ],
        status: {
          in: [
            "PENDING",
            "IN_TRANSIT",
            "PARTIALLY_RECEIVED",
            "RECEIVED_DISCREPANCY",
          ],
        },
      },
    });

    const units = Number(inventory._sum.quantityOnHand ?? 0);

    const hasDependencies =
      units > 0 ||
      salesOrdersCount > 0 ||
      purchaseOrdersCount > 0 ||
      transferOrdersCount > 0;

    if (hasDependencies) {
      return NextResponse.json(
        {
          error: "Location has active dependencies.",
          location: {
            id: location.inflowId,
            name: location.name,
          },
          counts: {
            activeInventory: units,
            salesOrders: salesOrdersCount,
            purchaseOrders: purchaseOrdersCount,
            transfers: transferOrdersCount,
          },
        },
        { status: 409 }
      );
    }

    /*
     * No dependencies.
     *
     * Do not physically delete the Location.
     * Mark it inactive and archived instead.
     */
    const updated = await prisma.location.update({
      where: {
        inflowId: id,
      },
      data: {
        isActive: false,
        status: "INACTIVE",
        deletedAt: new Date(),
      },
      select: {
        inflowId: true,
        name: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully removed "${updated.name}".`,
      locationId: updated.inflowId,
    });
  } catch (error) {
    console.error("DELETE /api/admin/locations/[id] failed:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          error: "Database error while removing location.",
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to delete location.",
      },
      { status: 500 }
    );
  }
}
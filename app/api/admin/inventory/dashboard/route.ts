import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Fetch KPI Aggregates & Low Stock Counts
    const [inventories, pendingTransfersCount] = await Promise.all([
      prisma.inventory.findMany({
        select: {
          quantityOnHand: true,
          reorderThreshold: true,
          product: {
            select: {
              cost: {
                select: {
                  cost: true,
                },
              },
            },
          },
        },
      }),
      // Assuming pending transfers can be derived from Transfer Order lines or ledgers
      prisma.inventoryLedger.count({
        where: {
          transactionType: {
            in: ["TRANSFER_IN", "TRANSFER_OUT"],
          },
          // Adjust conditions based on your TransferOrder model if available
        },
      }),
    ]);

    // Calculate Total Inventory Value and Low Stock Count in memory
    let totalValue = 0;
    let lowStockCount = 0;

    inventories.forEach((inv) => {
      const qty = Number(inv.quantityOnHand || 0);
      const unitCost = Number(inv.product?.cost?.cost || 0);
      const threshold = Number(inv.reorderThreshold || 0);

      totalValue += qty * unitCost;

      if (qty <= threshold) {
        lowStockCount++;
      }
    });

    // 2. Fetch Recent Inventory Adjustments
    const recentAdjustments = await prisma.inventoryAdjustment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        adjustmentNumber: true,
        status: true,
        createdAt: true,
        remarks: true,
        adjustmentReason: {
          select: {
            name: true,
          },
        },
        performedBy: {
          select: {
            // Adjust fields according to your TeamMember model
            id: true,
          },
        },
        lines: {
          select: {
            id: true,
          },
        },
      },
    });

    // Formatted Recent Adjustments response
    const formattedAdjustments = recentAdjustments.map((adj) => ({
      id: adj.id,
      adjustmentNumber: adj.adjustmentNumber,
      reason: adj.adjustmentReason?.name || adj.remarks || "General Adjustment",
      performedBy: adj.performedBy?.id || "System",
      itemCount: adj.lines.length,
      status: adj.status,
      createdAt: adj.createdAt,
    }));

    // 3. Fetch Top Moving Products (Aggregated by total ledger quantity changes)
    const topMovingLedgers = await prisma.inventoryLedger.groupBy({
      by: ["productId"],
      _sum: {
        quantityChange: true,
      },
      orderBy: {
        _sum: {
          quantityChange: "desc",
        },
      },
      take: 5,
    });

    const topProductIds = topMovingLedgers.map((item) => item.productId);

    // Fetch details for top products
    const topProducts = await prisma.product.findMany({
      where: {
        inflowId: { in: topProductIds },
      },
      select: {
        inflowId: true,
        sku: true,
        name: true,
        inventories: {
          select: {
            quantityOnHand: true,
            reorderThreshold: true,
          },
        },
      },
    });

    const formattedTopProducts = topMovingLedgers.map((m) => {
      const prod = topProducts.find((p) => p.inflowId === m.productId);
      const totalOnHand = prod?.inventories.reduce(
        (acc, inv) => acc + Number(inv.quantityOnHand),
        0
      ) ?? 0;
      const totalReorder = prod?.inventories.reduce(
        (acc, inv) => acc + Number(inv.reorderThreshold),
        0
      ) ?? 0;

      return {
        sku: prod?.sku || "N/A",
        name: prod?.name || "Unknown Product",
        movedQty: Math.abs(Number(m._sum.quantityChange || 0)),
        status: totalOnHand <= totalReorder ? "LOW_STOCK" : "IN_STOCK",
      };
    });

    // 4. Warehouse Utilization & Sublocation Capacity
    const locations = await prisma.location.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        inflowId: true,
        name: true,
        sublocations: {
          select: {
            id: true,
            inventoryBins: {
              select: {
                id: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    const warehouseUtilization = locations.map((loc) => {
      const totalBins = loc.sublocations.length;
      const filledBins = loc.sublocations.filter((sub) =>
        sub.inventoryBins.some((bin) => Number(bin.quantity) > 0)
      ).length;

      const occupiedPercent = totalBins > 0 ? Math.round((filledBins / totalBins) * 100) : 0;

      return {
        name: loc.name,
        occupied: occupiedPercent,
        totalBins,
        filledBins,
      };
    });

    // 5. Stock Movement Chart Data (30-day breakdown grouped into 4 weekly buckets)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ledgerMovements = await prisma.inventoryLedger.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
        quantityChange: true,
      },
    });

    // Bucket into 4 weeks for simple chart rendering
    const weeklyChartData = [0, 0, 0, 0];
    const now = new Date().getTime();

    ledgerMovements.forEach((movement) => {
      const diffInDays = Math.floor(
        (now - new Date(movement.createdAt).getTime()) / (1000 * 3600 * 24)
      );
      const weekIndex = Math.min(3, Math.floor(diffInDays / 7.5));
      weeklyChartData[3 - weekIndex] += Math.abs(Number(movement.quantityChange));
    });

    // Final response object structuring matching your Dashboard frontend
    return NextResponse.json({
      kpis: {
        totalValue,
        lowStockCount,
        pendingTransfers: pendingTransfersCount,
      },
      recentAdjustments: formattedAdjustments,
      topMovingProducts: formattedTopProducts,
      warehouseUtilization,
      movementChart: weeklyChartData,
    });
  } catch (error) {
    console.error("Failed to fetch inventory dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}
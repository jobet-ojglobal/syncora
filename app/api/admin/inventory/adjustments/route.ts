import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Query Params
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const reason = searchParams.get("reason");
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

    // 1. Build Prisma Where Clause
    const where: Prisma.InventoryAdjustmentWhereInput = {
      AND: [
        // Search Filter across reference #, notes, user name/email, product, or location
        search
          ? {
              OR: [
                { adjustmentNumber: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                {
                  performedBy: {
                    OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                    ],
                  },
                },
                {
                  lines: {
                    some: {
                      OR: [
                        { product: { name: { contains: search, mode: "insensitive" } } },
                        { product: { sku: { contains: search, mode: "insensitive" } } },
                        { location: { name: { contains: search, mode: "insensitive" } } },
                      ],
                    },
                  },
                },
              ],
            }
          : {},
        // Enum Filters
        status ? { status: status as any } : {},
        reason ? { reason: reason as any } : {},
      ],
    };

    // 2. Fetch Paginated Records and Total Count concurrently
    const [totalRecords, rawAdjustments] = await Promise.all([
      prisma.inventoryAdjustment.count({ where }),
      prisma.inventoryAdjustment.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          lines: {
            include: {
              location: {
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

    // 3. Format payload to match the List Component UI interface
    const formattedData = rawAdjustments.map((adj) => {
      // Extract unique warehouse/location names involved in this adjustment
      const warehouseNames = Array.from(
        new Set(adj.lines.map((l) => l.location.name))
      );
      const primaryWarehouse =
        warehouseNames.length > 1
          ? `${warehouseNames[0]} (+${warehouseNames.length - 1} more)`
          : warehouseNames[0] || "Main Warehouse";

      // Calculate total SKUs and Net Quantity shift
      const totalItemsAdjusted = adj.lines.length;
      const netQuantityDelta = adj.lines.reduce(
        (sum, line) => sum + Number(line.quantityAdjusted),
        0
      );

      // Map internal status/reason to user-friendly titles
      return {
        id: adj.id,
        referenceNo: adj.adjustmentNumber,
        reason: formatReasonLabel(adj.reason),
        status: formatStatusLabel(adj.status),
        adjustedBy: {
          name: adj.performedBy?.name || "System User",
          email: adj.performedBy?.email || "N/A",
        },
        warehouseName: primaryWarehouse,
        totalItemsAdjusted,
        netQuantityDelta,
        createdAt: adj.createdAt.toISOString(),
      };
    });

    const pageCount = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      data: formattedData,
      totalRecords,
      pageCount,
      pageIndex: page,
      pageSize: limit,
    });
  } catch (error: any) {
    console.error("[INVENTORY_ADJUSTMENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory adjustments", details: error.message },
      { status: 500 }
    );
  }
}

// Helpers for string formatting
function formatReasonLabel(reason: string): string {
  const map: Record<string, string> = {
    STOCK_COUNT: "Restock",
    DAMAGE: "Damaged",
    LOSS: "Write-off",
    THEFT: "Stolen",
    EXPIRED: "Expired",
    RETURN: "Return",
    CORRECTION: "Correction",
    MANUAL: "Other",
  };
  return map[reason] || reason;
}

function formatStatusLabel(status: string): "Draft" | "Approved" | "Cancelled" {
  const map: Record<string, "Draft" | "Approved" | "Cancelled"> = {
    DRAFT: "Draft",
    POSTED: "Approved",
    VOIDED: "Cancelled",
  };
  return map[status] || "Draft";
}

const adjustmentSchema = z.object({
  reason: z.enum([
    "STOCK_COUNT",
    "DAMAGE",
    "LOSS",
    "THEFT",
    "EXPIRED",
    "RETURN",
    "CORRECTION",
    "MANUAL",
  ]),
  notes: z.string().optional(),
  performedById: z.string().min(1, "User ID is required"),
  status: z.enum(["DRAFT", "POSTED"]),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        locationId: z.string().min(1),
        sublocationId: z.string().nullable().optional(),
        quantityBefore: z.number(),
        quantityAdjusted: z.number(),
        quantityAfter: z.number(),
        reason: z.string().optional(),
        serials: z
          .array(
            z.object({
              serialNumber: z.string().min(1),
              inventoryItemId: z.string().optional(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .min(1, "At least one adjustment line is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = adjustmentSchema.parse(body);

    const adjustmentNumber = `ADJ-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the master Adjustment Record and Lines
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          adjustmentNumber,
          reason: validated.reason,
          notes: validated.notes,
          performedById: validated.performedById,
          status: validated.status,
          lines: {
            create: validated.lines.map((line) => ({
              productId: line.productId,
              locationId: line.locationId,
              sublocationId: line.sublocationId || null,
              quantityBefore: line.quantityBefore,
              quantityAdjusted: line.quantityAdjusted,
              quantityAfter: line.quantityAfter,
              reason: line.reason,
              serials: {
                create: line.serials.map((s) => ({
                  serialNumber: s.serialNumber,
                  inventoryItemId: s.inventoryItemId || null,
                })),
              },
            })),
          },
        },
        include: {
          lines: {
            include: { serials: true },
          },
        },
      });

      // 2. If status is DRAFT, stop here and return saved document
      if (validated.status === "DRAFT") {
        return adjustment;
      }

      // 3. Process Inventory mutations if status is POSTED
      for (const line of validated.lines) {
        const sublocationId = line.sublocationId || null;

        // A. Upsert Main Inventory Record
        const existingInventory = await tx.inventory.findUnique({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: line.locationId,
            },
          },
        });

        const currentQtyOnHand = existingInventory ? Number(existingInventory.quantityOnHand) : 0;
        const newQtyOnHand = currentQtyOnHand + line.quantityAdjusted;

        await tx.inventory.upsert({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: line.locationId,
            },
          },
          create: {
            productId: line.productId,
            locationId: line.locationId,
            quantityOnHand: line.quantityAdjusted,
            quantityAvailable: line.quantityAdjusted,
            lastCountedAt: new Date(),
            lastMovementAt: new Date(),
          },
          update: {
            quantityOnHand: { increment: line.quantityAdjusted },
            quantityAvailable: { increment: line.quantityAdjusted },
            lastCountedAt: new Date(),
            lastMovementAt: new Date(),
          },
        });

        // B. Handle Bin Allocations if a sublocation was provided
        if (sublocationId) {
          const inventory = await tx.inventory.findUniqueOrThrow({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: line.locationId,
              },
            },
          });

          await tx.inventoryBin.upsert({
            where: {
              inventoryId_sublocationId: {
                inventoryId: inventory.id,
                sublocationId: sublocationId,
              },
            },
            create: {
              inventoryId: inventory.id,
              sublocationId: sublocationId,
              quantity: line.quantityAdjusted,
            },
            update: {
              quantity: { increment: line.quantityAdjusted },
            },
          });
        }

        // C. Reconcile Serial Numbers
        if (line.serials && line.serials.length > 0) {
          for (const serial of line.serials) {
            if (line.quantityAdjusted > 0) {
              // Stock increase -> create or mark IN_STOCK
<<<<<<< HEAD
              await tx.inventoryItem.upsert({
                where: {
                  productId_locationId_serialNumber: {
=======
              await tx.inventoryBinItem.upsert({
                where: {
                  productId: {
>>>>>>> 4f3e478e359a814e5626cd9876600434acbd2fac
                    productId: line.productId,
                    locationId: line.locationId,
                    serialNumber: serial.serialNumber,
                  },
                },
                create: {
                  productId: line.productId,
                  locationId: line.locationId,
<<<<<<< HEAD
                  sublocationId: sublocationId, // Binned or null for floor
=======
                  inventoryBinId: sublocationId, // Binned or null for floor
>>>>>>> 4f3e478e359a814e5626cd9876600434acbd2fac
                  serialNumber: serial.serialNumber,
                  status: "IN_STOCK",
                },
                update: {
                  status: "IN_STOCK",
<<<<<<< HEAD
                  sublocationId: sublocationId,
=======
                  inventoryBinId: sublocationId,
>>>>>>> 4f3e478e359a814e5626cd9876600434acbd2fac
                },
              });
            } else if (line.quantityAdjusted < 0) {
              // Stock decrease -> soft remove or delete
<<<<<<< HEAD
              await tx.inventoryItem.deleteMany({
=======
              await tx.inventoryBinItem.deleteMany({
>>>>>>> 4f3e478e359a814e5626cd9876600434acbd2fac
                where: {
                  productId: line.productId,
                  locationId: line.locationId,
                  serialNumber: serial.serialNumber,
                },
              });
            }
          }
        }

        // D. Create Audit Log (InventoryLedger)
        await tx.inventoryLedger.create({
          data: {
            productId: line.productId,
            locationId: line.locationId,
            sublocationId: sublocationId,
            transactionType: "ADJUSTMENT",
            referenceType: "ADJUSTMENT",
            referenceId: adjustment.id,
            performedById: validated.performedById,
            quantityChange: line.quantityAdjusted,
            quantityBefore: line.quantityBefore,
            quantityAfter: line.quantityAfter,
            remarks: line.reason || validated.notes || `Stock Adjustment ${adjustmentNumber}`,
          },
        });
      }

      return adjustment;
    });

    return NextResponse.json(
      { message: "Adjustment saved successfully", data: result },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[INVENTORY_ADJUSTMENT_POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
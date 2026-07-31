import { AdjustmentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export class AdjustmentService {
  /**
   * Fetches an existing Inventory draft by ID and formats it
   * into the initial form state required by the create form.
   */
  static async getInventoryInitialData(inventoryId: string) {
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      select: {
        id: true,
        productId: true,
        locationId: true,
        quantityOnHand: true,
        quantityReserved: true,
        quantityAvailable: true,
        product: {
          select: {
            inflowId: true,
            name: true,
            sku: true,
            trackSerials: true,
            images: {
              orderBy: { position: "asc" },
              take: 1,
              select: { thumbUrl: true, originalUrl: true },
            },
          },
        },
        location: {
          select: {
            inflowId: true,
            name: true,
            sublocations: {
              select: { id: true, name: true, locationId: true },
            },
          },
        },
        bins: {
          include: {
            sublocation: {
              select: {
                id: true,
                name: true,
              },
            },
            inventoryBinItems: {
              where: {
                status: "IN_STOCK",
              },
              select: {
                id: true,
                serialNumber: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      return null;
    }

    // 1. Fetch unassigned serial numbers (inventoryBinId is null)
    const unassignedItems = await prisma.inventoryBinItem.findMany({
      where: {
        productId: inventory.productId,
        locationId: inventory.locationId,
        inventoryBinId: null,
        status: "IN_STOCK",
      },
      select: {
        serialNumber: true,
      },
    });

    const unassignedSerials = unassignedItems
      .map((item) => item.serialNumber)
      .filter((sn): sn is string => Boolean(sn));

    const formattedProduct = {
      inflowId: inventory.product.inflowId,
      name: inventory.product.name,
      sku: inventory.product.sku,
      thumbnail:
        inventory.product.images[0]?.thumbUrl ||
        inventory.product.images[0]?.originalUrl ||
        null,
      trackSerials: inventory.product.trackSerials,
    };

    // 2. Map Assigned Bins only
    const bins = (inventory.bins || []).map((bin) => {
      const binSerials = (bin.inventoryBinItems || [])
        .map((item) => item.serialNumber)
        .filter((sn): sn is string => Boolean(sn));

      return {
        id: bin.id,
        sublocationId: bin.sublocationId || bin.sublocation?.id || "",
        sublocationName: bin.sublocation?.name || "",
        quantity: Number(bin.quantity) || 0,
        serials: binSerials,
      };
    });

    // 3. Extract Root Quantities from Inventory
    const totalOnHand = Number(inventory.quantityOnHand) || 0;
    const reservedQty = Number(inventory.quantityReserved) || 0;
    const availableQty =
      inventory.quantityAvailable !== null
        ? Number(inventory.quantityAvailable)
        : Math.max(0, totalOnHand - reservedQty);

    // 4. Combine all binned serials + unassigned serials for the line item
    const binnedSerials = bins.flatMap((bin) => bin.serials);
    const allSerials = Array.from(
      new Set([...binnedSerials, ...unassignedSerials])
    );

    // 5. Map to Adjustment Line Schema
    const lineItem = {
      id: inventory.id,
      product: formattedProduct,
      quantityBefore: totalOnHand,
      quantityAdjusted: 0,
      quantityOnHand: totalOnHand, // Full total (includes floor stock)
      quantityReserved: reservedQty,
      quantityAvailable: availableQty,
      bins: bins,                  // Real bins only
      serials: allSerials,          // Binned + Unassigned serials
    };

    // 6. Return complete Form Payload
    const formData = {
      id: undefined,
      inventoryId: inventory.id,
      locationId: inventory.locationId || "",
      performedById: "",
      reasonId: "",
      remarks: "",
      status: "DRAFT" as const,
      lines: [lineItem],
      location: inventory.location,
    };

    return formData;
  }

  /**
   * Fetches and crafts initial data for editing a draft inventory adjustment.
   */
  static async getAdjustmentForEdit(adjustmentId: string) {
    const adjustment = await prisma.inventoryAdjustment.findFirst({
      where: {
        id: adjustmentId,
        status: AdjustmentStatus.DRAFT,
      },
      include: {
        lines: {
          include: {
            product: {
              select: {
                inflowId: true,
                name: true,
                sku: true,
                trackSerials: true,
                images: {
                  orderBy: { position: "asc" },
                  take: 1,
                  select: { thumbUrl: true, originalUrl: true },
                },
              },
            },
            location: {
              select: {
                inflowId: true,
                name: true,
                sublocations: {
                  select: { id: true, name: true, locationId: true },
                },
              },
            },
            // 1. Fetch Draft Bins along with their specific linked Serials
            draftBins: {
              include: {
                sublocation: {
                  select: { id: true, name: true },
                },
                serials: {
                  select: {
                    id: true,
                    serialNumber: true,
                  },
                },
              },
            },
            // 2. Fetch all Line-level Serials (including any unassigned to a draft bin)
            serials: {
              select: {
                id: true,
                serialNumber: true,
                draftBinId: true,
              },
            },
          },
        },
      },
    });

    if (!adjustment) {
      return null;
    }

    if (adjustment.status !== "DRAFT") {
      throw new Error("Only draft adjustments can be edited.");
    }

    // Extract primary location from the first line (if available)
    const primaryLine = adjustment.lines[0];

    return {
      id: adjustment.id,
      inventoryId: primaryLine?.inventoryId || null,
      locationId: primaryLine?.locationId || "",
      performedById: adjustment.performedById,
      reasonId: adjustment.adjustmentReasonId || "",
      remarks: adjustment.remarks || "",
      status: adjustment.status as "DRAFT",
      location: primaryLine?.location
        ? {
            inflowId: primaryLine.location.inflowId,
            name: primaryLine.location.name,
            sublocations: primaryLine.location.sublocations.map((sub) => ({
              id: sub.id,
              name: sub.name,
              locationId: sub.locationId,
            })),
          }
        : {
            inflowId: "",
            name: "",
            sublocations: [],
          },
      lines: adjustment.lines.map((line) => {
        const qtyBefore = Number(line.quantityBefore);
        const qtyAdjusted = Number(line.quantityAdjusted);

        // Extract all serials for the overall line
        const lineSerialNumbers = line.serials.map((s) => s.serialNumber);

        // Map draft bins using their directly linked serials
        const formattedBins = line.draftBins.map((bin) => ({
          id: bin.id,
          sublocationId: bin.sublocationId,
          sublocationName: bin.sublocation?.name || "",
          quantity: Number(bin.quantity),
          // Returns ONLY the serial numbers tied to this specific draft bin
          serials: bin.serials.map((s) => s.serialNumber), 
        }));

        return {
          id: line.id,
          productId: line.productId,
          product: {
            inflowId: line.product.inflowId,
            name: line.product.name,
            sku: line.product.sku,
            thumbnail:
              line.product.images[0]?.thumbUrl ??
              line.product.images[0]?.originalUrl ??
              null,
            trackSerials: line.product.trackSerials,
          },
          quantityBefore: qtyBefore,
          quantityAdjusted: qtyAdjusted,
          quantityOnHand: Number(line.quantityAfter),
          quantityReserved: Number(line.quantityReserved || 0),
          quantityAvailable: Number(line.quantityAfter),
          bins: formattedBins,
          serials: lineSerialNumbers,
          reason: line.reason || "",
        };
      }),
    };
  }
 
}
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
 * Fetches an existing InventoryAdjustment draft by ID and formats it
 * into the exact initialData payload required by InventoryFormProps.
 */
static async getAdjustmentData2(adjustmentId: string) {
  // 1. Fetch adjustment with lines, product metadata, and location details
  const adjustment = await prisma.inventoryAdjustment.findUnique({
    where: { id: adjustmentId },
    include: {
      adjustmentReason: true,
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
        },
      },
    },
  });

  if (!adjustment) {
    return null;
  }

  // 2. Ensure only valid editable statuses are processed
  if (adjustment.status !== "DRAFT" && adjustment.status !== "POSTED") {
    throw new Error("Only draft or posted adjustments can be loaded.");
  }

  // 3. Process each line item to map to LineItem interface
  const lines = await Promise.all(
    adjustment.lines.map(async (line) => {
      // Fetch live inventory for real-time quantity & bin metrics
      const liveInventory = await prisma.inventory.findUnique({
        where: {
          productId_locationId: {
            productId: line.productId,
            locationId: line.locationId,
          },
        },
        include: {
          bins: {
            include: {
              sublocation: { select: { id: true, name: true } },
              inventoryBinItems: {
                where: { status: "IN_STOCK" },
                select: { serialNumber: true },
              },
            },
          },
        },
      });

      // 1. Fetch unassigned serial numbers (inventoryBinId is null)
      const unassignedItems = await prisma.inventoryBinItem.findMany({
        where: {
          productId: line.productId,
          locationId: line.locationId,
          inventoryBinId: null,
          status: "IN_STOCK",
        },
        select: { serialNumber: true },
      });

      const unassignedSerials = unassignedItems
        .map((item) => item.serialNumber)
        .filter((sn): sn is string => Boolean(sn));

      // Map product object matching Product interface
      const formattedProduct = {
        inflowId: line.product.inflowId,
        name: line.product.name,
        sku: line.product.sku,
        thumbnail:
          line.product.images[0]?.thumbUrl ||
          line.product.images[0]?.originalUrl ||
          null,
        trackSerials: line.product.trackSerials,
      };

      // 2. Map Assigned Bins matching Bins[] interface
      const bins = (liveInventory?.bins || []).map((bin) => {
        const binSerials = (bin.inventoryBinItems || [])
          .map((item) => item.serialNumber)
          .filter((sn): sn is string => Boolean(sn));

        return {
          id: bin.id,
          sublocationId: bin.sublocationId || bin.sublocation?.id || "",
          quantity: Number(bin.quantity) || 0,
          serials: binSerials,
        };
      });

      // 3. Extract Root Quantities from Live Inventory or baseline
      const totalOnHand = liveInventory
        ? Number(liveInventory.quantityOnHand)
        : Number(line.quantityBefore) || 0;
      const reservedQty = liveInventory
        ? Number(liveInventory.quantityReserved || 0)
        : 0;
      const availableQty = liveInventory
        ? (liveInventory.quantityAvailable !== null
            ? Number(liveInventory.quantityAvailable)
            : Math.max(0, totalOnHand - reservedQty))
        : totalOnHand;

      // 4. Combine all binned serials + unassigned serials for the line item
      const binnedSerials = bins.flatMap((bin) => bin.serials);
      const allSerials = Array.from(
        new Set([...binnedSerials, ...unassignedSerials])
      );

      // 5. Map to LineItem Schema
      return {
        id: line.id,
        product: formattedProduct,
        quantityBefore: Number(line.quantityBefore) || totalOnHand,
        quantityOnHand: totalOnHand,
        quantityReserved: reservedQty,
        quantityAvailable: availableQty,
        bins: bins,
        serials: allSerials,
      };
    })
  );

  const primaryLine = adjustment.lines[0];

  // 6. Return complete Form Payload strictly matching initialData
  return {
    id: adjustment.id,
    inventoryId: primaryLine?.inventoryId || "",
    locationId: primaryLine?.locationId || "",
    performedById: adjustment.performedById || "",
    reasonId:  "",
    remarks: adjustment.remarks || "",
    status: adjustment.status as "DRAFT" | "POSTED",
    lines: lines,
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
  };
}
  
  /**
   * Fetches an existing InventoryAdjustment draft by ID and formats it
   * into the initial form state required by the edit form.
   */
  static async getAdjustmentData(adjustmentId: string) {
    // 1. Fetch adjustment with lines, products, locations, bins, and serials
    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id: adjustmentId },
      include: {
        adjustmentReason: true,
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
            inventoryBin: {
              include: {
                sublocation: {
                  select: { id: true, name: true },
                },
              },
            },
            serials: {
              include: {
                inventoryBinItem: {
                  select: {
                    id: true,
                    serialNumber: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!adjustment) {
      return null;
    }

    // 2. Prevent editing non-draft records
    if (adjustment.status !== "DRAFT") {
      throw new Error("Only draft adjustments can be edited.");
    }

    // Extract primary locationId from the first line item
    const primaryLocationId = adjustment.lines[0]?.locationId || "";
    const primaryLocation = adjustment.lines[0]?.location || null;

    // 3. Process line items and combine with live inventory counts
    const lines = await Promise.all(
      adjustment.lines.map(async (line) => {
        // Fetch current live inventory for real-time baseline metrics
        const liveInventory = await prisma.inventory.findUnique({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: line.locationId,
            },
          },
          include: {
            bins: {
              include: {
                sublocation: { select: { id: true, name: true } },
                inventoryBinItems: {
                  where: { status: "IN_STOCK" },
                  select: { serialNumber: true },
                },
              },
            },
          },
        });

        // Current live stock figures
        const currentOnHand = liveInventory
          ? Number(liveInventory.quantityOnHand)
          : Number(line.quantityBefore);
        const currentReserved = liveInventory
          ? Number(liveInventory.quantityReserved || 0)
          : 0;
        const currentAvailable = liveInventory
          ? Number(liveInventory.quantityAvailable ?? Math.max(0, currentOnHand - currentReserved))
          : currentOnHand;

        // Fetch unassigned serial numbers currently in stock
        const unassignedItems = await prisma.inventoryBinItem.findMany({
          where: {
            productId: line.productId,
            locationId: line.locationId,
            inventoryBinId: null,
            status: "IN_STOCK",
          },
          select: { serialNumber: true },
        });

        const unassignedSerials = unassignedItems
          .map((item) => item.serialNumber)
          .filter((sn): sn is string => Boolean(sn));

        // Format product images & metadata
        const formattedProduct = {
          inflowId: line.product.inflowId,
          name: line.product.name,
          sku: line.product.sku,
          thumbnail:
            line.product.images[0]?.thumbUrl ||
            line.product.images[0]?.originalUrl ||
            null,
          trackSerials: line.product.trackSerials,
        };

        // Format current bins
        const bins = (liveInventory?.bins || []).map((bin) => ({
          id: bin.id,
          sublocationId: bin.sublocationId || bin.sublocation?.id || "",
          sublocationName: bin.sublocation?.name || "",
          quantity: Number(bin.quantity) || 0,
          serials: (bin.inventoryBinItems || [])
            .map((item) => item.serialNumber)
            .filter((sn): sn is string => Boolean(sn)),
        }));

        // Combine binned + unassigned serial numbers
        const binnedSerials = bins.flatMap((b) => b.serials);
        const availableSerials = Array.from(
          new Set([...binnedSerials, ...unassignedSerials])
        );

        // Format serials assigned specifically inside this adjustment line
        const selectedSerials = line.serials.map((s) => s.serialNumber);

        return {
          id: line.id,
          inventoryId: line.inventoryId,
          productId: line.productId,
          locationId: line.locationId,
          product: formattedProduct,
          quantityBefore: Number(line.quantityBefore),
          quantityAdjusted: Number(line.quantityAdjusted),
          quantityAfter: Number(line.quantityAfter),
          quantityOnHand: currentOnHand,
          quantityReserved: currentReserved,
          quantityAvailable: currentAvailable,
          reason: line.reason || null,
          bins,
          serials: availableSerials,
          selectedSerials,
        };
      })
    );

    // 4. Return formatted adjustment form payload
    return {
      id: adjustment.id,
      adjustmentNumber: adjustment.adjustmentNumber,
      inventoryId: lines[0]?.inventoryId || undefined,
      locationId: primaryLocationId,
      performedById: adjustment.performedById,
      reasonId: adjustment.adjustmentReasonId || "",
      remarks: adjustment.remarks || "",
      status: adjustment.status as AdjustmentStatus,
      lines,
      location: primaryLocation,
    };
  }
}
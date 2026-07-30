import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface LedgerFilterParams {
  productId?: string;
  locationId?: string;
  transactionType?: string;
  referenceType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class InventoryService {

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
      notes: "",
      status: "DRAFT" as const,
      lines: [lineItem],
      location: inventory.location,
    };

    return formData;
  }

  static async getLedgerEntries(params: LedgerFilterParams) {
    const {
      productId,
      locationId,
      transactionType,
      referenceType,
      search,
      page = 1,
      limit = 50,
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.InventoryLedgerWhereInput = {
      ...(productId && { productId }),
      ...(locationId && { locationId }),
      ...(transactionType && { transactionType: transactionType as any }),
      ...(referenceType && { referenceType: referenceType as any }),
      ...(search && {
        OR: [
          { product: { name: { contains: search, mode: "insensitive" } } },
          { product: { slug: { contains: search, mode: "insensitive" } } },
          { remarks: { contains: search, mode: "insensitive" } },
          { batchNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      prisma.inventoryLedger.count({ where }),
      prisma.inventoryLedger.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: { name: true, slug: true },
          },
          location: {
            select: { name: true },
          },
          sublocation: {
            select: { name: true },
          },
          performedBy: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getGlobalInventory() {
    const stockItems = await prisma.inventory.findMany({
      include: {
        product: {
          select: {
            inflowId: true,
            name: true,
            slug: true,
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
            name: true,
          },
        },
        bins: {
          include: {
            sublocation: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const activeInTransitLines = await prisma.transferOrderLine.findMany({
      where: {
        transferOrder: {
          status: "IN_TRANSIT",
        },
      },
      include: {
        transferOrder: {
          select: {
            sourceLocationId: true,
            transferNumber: true,
          },
        },
      },
    });

    const inTransitMap: Record<string, number> = {};

    activeInTransitLines.forEach((line) => {
      const key = `${line.productId}_${line.transferOrder.sourceLocationId}`;

      inTransitMap[key] =
        (inTransitMap[key] || 0) + Number(line.quantity);
    });

    

    return stockItems.map((item) => {
      const lookupKey = `${item.productId}_${item.locationId}`;

      const formattedProduct = {
          inflowId: item.product.inflowId,
          name: item.product.name,
          sku: item.product.sku,
          slug: item.product.slug,
          thumbnail:
            item.product.images[0]?.thumbUrl ||
            item.product.images[0]?.originalUrl ||
            null,
          trackSerials: item.product.trackSerials,
        };

      return {
        id: item.id,
        product: formattedProduct,

        locationId: item.locationId,
        locationName: item.location.name,

        quantityOnHand: Number(item.quantityOnHand),
        quantityReserved: Number(item.quantityReserved || 0),
        quantityAvailable: Number(item.quantityAvailable || 0),

        quantityInTransit: inTransitMap[lookupKey] || 0,

        bins: item.bins.map((bin) => ({
          id: bin.id,
          sublocationName: bin.sublocation.name,
          quantity: Number(bin.quantity),
        })),
      };
    });
  }

  static async getInventoryLedger() {
    const stockItems = await prisma.inventory.findMany({
      include: {
        product: {
          select: { name: true, slug: true }
        },
        location: {
          select: { name: true }
        },
        bins: {
          include: {
            sublocation: { select: { name: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return stockItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productSlug: item.product.slug,
      locationId: item.locationId,
      locationName: item.location.name,
      quantityOnHand: Number(item.quantityOnHand),
      quantityReserved: Number(item.quantityReserved || 0),
      quantityAvailable: Number(item.quantityAvailable || 0),
      bins: item.bins.map(b => ({
        id: b.id,
        sublocationName: b.sublocation.name,
        quantity: Number(b.quantity)
      }))
    }));
  }
}


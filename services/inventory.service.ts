import { prisma } from "@/lib/prisma";

export class InventoryService {
  static async getInventoryLedgerWthIntransit() {
    const stockItems = await prisma.inventory.findMany({
      include: {
        product: {
          select: {
            name: true,
            slug: true,
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

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,

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



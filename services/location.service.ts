'use server only';

import { prisma } from "@/lib/prisma";

export class LocationService {
  static async getLocations() {
    const locations = await prisma.location.findMany({
      where: {
        deletedAt: null
      },
      include: {
        address: true,
        _count: {
          select: {
            sublocations: true, // Number of storage zones/aisles mapped
            inventories: true,  // Total product items actively stocked here
            salesOrders: true,
            
          }
        },
        sublocations: {
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: "asc" }
        }
      },
      orderBy: { isDefault: "desc" }, // Keep your global system baseline site at the top
    });

    return locations.map((loc) => ({
      id: loc.id,
      inflowId: loc.inflowId,
      name: loc.name,
      isActive: loc.isActive,
      isDefault: loc.isDefault,
      formattedAddress: loc.address 
        ? `${loc.address.city || ""}, ${loc.address.state || ""} ${loc.address.postalCode || ""}`.trim().replace(/^,/, "")
        : null,
      sublocationsCount: loc._count.sublocations,
      inventoryItemsCount: loc._count.inventories,
      sublocationsList: loc.sublocations,
    }));
  }

  static async softDelete(id: string) {
     return await prisma.location.update({
        where: { id },
        data: {
          deletedAt: new Date()
      },
    });
  }

  static async getLocationURL(inflowId: string) {
    return await prisma.location.findUnique({
      where: { inflowId },
      select: { inflowId: true, url: true, name: true }
    });
  }

  static async getLocationURLs() {
    return await prisma.location.findMany({
      select: { inflowId: true, url: true, name: true }
    });
  }

  static async getBasicLocation(id: string) {
    return prisma.location.findUnique({
      where: {
        id,
      },
      include: {
        address: true,
        sublocations: {
           select: {
              id: true,
              name: true,
            },
            orderBy: { name: "asc" }
        }
      }
    });
  }
}
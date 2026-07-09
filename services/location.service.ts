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
            sublocations: true, 
            inventories: true,  
            teamLocations: true,
            // Get total sales orders and broken-down statuses
            salesOrders: true,
          }
        },
        // Optional: If you want to count open vs completed orders specifically
        salesOrders: {
          where: { isCompleted: false, isCancelled: false },
          select: { id: true }
        },
        sublocations: {
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: "asc" }
        }
      },
      orderBy: { isDefault: "desc" }, 
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
      teamMembersCount: loc._count.teamLocations,
      
      // Added Sales Order Data
      totalSalesOrdersCount: loc._count.salesOrders,
      activeSalesOrdersCount: loc.salesOrders.length, // Filtered active count
      
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
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

  static async getBasicLocation(id: string) {
    const loc = await prisma.location.findUnique({
      where: { id },
      include: {
        address: true,
        _count: {
          select: {
            sublocations: true, 
            inventories: true,  
            teamLocations: true,
            salesOrders: true,
            
            // Added multi-tenant override mappings to count object aggregation
            localTaxingSchemeMappings: true,
            localCurrencyMappings: true,
            localPaymentTermMappings: true,
            localProductCostAdjustmentMappings: true,
            localProductBarcodeMappings: true,
            localCategoryMappings: true,
            localPricingSchemeMappings: true,
            localCustomerBalanceMappings: true,
            localVendorCreditMappings: true,
          }
        },
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
    });

    if (!loc) return null;

    return {
      id: loc.id,
      inflowId: loc.inflowId,
      name: loc.name,
      address: loc.address,
      isActive: loc.isActive,
      isDefault: loc.isDefault,
      formattedAddress: loc.address 
        ? `${loc.address.city || ""}, ${loc.address.state || ""} ${loc.address.postalCode || ""}`.trim().replace(/^,/, "")
        : null,
      sublocationsCount: loc._count.sublocations,
      inventoryItemsCount: loc._count.inventories,
      teamMembersCount: loc._count.teamLocations,
      
      totalSalesOrdersCount: loc._count.salesOrders,
      activeSalesOrdersCount: loc.salesOrders.length,
      url: loc.url,
      
      sublocationsList: loc.sublocations,

      // Flattened structural counts sent downstream to your dashboard grids
      mappings: {
        taxingSchemesCount: loc._count.localTaxingSchemeMappings,
        currenciesCount: loc._count.localCurrencyMappings,
        paymentTermsCount: loc._count.localPaymentTermMappings,
        costAdjustmentsCount: loc._count.localProductCostAdjustmentMappings,
        barcodesCount: loc._count.localProductBarcodeMappings,
        categoriesCount: loc._count.localCategoryMappings,
        pricingSchemesCount: loc._count.localPricingSchemeMappings,
        customerBalancesCount: loc._count.localCustomerBalanceMappings,
        vendorCreditsCount: loc._count.localVendorCreditMappings,
      }
    }
  }
}
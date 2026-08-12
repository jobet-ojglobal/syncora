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

            localProductMappings: true,
            localCustomerMappings: true,
            localVendorMappings: true,
            sublocationLocalMappings: true,
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
            linkedLocationId: true, // Included linkedLocationId field
            linkedLocation: {      // Included linked location details
              select: {
                id: true,
                inflowId: true,
                name: true,
              }
            }
          },
          orderBy: { name: "asc" }
        },
        linkedSublocation: { 
          select: {
            id: true,
            name: true,
          },
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

      linkedSublocation: loc.linkedSublocation,

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

        customersCount: loc._count.localCustomerMappings,
        vendorsCount: loc._count.localVendorMappings,
        productsCount: loc._count.localProductMappings,
        locationsCount: loc._count.sublocationLocalMappings,
      }
    };
  }

  static async permanentDelete(locationId: string, targetLocationId: string) {
    await prisma.$transaction(async (tx) => {
      // Step 1: Reassign open Sales & Purchase Orders to a new location
      if (targetLocationId) {
        await tx.salesOrder.updateMany({
          where: { locationId },
          data: { locationId: targetLocationId },
        });

        await tx.purchaseOrder.updateMany({
          where: { locationId },
          data: { locationId: targetLocationId },
        });
      }

      // Step 2: Delete empty inventory balances
      await tx.inventory.deleteMany({
        where: { locationId, quantityOnHand: 0 },
      });

      // Step 3: Remove sublocations and sublocation mappings
      await tx.sublocationLocationMap.deleteMany({
        where: { locationId },
      });
      await tx.sublocation.deleteMany({
        where: { locationId },
      });

      // Step 4: Remove location-specific mappings (Taxes, Pricing, Products)
      await tx.taxingSchemeLocationMap.deleteMany({ where: { locationId } });
      await tx.productLocationMap.deleteMany({ where: { locationId } });

      // Step 5: Remove associated LocationAddress
      await tx.locationAddress.deleteMany({
        where: { locationId },
      });

      // Step 6: Permanently delete the Location
      await tx.location.delete({
        where: { id: locationId },
      });
    });
  }
}
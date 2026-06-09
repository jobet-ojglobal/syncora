import { Prisma } from "@/generated/prisma/client";
import { InflowInventoryLine } from "../types";


export async function syncInventoryLines(
  tx: Prisma.TransactionClient,
  productId: string,
  inventoryLines: InflowInventoryLine[],
  syncedLocationsSet: Set<string>,    // Tracks locations across the loop
  syncedSublocationsSet: Set<string>  // Tracks locationId_sublocationName combinations
) {
  if (!inventoryLines.length) return;

  // 1. DYNAMIC LOCATION & SUBLOCATION SYNC
  for (const line of inventoryLines) {
    const locData = line.location;
    if (!locData) continue;

    // A. Sync Location if not already processed in this runtime
    if (!syncedLocationsSet.has(locData.locationId)) {
      await tx.location.upsert({
        where: { inflowId: locData.locationId },
        create: {
          inflowId: locData.locationId,
          name: locData.name,
          isActive: locData.isActive,
          isDefault: locData.isDefault,
          timestamp: locData.timestamp,
        },
        update: {
          name: locData.name,
          isActive: locData.isActive,
          isDefault: locData.isDefault,
          timestamp: locData.timestamp,
        },
      });

      // Sync Address relation
      if (locData.address) {
        await tx.locationAddress.upsert({
          where: { locationId: locData.locationId },
          create: {
            locationId: locData.locationId,
            address1: locData.address.address1,
            address2: locData.address.address2,
            city: locData.address.city,
            state: locData.address.state,
            country: locData.address.country,
            postalCode: locData.address.postalCode,
            remarks: locData.address.remarks,
            addressType: locData.address.addressType,
          },
          update: {
            address1: locData.address.address1,
            address2: locData.address.address2,
            city: locData.address.city,
            state: locData.address.state,
            country: locData.address.country,
            postalCode: locData.address.postalCode,
          },
        });
      }

      // Ensure base tracking always includes a "Default" sublocation fallback
      const defaultSubKey = `${locData.locationId}_Default`;
      await tx.sublocation.upsert({
        where: { locationId_name: { locationId: locData.locationId, name: "Default" } },
        create: { locationId: locData.locationId, name: "Default" },
        update: {},
      });
      syncedSublocationsSet.add(defaultSubKey);
      syncedLocationsSet.add(locData.locationId);
    }

    // B. Sync Dynamic Sublocation found on the inventory line
    const sublocationName = line.sublocation?.trim() || "Default";
    const sublocationKey = `${line.locationId}_${sublocationName}`;

    if (!syncedSublocationsSet.has(sublocationKey)) {
      await tx.sublocation.upsert({
        where: {
          locationId_name: {
            locationId: line.locationId,
            name: sublocationName,
          },
        },
        create: {
          locationId: line.locationId,
          name: sublocationName,
        },
        update: {},
      });
      syncedSublocationsSet.add(sublocationKey);
    }
  }

  // 2. AGGREGATE TOTALS FOR INVENTORY
  const locationTotals = new Map<string, Prisma.Decimal>();
  for (const line of inventoryLines) {
    const current = locationTotals.get(line.locationId) ?? new Prisma.Decimal(0);
    locationTotals.set(
      line.locationId,
      current.plus(new Prisma.Decimal(line.quantityOnHand))
    );
  }

  // 3. WRITE INVENTORY & BINS
  for (const [locationId, quantityOnHand] of locationTotals) {
    const inventory = await tx.inventory.upsert({
      where: {
        productId_locationId: { productId, locationId },
      },
      create: { productId, locationId, quantityOnHand },
      update: { quantityOnHand },
    });

    const linesForLocation = inventoryLines.filter((x) => x.locationId === locationId);

    for (const line of linesForLocation) {
      const sublocationName = line.sublocation?.trim() || "Default";

      // This fetch is guaranteed safe now without warnings
      const sublocation = await tx.sublocation.findUniqueOrThrow({
        where: {
          locationId_name: { locationId, name: sublocationName },
        },
      });

      await tx.inventoryBin.upsert({
        where: {
          productId_sublocationId: { productId, sublocationId: sublocation.id },
        },
        create: {
          inventoryId: inventory.id,
          productId,
          sublocationId: sublocation.id,
          quantity: new Prisma.Decimal(line.quantityOnHand),
        },
        update: {
          quantity: new Prisma.Decimal(line.quantityOnHand),
        },
      });
    }
  }
}
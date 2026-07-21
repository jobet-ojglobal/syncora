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
        },
        update: {
          name: locData.name,
          isActive: locData.isActive,
          isDefault: locData.isDefault,
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

  // 2. AGGREGATE TOTALS FOR INVENTORY PER LOCATION
  const locationTotals = new Map<string, Prisma.Decimal>();
  for (const line of inventoryLines) {
    const current = locationTotals.get(line.locationId) ?? new Prisma.Decimal(0);
    locationTotals.set(
      line.locationId,
      current.plus(new Prisma.Decimal(line.quantityOnHand ?? 0))
    );
  }

  // 3. WRITE INVENTORY & BINS WITH LEDGER AUDITING
  for (const [locationId, newTotalQty] of locationTotals) {
    // Fetch current state for ledger baseline comparison
    const existingInventory = await tx.inventory.findUnique({
      where: {
        productId_locationId: { productId, locationId },
      },
    });

    // Upsert main Inventory record
    const inventory = await tx.inventory.upsert({
      where: {
        productId_locationId: { productId, locationId },
      },
      create: {
        productId,
        locationId,
        quantityOnHand: newTotalQty,
        quantityAvailable: newTotalQty,
        quantityReserved: existingInventory?.quantityReserved ?? new Prisma.Decimal(0),
        lastMovementAt: new Date(),
      },
      update: {
        quantityOnHand: newTotalQty,
        quantityAvailable: newTotalQty.minus(existingInventory?.quantityReserved ?? new Prisma.Decimal(0)),
        lastMovementAt: new Date(),
      },
    });

    const linesForLocation = inventoryLines.filter((x) => x.locationId === locationId);

    // Process Bin allocations and individual Ledger entries
    for (const line of linesForLocation) {
      const sublocationName = line.sublocation?.trim() || "Default";
      const lineQty = new Prisma.Decimal(line.quantityOnHand ?? 0);
      const serialNumber = line.serial?.trim() || null;

      const sublocation = await tx.sublocation.findUniqueOrThrow({
        where: {
          locationId_name: { locationId, name: sublocationName },
        },
      });

      // 🚀 UPDATED: Query bin using inventoryId_sublocationId key
      const existingBin = await tx.inventoryBin.findUnique({
        where: {
          inventoryId_sublocationId: {
            inventoryId: inventory.id,
            sublocationId: sublocation.id,
          },
        },
      });

      const binQtyBefore = existingBin?.quantity ?? new Prisma.Decimal(0);
      const binQtyChange = lineQty.minus(binQtyBefore);

      // 🚀 UPDATED: Upsert bin using inventoryId_sublocationId key without productId field
      await tx.inventoryBin.upsert({
        where: {
          inventoryId_sublocationId: {
            inventoryId: inventory.id,
            sublocationId: sublocation.id,
            serialNumber: serialNumber,
          },
        },
        create: {
          inventoryId: inventory.id,
          sublocationId: sublocation.id,
          quantity: lineQty,
          serialNumber: serialNumber,
        },
        update: {
          quantity: lineQty,
        },
      });

      // Record transaction log in InventoryLedger if stock level changed
      if (!binQtyChange.equals(0)) {
        await tx.inventoryLedger.create({
          data: {
            productId,
            locationId,
            sublocationId: sublocation.id,
            transactionType: "OPENING_BALANCE",
            quantityBefore: binQtyBefore,
            quantityChange: binQtyChange,
            quantityAfter: lineQty,
            serialNumber: serialNumber,
            remarks: "System Inbound Inventory Sync",
          },
        });
      }
    }
  }
}

// import { Prisma } from "@/generated/prisma/client";
// import { InflowInventoryLine } from "../types";


// export async function syncInventoryLines(
//   tx: Prisma.TransactionClient,
//   productId: string,
//   inventoryLines: InflowInventoryLine[],
//   syncedLocationsSet: Set<string>,    // Tracks locations across the loop
//   syncedSublocationsSet: Set<string>  // Tracks locationId_sublocationName combinations
// ) {
//   if (!inventoryLines.length) return;

//   // 1. DYNAMIC LOCATION & SUBLOCATION SYNC
//   for (const line of inventoryLines) {
//     const locData = line.location;
//     if (!locData) continue;

//     // A. Sync Location if not already processed in this runtime
//     if (!syncedLocationsSet.has(locData.locationId)) {
//       await tx.location.upsert({
//         where: { inflowId: locData.locationId },
//         create: {
//           inflowId: locData.locationId,
//           name: locData.name,
//           isActive: locData.isActive,
//           isDefault: locData.isDefault,
//           // timestamp: locData.timestamp,
//         },
//         update: {
//           name: locData.name,
//           isActive: locData.isActive,
//           isDefault: locData.isDefault,
//           // timestamp: locData.timestamp,
//         },
//       });

//       // Sync Address relation
//       if (locData.address) {
//         await tx.locationAddress.upsert({
//           where: { locationId: locData.locationId },
//           create: {
//             locationId: locData.locationId,
//             address1: locData.address.address1,
//             address2: locData.address.address2,
//             city: locData.address.city,
//             state: locData.address.state,
//             country: locData.address.country,
//             postalCode: locData.address.postalCode,
//             remarks: locData.address.remarks,
//             addressType: locData.address.addressType,
//           },
//           update: {
//             address1: locData.address.address1,
//             address2: locData.address.address2,
//             city: locData.address.city,
//             state: locData.address.state,
//             country: locData.address.country,
//             postalCode: locData.address.postalCode,
//           },
//         });
//       }

//       // Ensure base tracking always includes a "Default" sublocation fallback
//       const defaultSubKey = `${locData.locationId}_Default`;
//       await tx.sublocation.upsert({
//         where: { locationId_name: { locationId: locData.locationId, name: "Default" } },
//         create: { locationId: locData.locationId, name: "Default" },
//         update: {},
//       });
//       syncedSublocationsSet.add(defaultSubKey);
//       syncedLocationsSet.add(locData.locationId);
//     }

//     // B. Sync Dynamic Sublocation found on the inventory line
//     const sublocationName = line.sublocation?.trim() || "Default";
//     const sublocationKey = `${line.locationId}_${sublocationName}`;

//     if (!syncedSublocationsSet.has(sublocationKey)) {
//       await tx.sublocation.upsert({
//         where: {
//           locationId_name: {
//             locationId: line.locationId,
//             name: sublocationName,
//           },
//         },
//         create: {
//           locationId: line.locationId,
//           name: sublocationName,
//         },
//         update: {},
//       });
//       syncedSublocationsSet.add(sublocationKey);
//     }
//   }

//   // 2. AGGREGATE TOTALS FOR INVENTORY
//   const locationTotals = new Map<string, Prisma.Decimal>();
//   for (const line of inventoryLines) {
//     const current = locationTotals.get(line.locationId) ?? new Prisma.Decimal(0);
//     locationTotals.set(
//       line.locationId,
//       current.plus(new Prisma.Decimal(line.quantityOnHand))
//     );
//   }

//   // 3. WRITE INVENTORY & BINS
//   for (const [locationId, quantityOnHand] of locationTotals) {
//     const inventory = await tx.inventory.upsert({
//       where: {
//         productId_locationId: { productId, locationId },
//       },
//       create: { productId, locationId, quantityOnHand },
//       update: { quantityOnHand },
//     });

//     const linesForLocation = inventoryLines.filter((x) => x.locationId === locationId);

//     for (const line of linesForLocation) {
//       const sublocationName = line.sublocation?.trim() || "Default";

//       // This fetch is guaranteed safe now without warnings
//       const sublocation = await tx.sublocation.findUniqueOrThrow({
//         where: {
//           locationId_name: { locationId, name: sublocationName },
//         },
//       });

//       await tx.inventoryBin.upsert({
//         where: {
//           productId_sublocationId: { productId, sublocationId: sublocation.id },
//         },
//         create: {
//           inventoryId: inventory.id,
//           productId,
//           sublocationId: sublocation.id,
//           quantity: new Prisma.Decimal(line.quantityOnHand),
//         },
//         update: {
//           quantity: new Prisma.Decimal(line.quantityOnHand),
//         },
//       });
//     }
//   }
// }
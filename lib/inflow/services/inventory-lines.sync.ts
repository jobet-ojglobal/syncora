// lib/inflow/services/inventory-lines.sync.ts
import { Prisma } from "@/generated/prisma/client";
import { InflowInventoryLine, InflowLocation } from "../types";
import { syncLocation } from "./location.sync";

type Tx = Prisma.TransactionClient;

type SyncCache = {
  verifiedLocationIds?: Set<string>;
};

const toDecimal = (value: string | number | null | undefined): Prisma.Decimal => {
  if (value === null || value === undefined || value === "") return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
};

export async function syncInventoryLines(
  tx: Tx,
  productId: string,
  inventoryLines: InflowInventoryLine[],
  caches?: SyncCache,
  selectedLocationIds?: string[]
) {
  if (!inventoryLines.length) return;

  // 1. Filter lines by selected location scope (if scoped)
  const linesToSync = selectedLocationIds?.length
    ? inventoryLines.filter(
        (line) => line.locationId && selectedLocationIds.includes(line.locationId)
      )
    : inventoryLines;

  if (!linesToSync.length) return;

  const verifiedLocations = caches?.verifiedLocationIds ?? new Set<string>();

  // 2. Ensure parent Locations exist in DB
  const uniqueLocationsToSync = new Map<string, InflowLocation>();
  for (const line of linesToSync) {
    if (line.location && !verifiedLocations.has(line.location.locationId)) {
      uniqueLocationsToSync.set(line.location.locationId, line.location);
    }
  }

  for (const [locId, locData] of uniqueLocationsToSync) {
    await syncLocation(tx, locData);
    verifiedLocations.add(locId);
  }

  // 3. Upsert Sublocations (Ignore empty strings / floor stock)
  const sublocationsToCreate: { locationId: string; name: string }[] = [];
  const requiredSublocationKeys = new Set<string>();

  for (const line of linesToSync) {
    const subName = line.sublocation?.trim();
    if (!line.locationId || !subName) continue; // Skip empty sublocation strings

    const subKey = `${line.locationId}_${subName}`;
    if (!requiredSublocationKeys.has(subKey)) {
      requiredSublocationKeys.add(subKey);
      sublocationsToCreate.push({ locationId: line.locationId, name: subName });
    }
  }

  if (sublocationsToCreate.length > 0) {
    await Promise.all(
      sublocationsToCreate.map((sub) =>
        tx.sublocation.upsert({
          where: {
            locationId_name: { locationId: sub.locationId, name: sub.name },
          },
          create: { locationId: sub.locationId, name: sub.name },
          update: {},
        })
      )
    );
  }

  // Fetch sublocation IDs map
  const targetLocationIds = [...new Set(linesToSync.map((l) => l.locationId))];
  const dbSublocations = await tx.sublocation.findMany({
    where: { locationId: { in: targetLocationIds } },
    select: { id: true, locationId: true, name: true },
  });

  const sublocationIdMap = new Map<string, string>();
  for (const sub of dbSublocations) {
    sublocationIdMap.set(`${sub.locationId}_${sub.name}`, sub.id);
  }

  // 4. Aggregations: Total Quantity & Serials
  const locationTotals = new Map<string, Prisma.Decimal>();
  const sublocationTotals = new Map<string, { sublocationId: string; totalQty: Prisma.Decimal }>();

  // Track serial items with quantity state
  const serialsToSync: {
    serialNumber: string;
    locationId: string;
    sublocationId: string | null;
    quantity: Prisma.Decimal;
  }[] = [];

  for (const line of linesToSync) {
    if (!line.locationId) continue;

    const lineQty = toDecimal(line.quantityOnHand);
    const subName = line.sublocation?.trim();

    // Sum overall location stock
    const currentLocTotal = locationTotals.get(line.locationId) ?? new Prisma.Decimal(0);
    locationTotals.set(line.locationId, currentLocTotal.plus(lineQty));

    let assignedSublocationId: string | null = null;

    // Sum bin sublocation stock if non-empty
    if (subName) {
      const subId = sublocationIdMap.get(`${line.locationId}_${subName}`);
      if (subId) {
        assignedSublocationId = subId;
        const subKey = `${line.locationId}_${subId}`;
        const existingSub = sublocationTotals.get(subKey) ?? {
          sublocationId: subId,
          totalQty: new Prisma.Decimal(0),
        };
        existingSub.totalQty = existingSub.totalQty.plus(lineQty);
        sublocationTotals.set(subKey, existingSub);
      }
    }

    // Collect serial details
    const serial = line.serial?.trim();
    if (serial) {
      serialsToSync.push({
        serialNumber: serial,
        locationId: line.locationId,
        sublocationId: assignedSublocationId,
        quantity: lineQty,
      });
    }
  }

  // 5. Fetch existing inventory records for comparison
  const existingInventories = await tx.inventory.findMany({
    where: { productId, locationId: { in: targetLocationIds } },
  });

  const existingInventoryMap = new Map<string, (typeof existingInventories)[0]>();
  for (const inv of existingInventories) {
    existingInventoryMap.set(inv.locationId, inv);
  }

  const binIdMap = new Map<string, string>(); // `${locationId}_${sublocationId}` -> inventoryBin.id
  const ledgerEntriesToCreate: Prisma.InventoryLedgerCreateManyInput[] = [];

  // 6. Update Inventory, Bins, and prepare Ledger entries
  for (const [locationId, newTotalQty] of locationTotals) {
    const existingInv = existingInventoryMap.get(locationId);
    const existingReserved = existingInv?.quantityReserved ?? new Prisma.Decimal(0);

    const inventory = await tx.inventory.upsert({
      where: { productId_locationId: { productId, locationId } },
      create: {
        productId,
        locationId,
        quantityOnHand: newTotalQty,
        quantityAvailable: newTotalQty,
        quantityReserved: existingReserved,
        lastMovementAt: new Date(),
      },
      update: {
        quantityOnHand: newTotalQty,
        quantityAvailable: newTotalQty.minus(existingReserved),
        lastMovementAt: new Date(),
      },
    });

    // Fetch existing bins for ledger delta calculations
    const existingBins = await tx.inventoryBin.findMany({
      where: { inventoryId: inventory.id },
    });

    const existingBinMap = new Map<string, Prisma.Decimal>();
    for (const bin of existingBins) {
      existingBinMap.set(bin.sublocationId, bin.quantity);
    }

    // Update sublocation bins in parallel
    const sublocationEntries = Array.from(sublocationTotals.entries()).filter(
      ([subKey]) => subKey.startsWith(`${locationId}_`)
    );

    await Promise.all(
      sublocationEntries.map(async ([, { sublocationId, totalQty }]) => {
        const binQtyBefore = existingBinMap.get(sublocationId) ?? new Prisma.Decimal(0);
        const binQtyChange = totalQty.minus(binQtyBefore);

        const bin = await tx.inventoryBin.upsert({
          where: {
            inventoryId_sublocationId: { inventoryId: inventory.id, sublocationId },
          },
          create: { inventoryId: inventory.id, sublocationId, quantity: totalQty },
          update: { quantity: totalQty },
        });

        binIdMap.set(`${locationId}_${sublocationId}`, bin.id);

        if (!binQtyChange.equals(0)) {
          ledgerEntriesToCreate.push({
            productId,
            locationId,
            sublocationId,
            transactionType: "OPENING_BALANCE",
            quantityBefore: binQtyBefore,
            quantityChange: binQtyChange,
            quantityAfter: totalQty,
            remarks: "System Inbound Cloud Inventory Sync",
          });
        }
      })
    );
  }

  // 7. Bulk insert Ledger records
  if (ledgerEntriesToCreate.length > 0) {
    await tx.inventoryLedger.createMany({
      data: ledgerEntriesToCreate,
    });
  }

  // 8. Process Serials (Handle stock transfers & zero-qty records)
  if (serialsToSync.length > 0) {
    await Promise.all(
      serialsToSync.map((item) => {
        const isAvailable = item.quantity.greaterThan(0);
        const inventoryBinId = item.sublocationId
          ? binIdMap.get(`${item.locationId}_${item.sublocationId}`) ?? null
          : null;

        return tx.inventoryBinItem.upsert({
          where: { serialNumber: item.serialNumber },
          create: {
            productId,
            locationId: item.locationId,
            inventoryBinId: isAvailable ? inventoryBinId : null,
            serialNumber: item.serialNumber,
            status: isAvailable ? "IN_STOCK" : "SOLD",
          },
          update: {
            productId,
            // If qty > 0, move serial to the new active location; keep old location if qty is 0
            ...(isAvailable && {
              locationId: item.locationId,
              inventoryBinId,
              status: "IN_STOCK",
            }),
            ...(!isAvailable && {
              status: "SOLD", //TRANSFERRED // Mark status appropriately when zero qty payload arrives
            }),
          },
        });
      })
    );
  }
}

// 8/18/2026
// import { Prisma } from "@/generated/prisma/client";
// import { InflowInventoryLine, InflowLocation } from "../types";
// import { syncLocation } from "./location.sync";

// type Tx = Prisma.TransactionClient;

// type SyncCache = {
//   verifiedLocationIds?: Set<string>;
// };

// const toDecimal = (value: string | number | null | undefined): Prisma.Decimal | null => {
//   if (value === null || value === undefined || value === "") return null;
//   return new Prisma.Decimal(value);
// };

// export async function syncInventoryLines(
//   tx: Tx,
//   productId: string,
//   inventoryLines: InflowInventoryLine[],
//   caches?: SyncCache,
//   selectedLocationIds?: string[]
// ) {
//   if (!inventoryLines.length) return;

//   // 1. Filter lines by selected target locations if provided
//   const linesToSync = selectedLocationIds?.length
//     ? inventoryLines.filter(
//         (line) => line.locationId && selectedLocationIds.includes(line.locationId)
//       )
//     : inventoryLines;

//   if (!linesToSync.length) return;

//   const verifiedLocations = caches?.verifiedLocationIds ?? new Set<string>();

//   // 2. Ensure parent locations exist
//   const uniqueLocationsToSync = new Map<string, InflowLocation>();
//   for (const line of linesToSync) {
//     if (line.location && !verifiedLocations.has(line.location.locationId)) {
//       uniqueLocationsToSync.set(line.location.locationId, line.location);
//     }
//   }

//   for (const [locId, locData] of uniqueLocationsToSync) {
//     await syncLocation(tx, locData);
//     verifiedLocations.add(locId);
//   }

//   // 3. Process ONLY explicitly named sublocations (Skip empty/unassigned)
//   const sublocationsToCreate: { locationId: string; name: string }[] = [];
//   const requiredSublocationKeys = new Set<string>();

//   for (const line of linesToSync) {
//     const subName = line.sublocation?.trim();
//     // ❌ DO NOT default to "Default". Only collect actual sublocation names.
//     if (!line.locationId || !subName) continue;

//     const subKey = `${line.locationId}_${subName}`;
//     if (!requiredSublocationKeys.has(subKey)) {
//       requiredSublocationKeys.add(subKey);
//       sublocationsToCreate.push({ locationId: line.locationId, name: subName });
//     }
//   }

//   if (sublocationsToCreate.length > 0) {
//     await Promise.all(
//       sublocationsToCreate.map((sub) =>
//         tx.sublocation.upsert({
//           where: {
//             locationId_name: { locationId: sub.locationId, name: sub.name },
//           },
//           create: { locationId: sub.locationId, name: sub.name },
//           update: {},
//         })
//       )
//     );
//   }

//   // Map sublocation name -> sublocation ID
//   const targetLocationIds = [...new Set(linesToSync.map((l) => l.locationId))];
//   const dbSublocations = await tx.sublocation.findMany({
//     where: { locationId: { in: targetLocationIds } },
//     select: { id: true, locationId: true, name: true },
//   });

//   const sublocationIdMap = new Map<string, string>();
//   for (const sub of dbSublocations) {
//     sublocationIdMap.set(`${sub.locationId}_${sub.name}`, sub.id);
//   }

//   // 4. Aggregate quantities:
//   // - locationTotals: Total stock (assigned + unassigned)
//   // - sublocationTotals: Stock assigned strictly to specific sublocation bins
//   const locationTotals = new Map<string, Prisma.Decimal>();
//   const sublocationTotals = new Map<string, { sublocationId: string; totalQty: Prisma.Decimal }>();

//   for (const line of linesToSync) {
//     if (!line.locationId) continue;

//     const lineQty = toDecimal(line.quantityOnHand) ?? new Prisma.Decimal(0);

//     // Aggregate Location Total (includes both assigned and unassigned stock)
//     const currentLocTotal = locationTotals.get(line.locationId) ?? new Prisma.Decimal(0);
//     locationTotals.set(line.locationId, currentLocTotal.plus(lineQty));

//     const subName = line.sublocation?.trim();
//     // Only aggregate into a sublocation bin if a sublocation was explicitly provided
//     if (subName) {
//       const sublocationId = sublocationIdMap.get(`${line.locationId}_${subName}`);
//       if (sublocationId) {
//         const subKey = `${line.locationId}_${sublocationId}`;
//         const existingSub = sublocationTotals.get(subKey) ?? {
//           sublocationId,
//           totalQty: new Prisma.Decimal(0),
//         };
//         existingSub.totalQty = existingSub.totalQty.plus(lineQty);
//         sublocationTotals.set(subKey, existingSub);
//       }
//     }
//   }

//   // 5. Update Inventory records & Bins
//   const existingInventories = await tx.inventory.findMany({
//     where: {
//       productId,
//       locationId: { in: targetLocationIds },
//     },
//   });

//   const existingInventoryMap = new Map<string, typeof existingInventories[0]>();
//   for (const inv of existingInventories) {
//     existingInventoryMap.set(inv.locationId, inv);
//   }

//   for (const [locationId, newTotalQty] of locationTotals) {
//     const existingInv = existingInventoryMap.get(locationId);
//     const existingReserved = existingInv?.quantityReserved ?? new Prisma.Decimal(0);

//     // Upsert parent Inventory (Total quantityOnHand = 60.00)
//     const inventory = await tx.inventory.upsert({
//       where: { productId_locationId: { productId, locationId } },
//       create: {
//         productId,
//         locationId,
//         quantityOnHand: newTotalQty,
//         quantityAvailable: newTotalQty,
//         quantityReserved: existingReserved,
//         lastMovementAt: new Date(),
//       },
//       update: {
//         quantityOnHand: newTotalQty,
//         quantityAvailable: newTotalQty.minus(existingReserved),
//         lastMovementAt: new Date(),
//       },
//     });

//     // Fetch existing bins for ledger delta tracking
//     const existingBins = await tx.inventoryBin.findMany({
//       where: { inventoryId: inventory.id },
//     });
//     const existingBinMap = new Map<string, Prisma.Decimal>();
//     for (const bin of existingBins) {
//       existingBinMap.set(bin.sublocationId, bin.quantity);
//     }

//     // Upsert bins ONLY for explicit sublocations (IT Dept, Kirk Captain, Kevin Ross-Jones)
//     for (const [subKey, { sublocationId, totalQty }] of sublocationTotals) {
//       if (!subKey.startsWith(locationId)) continue;

//       const binQtyBefore = existingBinMap.get(sublocationId) ?? new Prisma.Decimal(0);
//       const binQtyChange = totalQty.minus(binQtyBefore);

//       await tx.inventoryBin.upsert({
//         where: {
//           inventoryId_sublocationId: {
//             inventoryId: inventory.id,
//             sublocationId,
//           },
//         },
//         create: {
//           inventoryId: inventory.id,
//           sublocationId,
//           quantity: totalQty,
//         },
//         update: {
//           quantity: totalQty,
//         },
//       });

//       if (!binQtyChange.equals(0)) {
//         await tx.inventoryLedger.create({
//           data: {
//             productId,
//             locationId,
//             sublocationId,
//             transactionType: "OPENING_BALANCE",
//             quantityBefore: binQtyBefore,
//             quantityChange: binQtyChange,
//             quantityAfter: totalQty,
//             remarks: "System Inbound Inventory Sync",
//           },
//         });
//       }
//     }
//   }
// }


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
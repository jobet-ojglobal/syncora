// lib/inflow/services/inventory-lines.sync.ts

import { Prisma } from "@/generated/prisma/client";
import { InflowInventoryLine, InflowLocation } from "../types";
import { syncLocation } from "./location.sync";

type Tx = Prisma.TransactionClient;

type SyncCache = {
  verifiedLocationIds?: Set<string>;
};

const toDecimal = (
  value: string | number | null | undefined
): Prisma.Decimal => {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(value);
};

export async function syncInventoryLines(
  tx: Tx,
  productId: string,
  inventoryLines: InflowInventoryLine[],
  caches?: SyncCache,
  selectedLocationIds?: string[]
) {
  console.log(`\n============================================================`);
  console.log(`[INVENTORY SYNC START] Product ID: ${productId}`);
  console.log(`[INVENTORY SYNC] Received raw inventoryLines count: ${inventoryLines.length}`);
  console.log(`============================================================\n`);

  if (!inventoryLines.length) {
    console.log(`[INVENTORY SYNC] No inventory lines provided. Exiting.`);
    return;
  }

  // ============================================================
  // 1. Filter inventory lines by selected location scope
  // ============================================================

  const linesToSync = selectedLocationIds?.length
    ? inventoryLines.filter((line) => {
        const locId = line.locationId || line.location?.locationId;
        return locId && selectedLocationIds.includes(locId);
      })
    : inventoryLines;

  console.log(`[INVENTORY SYNC] Selected Location IDs Filter:`, selectedLocationIds ?? "ALL LOCATIONS");
  console.log(`[INVENTORY SYNC] Lines to sync after location filter: ${linesToSync.length}`);
  console.dir(linesToSync, { depth: null, colors: true });

  if (!linesToSync.length) {
    console.log(`[INVENTORY SYNC] No lines to sync after location filtering. Exiting.`);
    return;
  }

  const verifiedLocations =
    caches?.verifiedLocationIds ?? new Set<string>();

  // ============================================================
  // 2. Ensure parent Locations exist
  // ============================================================

  const uniqueLocationsToSync = new Map<string, InflowLocation>();

  for (const line of linesToSync) {
    const locId = line.locationId || line.location?.locationId;
    if (
      locId &&
      line.location &&
      !verifiedLocations.has(locId)
    ) {
      uniqueLocationsToSync.set(locId, line.location);
    }
  }

  for (const [locId, locData] of uniqueLocationsToSync) {
    console.log(`[INVENTORY SYNC] Syncing parent location: ${locId}`);
    await syncLocation(tx, locData);
    verifiedLocations.add(locId);
  }

  // ============================================================
  // 3. Create named Sublocations
  //
  // Empty/null sublocation = FLOOR STOCK.
  // We intentionally do NOT create a Sublocation for it.
  // ============================================================

  const sublocationsToCreate: {
    locationId: string;
    name: string;
  }[] = [];

  const requiredSublocationKeys = new Set<string>();

  for (const line of linesToSync) {
    const locId = line.locationId || line.location?.locationId;
    const subName = line.sublocation?.trim();

    // Empty sublocation = floor stock
    if (!locId || !subName) {
      continue;
    }

    const subKey = `${locId}_${subName}`;

    if (!requiredSublocationKeys.has(subKey)) {
      requiredSublocationKeys.add(subKey);

      sublocationsToCreate.push({
        locationId: locId,
        name: subName,
      });
    }
  }

  if (sublocationsToCreate.length > 0) {
    console.log(`[INVENTORY SYNC] Upserting Sublocations:`, sublocationsToCreate);
    await Promise.all(
      sublocationsToCreate.map((sub) =>
        tx.sublocation.upsert({
          where: {
            locationId_name: {
              locationId: sub.locationId,
              name: sub.name,
            },
          },
          create: {
            locationId: sub.locationId,
            name: sub.name,
          },
          update: {},
        })
      )
    );
  }

  // ============================================================
  // 4. Fetch Sublocation IDs
  // ============================================================

  const targetLocationIds = [
    ...new Set(
      linesToSync
        .map((line) => line.locationId || line.location?.locationId)
        .filter(Boolean) as string[]
    ),
  ];

  console.log(`[INVENTORY SYNC] Target Location IDs for DB Query:`, targetLocationIds);

  const dbSublocations = await tx.sublocation.findMany({
    where: {
      locationId: {
        in: targetLocationIds,
      },
    },
    select: {
      id: true,
      locationId: true,
      name: true,
    },
  });

  const sublocationIdMap = new Map<string, string>();

  for (const sub of dbSublocations) {
    sublocationIdMap.set(
      `${sub.locationId}_${sub.name}`,
      sub.id
    );
  }

  // ============================================================
  // 5. Aggregate inventory
  // ============================================================

  const locationTotals = new Map<string, Prisma.Decimal>();

  const sublocationTotals = new Map<
    string,
    {
      sublocationId: string;
      totalQty: Prisma.Decimal;
    }
  >();

  // Serial inventory to synchronize
  const serialsToSync: {
    serialNumber: string;
    locationId: string;
    sublocationId: string | null;
    quantity: Prisma.Decimal;
  }[] = [];

  console.log(`\n[INVENTORY SYNC] Step 5: Beginning Line-by-Line Aggregation...`);

  for (let idx = 0; idx < linesToSync.length; idx++) {
    const line = linesToSync[idx];
    const locId = line.locationId || line.location?.locationId;

    if (!locId) {
      console.warn(`[INVENTORY SYNC WARN] Line #${idx} missing locationId! Line skipped:`, line);
      continue;
    }

    const serial = line.serial?.trim();

    // Fallback: If a serial exists but quantityOnHand is null, undefined, or 0, default it to 1.00
    // Replace lines 212-218 in Step 5:

    let rawQty: string | number | null | undefined = line.quantityOnHand;

    console.log(rawQty)

    // Explicitly handle empty/zero quantity for serial lines without TypeScript overlap errors
    if (
      serial &&
      (rawQty === null ||
        rawQty === undefined ||
        (rawQty as unknown) === 0 ||
        (rawQty as unknown) === "")
    ) {
      rawQty = 1;
      console.log(
        `[INVENTORY SYNC] Line #${idx}: Serial '${serial}' missing quantityOnHand; defaulted quantity to 1`
      );
    }

    const lineQty = toDecimal(rawQty);

    console.log(`[INVENTORY SYNC] Processing Line #${idx}:`, {
      serial,
      locId,
      sublocation: line.sublocation ?? "FLOOR STOCK (null)",
      rawQuantityOnHand: line.quantityOnHand,
      parsedLineQty: lineQty.toString(),
    });

    // ----------------------------------------------------------
    // Location total
    // ----------------------------------------------------------

    const currentLocTotal =
      locationTotals.get(locId) ?? new Prisma.Decimal(0);

    const newLocTotal = currentLocTotal.plus(lineQty);
    locationTotals.set(locId, newLocTotal);

    console.log(`  -> Running total for Location '${locId}': ${newLocTotal.toString()}`);

    // ----------------------------------------------------------
    // Sublocation
    // ----------------------------------------------------------

    const subName = line.sublocation?.trim();

    let assignedSublocationId: string | null = null;

    if (subName) {
      const subId = sublocationIdMap.get(`${locId}_${subName}`);

      if (subId) {
        assignedSublocationId = subId;

        const subKey = `${locId}_${subId}`;

        const existingSub =
          sublocationTotals.get(subKey) ?? {
            sublocationId: subId,
            totalQty: new Prisma.Decimal(0),
          };

        existingSub.totalQty =
          existingSub.totalQty.plus(lineQty);

        sublocationTotals.set(subKey, existingSub);
      } else {
        console.warn(`[INVENTORY SYNC WARN] Sublocation ID not found in map for key: ${locId}_${subName}`);
      }
    }

    // ----------------------------------------------------------
    // Serial
    // ----------------------------------------------------------

    if (serial) {
      serialsToSync.push({
        serialNumber: serial,
        locationId: locId,
        sublocationId: assignedSublocationId,
        quantity: lineQty,
      });
    }
  }

  console.log(`\n[INVENTORY SYNC] Final Aggregated Location Totals:`);
  for (const [locId, total] of locationTotals) {
    console.log(`  Location [${locId}]: ${total.toString()}`);
  }

  // ============================================================
  // 6. Fetch existing Inventory records
  // ============================================================

  const existingInventories = await tx.inventory.findMany({
    where: {
      productId,
      locationId: {
        in: targetLocationIds,
      },
    },
  });

  const existingInventoryMap = new Map<
    string,
    (typeof existingInventories)[0]
  >();

  for (const inv of existingInventories) {
    existingInventoryMap.set(inv.locationId, inv);
  }

  // ============================================================
  // 7. Create/update Inventory and InventoryBin
  // ============================================================

  const binIdMap = new Map<string, string>();

  const ledgerEntriesToCreate: Prisma.InventoryLedgerCreateManyInput[] = [];

  for (const [locationId, newTotalQty] of locationTotals) {
    const existingInv = existingInventoryMap.get(locationId);

    const existingQtyBefore =
      existingInv?.quantityOnHand ?? new Prisma.Decimal(0);

    const existingReserved =
      existingInv?.quantityReserved ?? new Prisma.Decimal(0);

    const qtyChange = newTotalQty.minus(existingQtyBefore);

    console.log(`[INVENTORY SYNC] Upserting Inventory for Location '${locationId}':`, {
      productId,
      existingQtyBefore: existingQtyBefore.toString(),
      newTotalQty: newTotalQty.toString(),
      qtyChange: qtyChange.toString(),
    });

    // ----------------------------------------------------------
    // Inventory
    // ----------------------------------------------------------

    const inventory = await tx.inventory.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },

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

    // ----------------------------------------------------------
    // Inventory bins for NAMED sublocations only
    // ----------------------------------------------------------

    const sublocationEntries = Array.from(
      sublocationTotals.entries()
    ).filter(([subKey]) => subKey.startsWith(`${locationId}_`));

    const bins = await Promise.all(
      sublocationEntries.map(([_, { sublocationId, totalQty }]) =>
        tx.inventoryBin.upsert({
          where: {
            inventoryId_sublocationId: {
              inventoryId: inventory.id,
              sublocationId,
            },
          },
          create: {
            inventoryId: inventory.id,
            sublocationId,
            quantity: totalQty,
          },
          update: {
            quantity: totalQty,
          },
        })
      )
    );

    for (const bin of bins) {
      binIdMap.set(`${locationId}_${bin.sublocationId}`, bin.id);
    }

    // ----------------------------------------------------------
    // Inventory ledger
    // ----------------------------------------------------------

    if (!qtyChange.equals(0)) {
      ledgerEntriesToCreate.push({
        productId,
        locationId,
        sublocationId: null,
        transactionType: "OPENING_BALANCE",
        quantityBefore: existingQtyBefore,
        quantityChange: qtyChange,
        quantityAfter: newTotalQty,
        remarks: "System Inbound Cloud Inventory Sync",
      });
    }
  }

  // ============================================================
  // 8. Bulk create ledger entries
  // ============================================================

  if (ledgerEntriesToCreate.length > 0) {
    console.log(`[INVENTORY SYNC] Creating ${ledgerEntriesToCreate.length} Ledger entries.`);
    await tx.inventoryLedger.createMany({
      data: ledgerEntriesToCreate,
    });
  }

  // ============================================================
  // 9. Sync serialized inventory
  // ============================================================

  if (serialsToSync.length > 0) {
    console.log(`[INVENTORY SYNC] Syncing ${serialsToSync.length} serial numbers:`, serialsToSync);
    await Promise.all(
      serialsToSync.map((item) => {
        const isAvailable = item.quantity.greaterThan(0);

        let inventoryBinId: string | null = null;

        if (item.sublocationId) {
          inventoryBinId =
            binIdMap.get(`${item.locationId}_${item.sublocationId}`) ??
            null;
        }

        return tx.inventoryBinItem.upsert({
          where: {
            serialNumber: item.serialNumber,
          },
          create: {
            productId,
            locationId: item.locationId,
            inventoryBinId,
            serialNumber: item.serialNumber,
            status: isAvailable ? "IN_STOCK" : "SOLD",
          },
          update: {
            productId,
            locationId: item.locationId,
            inventoryBinId,
            status: isAvailable ? "IN_STOCK" : "SOLD",
          },
        });
      })
    );
  }

  console.log(`[INVENTORY SYNC SUCCESS] Completed sync for Product ID: ${productId}\n`);
}

// 8/24/26
// // lib/inflow/services/inventory-lines.sync.ts

// import { Prisma } from "@/generated/prisma/client";
// import { InflowInventoryLine, InflowLocation } from "../types";
// import { syncLocation } from "./location.sync";

// type Tx = Prisma.TransactionClient;

// type SyncCache = {
//   verifiedLocationIds?: Set<string>;
// };

// const toDecimal = (
//   value: string | number | null | undefined
// ): Prisma.Decimal => {
//   if (value === null || value === undefined || value === "") {
//     return new Prisma.Decimal(0);
//   }

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

//   // ============================================================
//   // 1. Filter inventory lines by selected location scope
//   // ============================================================

//   const linesToSync = selectedLocationIds?.length
//     ? inventoryLines.filter(
//         (line) =>
//           line.locationId &&
//           selectedLocationIds.includes(line.locationId)
//       )
//     : inventoryLines;

//   if (!linesToSync.length) return;

//   const verifiedLocations =
//     caches?.verifiedLocationIds ?? new Set<string>();

//   // ============================================================
//   // 2. Ensure parent Locations exist
//   // ============================================================

//   const uniqueLocationsToSync = new Map<string, InflowLocation>();

//   for (const line of linesToSync) {
//     if (
//       line.location &&
//       !verifiedLocations.has(line.location.locationId)
//     ) {
//       uniqueLocationsToSync.set(
//         line.location.locationId,
//         line.location
//       );
//     }
//   }

//   for (const [locId, locData] of uniqueLocationsToSync) {
//     await syncLocation(tx, locData);
//     verifiedLocations.add(locId);
//   }

//   // ============================================================
//   // 3. Create named Sublocations
//   //
//   // Empty/null sublocation = FLOOR STOCK.
//   // We intentionally do NOT create a Sublocation for it.
//   // ============================================================

//   const sublocationsToCreate: {
//     locationId: string;
//     name: string;
//   }[] = [];

//   const requiredSublocationKeys = new Set<string>();

//   for (const line of linesToSync) {
//     const subName = line.sublocation?.trim();

//     // Empty sublocation = floor stock
//     if (!line.locationId || !subName) {
//       continue;
//     }

//     const subKey = `${line.locationId}_${subName}`;

//     if (!requiredSublocationKeys.has(subKey)) {
//       requiredSublocationKeys.add(subKey);

//       sublocationsToCreate.push({
//         locationId: line.locationId,
//         name: subName,
//       });
//     }
//   }

//   if (sublocationsToCreate.length > 0) {
//     await Promise.all(
//       sublocationsToCreate.map((sub) =>
//         tx.sublocation.upsert({
//           where: {
//             locationId_name: {
//               locationId: sub.locationId,
//               name: sub.name,
//             },
//           },
//           create: {
//             locationId: sub.locationId,
//             name: sub.name,
//           },
//           update: {},
//         })
//       )
//     );
//   }

//   // ============================================================
//   // 4. Fetch Sublocation IDs
//   // ============================================================

//   const targetLocationIds = [
//     ...new Set(
//       linesToSync
//         .map((line) => line.locationId)
//         .filter(Boolean)
//     ),
//   ];

//   const dbSublocations = await tx.sublocation.findMany({
//     where: {
//       locationId: {
//         in: targetLocationIds,
//       },
//     },
//     select: {
//       id: true,
//       locationId: true,
//       name: true,
//     },
//   });

//   const sublocationIdMap = new Map<string, string>();

//   for (const sub of dbSublocations) {
//     sublocationIdMap.set(
//       `${sub.locationId}_${sub.name}`,
//       sub.id
//     );
//   }

//   // ============================================================
//   // 5. Aggregate inventory
//   // ============================================================

//   const locationTotals = new Map<
//     string,
//     Prisma.Decimal
//   >();

//   const sublocationTotals = new Map<
//     string,
//     {
//       sublocationId: string;
//       totalQty: Prisma.Decimal;
//     }
//   >();

//   // Serial inventory to synchronize
//   const serialsToSync: {
//     serialNumber: string;
//     locationId: string;
//     sublocationId: string | null;
//     quantity: Prisma.Decimal;
//   }[] = [];

//   for (const line of linesToSync) {
//     if (!line.locationId) continue;

//     const lineQty = toDecimal(line.quantityOnHand);

//     // ----------------------------------------------------------
//     // Location total
//     // ----------------------------------------------------------

//     const currentLocTotal =
//       locationTotals.get(line.locationId) ??
//       new Prisma.Decimal(0);

//     locationTotals.set(
//       line.locationId,
//       currentLocTotal.plus(lineQty)
//     );

//     // ----------------------------------------------------------
//     // Sublocation
//     //
//     // null = FLOOR STOCK
//     // ----------------------------------------------------------

//     const subName = line.sublocation?.trim();

//     let assignedSublocationId: string | null = null;

//     if (subName) {
//       const subId = sublocationIdMap.get(
//         `${line.locationId}_${subName}`
//       );

//       if (subId) {
//         assignedSublocationId = subId;

//         const subKey = `${line.locationId}_${subId}`;

//         const existingSub =
//           sublocationTotals.get(subKey) ?? {
//             sublocationId: subId,
//             totalQty: new Prisma.Decimal(0),
//           };

//         existingSub.totalQty =
//           existingSub.totalQty.plus(lineQty);

//         sublocationTotals.set(subKey, existingSub);
//       }
//     }

//     // ----------------------------------------------------------
//     // Serial
//     // ----------------------------------------------------------

//     const serial = line.serial?.trim();

//     if (serial) {
//       serialsToSync.push({
//         serialNumber: serial,
//         locationId: line.locationId,

//         // IMPORTANT:
//         // null means this serial is FLOOR STOCK.
//         //
//         // If a named sublocation exists, this contains
//         // the InventoryBin's sublocation ID.
//         sublocationId: assignedSublocationId,

//         quantity: lineQty,
//       });
//     }
//   }

//   // ============================================================
//   // 6. Fetch existing Inventory records
//   // ============================================================

//   const existingInventories = await tx.inventory.findMany({
//     where: {
//       productId,
//       locationId: {
//         in: targetLocationIds,
//       },
//     },
//   });

//   const existingInventoryMap = new Map<
//     string,
//     (typeof existingInventories)[0]
//   >();

//   for (const inv of existingInventories) {
//     existingInventoryMap.set(inv.locationId, inv);
//   }

//   // ============================================================
//   // 7. Create/update Inventory and InventoryBin
//   // ============================================================

//   const binIdMap = new Map<string, string>();

//   const ledgerEntriesToCreate: Prisma.InventoryLedgerCreateManyInput[] =
//     [];

//   for (const [locationId, newTotalQty] of locationTotals) {
//     const existingInv =
//       existingInventoryMap.get(locationId);

//     const existingQtyBefore =
//       existingInv?.quantityOnHand ??
//       new Prisma.Decimal(0);

//     const existingReserved =
//       existingInv?.quantityReserved ??
//       new Prisma.Decimal(0);

//     const qtyChange =
//       newTotalQty.minus(existingQtyBefore);

//     // ----------------------------------------------------------
//     // Inventory
//     // ----------------------------------------------------------

//     const inventory = await tx.inventory.upsert({
//       where: {
//         productId_locationId: {
//           productId,
//           locationId,
//         },
//       },

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
//         quantityAvailable:
//           newTotalQty.minus(existingReserved),
//         lastMovementAt: new Date(),
//       },
//     });

//     // ----------------------------------------------------------
//     // Inventory bins for NAMED sublocations only
//     //
//     // Floor stock does NOT get an InventoryBin.
//     // ----------------------------------------------------------

//     const sublocationEntries = Array.from(
//       sublocationTotals.entries()
//     ).filter(([subKey]) =>
//       subKey.startsWith(`${locationId}_`)
//     );

//     for (const [
//       ,
//       { sublocationId, totalQty },
//     ] of sublocationEntries) {
//       const bin = await tx.inventoryBin.upsert({
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

//       binIdMap.set(
//         `${locationId}_${sublocationId}`,
//         bin.id
//       );
//     }

//     // ----------------------------------------------------------
//     // Inventory ledger
//     // ----------------------------------------------------------

//     if (!qtyChange.equals(0)) {
//       ledgerEntriesToCreate.push({
//         productId,
//         locationId,

//         // Location-level movement.
//         // Do not associate this with a specific bin.
//         sublocationId: null,

//         transactionType: "OPENING_BALANCE",

//         quantityBefore: existingQtyBefore,
//         quantityChange: qtyChange,
//         quantityAfter: newTotalQty,

//         remarks:
//           "System Inbound Cloud Inventory Sync",
//       });
//     }
//   }

//   // ============================================================
//   // 8. Bulk create ledger entries
//   // ============================================================

//   if (ledgerEntriesToCreate.length > 0) {
//     await tx.inventoryLedger.createMany({
//       data: ledgerEntriesToCreate,
//     });
//   }

//   // ============================================================
//   // 9. Sync serialized inventory
//   //
//   // Serialized product:
//   //
//   //   Named sublocation
//   //     -> InventoryBinItem.inventoryBinId = bin.id
//   //
//   //   Empty/null sublocation
//   //     -> InventoryBinItem.inventoryBinId = null
//   //     -> FLOOR STOCK
//   // ============================================================

//   if (serialsToSync.length > 0) {
//     for (const item of serialsToSync) {
//       const isAvailable = item.quantity.greaterThan(0);

//       let inventoryBinId: string | null = null;

//       // --------------------------------------------------------
//       // Named sublocation
//       // --------------------------------------------------------

//       if (item.sublocationId) {
//         inventoryBinId =
//           binIdMap.get(
//             `${item.locationId}_${item.sublocationId}`
//           ) ?? null;
//       }

//       // --------------------------------------------------------
//       // Empty sublocation = FLOOR STOCK
//       //
//       // inventoryBinId intentionally remains null.
//       // --------------------------------------------------------

//       if (!item.sublocationId) {
//         inventoryBinId = null;
//       }

//       // --------------------------------------------------------
//       // Upsert serial
//       // --------------------------------------------------------

//       await tx.inventoryBinItem.upsert({
//         where: {
//           serialNumber: item.serialNumber,
//         },

//         create: {
//           productId,
//           locationId: item.locationId,

//           // null = floor stock
//           inventoryBinId,

//           serialNumber: item.serialNumber,

//           status: isAvailable
//             ? "IN_STOCK"
//             : "SOLD",
//         },

//         update: {
//           productId,
//           locationId,

//           // IMPORTANT:
//           // Explicitly set this to null when the serial
//           // moves to floor stock.
//           inventoryBinId,

//           status: isAvailable
//             ? "IN_STOCK"
//             : "SOLD",
//         },
//       });
//     }
//   }
// }

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
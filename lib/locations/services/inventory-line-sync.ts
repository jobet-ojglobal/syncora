// 2
// inventory-lines.sync.ts
import { Prisma } from "@/generated/prisma/client";
import { LocalInventoryLine } from "../types";
import { toDecimal } from "@/helpers";
import { InflowStockAdjustmentLine } from "@/lib/inflow/types";

type Tx = Prisma.TransactionClient;

type SyncCache = {
  verifiedLocationIds?: Set<string>;
  mappedSublocations?: Map<
    string,
    {
      locationId: string;
      sublocationId: string;
      linkedLocationId?: string | null;
    }
  >;
};

export async function syncInventoryLines(
  tx: Tx,
  productId: string,
  inventoryLines: LocalInventoryLine[],
  caches?: SyncCache,
  selectedLocationIds?: string[]
): Promise<InflowStockAdjustmentLine[]> {
  const adjustmentLines: InflowStockAdjustmentLine[] = [];
  if (!inventoryLines.length) return adjustmentLines;

  // 1. Filter inventory lines by target parent location IDs if provided
  const targetLocationIds = selectedLocationIds?.length ? selectedLocationIds : [];

  // Cache lookups to avoid redundant database reads across loops
  const sublocationMapCache =
    caches?.mappedSublocations ??
    new Map<
      string,
      {
        locationId: string;
        sublocationId: string;
        linkedLocationId?: string | null;
      }
    >();

  // 2. Resolve local integer location IDs to mid-server locationId and sublocationId
  const linesToSync: (LocalInventoryLine & {
    resolvedLocationId: string;
    resolvedSublocationId: string;
  })[] = [];

  for (const line of inventoryLines) {
    if (line.locationId === null || line.locationId === undefined) continue;

    const rawLocalId = Number(line.locationId);
    if (isNaN(rawLocalId)) continue;

    let mapped = sublocationMapCache.get(String(rawLocalId));

    if (!mapped) {
      // Look up sublocation and include its linked target location ID if set
      const dbMap = await tx.sublocationLocationMap.findFirst({
        where: {
          localId: rawLocalId,
          ...(targetLocationIds.length > 0
            ? { locationId: { in: targetLocationIds } }
            : {}),
        },
        select: {
          locationId: true,
          sublocationId: true,
          sublocation: {
            select: {
              linkedLocationId: true,
            },
          },
        },
      });

      if (dbMap) {
        mapped = {
          // Prefer linkedLocationId if mapped, otherwise default to locationId
          locationId: dbMap.locationId,
          sublocationId: dbMap.sublocationId,
          linkedLocationId: dbMap.sublocation?.linkedLocationId 
        };
        sublocationMapCache.set(String(rawLocalId), mapped);
      }
    }

    if (mapped) {
      linesToSync.push({
        ...line,
        resolvedLocationId: mapped.locationId,
        resolvedSublocationId: mapped.sublocationId,
      });
    } else {
      console.warn(
        `[Sync Notification] Skipping local location ID "${line.locationId}" because no SublocationLocationMap record was found.`
      );
    }
  }

  if (!linesToSync.length) return adjustmentLines;

  // 3. Aggregate quantities per mid-server location and sublocation
  const locationTotals = new Map<string, Prisma.Decimal>();
  // Define structure for sublocationTotals
  const sublocationTotals = new Map<
    string,
    {
      locationId: string;
      sublocationId: string;
      totalQty: Prisma.Decimal;
      rawSublocationName?: string;
      linkedLocationId?: string | null;
    }
  >();

  for (const line of linesToSync) {
    const lineQty = toDecimal(line.quantityOnHand) ?? new Prisma.Decimal(0);
    const locId = line.resolvedLocationId;
    const sublocId = line.resolvedSublocationId;
    const rawLocalId = String(line.locationId);

    const currentLocTotal = locationTotals.get(locId) ?? new Prisma.Decimal(0);
    locationTotals.set(locId, currentLocTotal.plus(lineQty));

    // Retrieve cached mapping details for linkedLocationId
    const cached = sublocationMapCache.get(rawLocalId);

    const subKey = `${locId}_${sublocId}`;
    const existingSub = sublocationTotals.get(subKey) ?? {
      locationId: locId,
      sublocationId: sublocId,
      totalQty: new Prisma.Decimal(0),
      rawSublocationName: line.sublocation ?? undefined,
      linkedLocationId: cached?.linkedLocationId,
    };
    existingSub.totalQty = existingSub.totalQty.plus(lineQty);
    sublocationTotals.set(subKey, existingSub);
  }

  // 4. Update Inventory and InventoryBin records
  const activeLocationIds = [...locationTotals.keys()];
  const existingInventories = await tx.inventory.findMany({
    where: {
      productId,
      locationId: { in: activeLocationIds },
    },
  });

  const existingInventoryMap = new Map<string, (typeof existingInventories)[0]>();
  for (const inv of existingInventories) {
    existingInventoryMap.set(inv.locationId, inv);
  }

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

    const existingBins = await tx.inventoryBin.findMany({
      where: { inventoryId: inventory.id },
      include: { 
        sublocation: {
          select: {
            id: true,
            name: true,
            linkedLocationId: true,
          },
        },
      },
    });

    const existingBinMap = new Map<string, Prisma.Decimal>();
    for (const bin of existingBins) {
      existingBinMap.set(bin.sublocationId, bin.quantity);
    }

    const updatedSublocationIds = new Set<string>();

    // Active sublocation updates
    for (const [subKey, { sublocationId, totalQty, rawSublocationName, linkedLocationId }] of sublocationTotals) {
      if (!subKey.startsWith(locationId)) continue;

      updatedSublocationIds.add(sublocationId);
      const binQtyBefore = existingBinMap.get(sublocationId) ?? new Prisma.Decimal(0);
      const binQtyChange = totalQty.minus(binQtyBefore);

      await tx.inventoryBin.upsert({
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
      });

      if (!binQtyChange.equals(0)) {
        await tx.inventoryLedger.create({
          data: {
            productId,
            locationId,
            sublocationId,
            transactionType: "OPENING_BALANCE",
            quantityBefore: binQtyBefore,
            quantityChange: binQtyChange,
            quantityAfter: totalQty,
            remarks: "System Inbound Inventory Sync",
          },
        });

        // Collect Stock Adjustment Line Delta for Cloud Payload
        // Set sublocation to rawSublocationName or fallback to sublocationId
        adjustmentLines.push({
          stockAdjustmentLineId: crypto.randomUUID().toLowerCase(),
          productId,
          sublocation: linkedLocationId || "",
          quantity: {
            standardQuantity: String(binQtyChange),
            uomQuantity: null,
            uom: "pcs.",
            serialNumbers: [],
          },
          description: "System Inbound Inventory Delta Sync",
        });
      }
    }

    // Zero-out cleared bins
    for (const bin of existingBins) {
      if (!updatedSublocationIds.has(bin.sublocationId) && !bin.quantity.equals(0)) {
        await tx.inventoryBin.update({
          where: { id: bin.id },
          data: { quantity: new Prisma.Decimal(0) },
        });

        await tx.inventoryLedger.create({
          data: {
            productId,
            locationId,
            sublocationId: bin.sublocationId,
            transactionType: "OPENING_BALANCE",
            quantityBefore: bin.quantity,
            quantityChange: bin.quantity.negated(),
            quantityAfter: new Prisma.Decimal(0),
            remarks: "System Inbound Inventory Sync - Cleared Bin",
          },
        });

        // Collect negative delta adjustment line for cloud sync
        // Set sublocation to bin's sublocation name or ID
        adjustmentLines.push({
          stockAdjustmentLineId: crypto.randomUUID().toLowerCase(),
          productId,
          sublocation: bin.sublocation?.linkedLocationId || "",
          quantity: {
            standardQuantity: String(bin.quantity.negated().toNumber()),
            uomQuantity: null,
            uom: "pcs.",
            serialNumbers: [],
          },
          description: "System Inbound Inventory Sync - Cleared Bin",
        });
      }
    }
  }

  return adjustmentLines;
}

// 8/10/26 no midsync
// export async function syncInventoryLines(
//   tx: Tx,
//   productId: string,
//   inventoryLines: LocalInventoryLine[],
//   caches?: SyncCache,
//   selectedLocationIds?: string[]
// ) {
//   if (!inventoryLines.length) return;

//   // 1. Filter inventory lines by target parent location IDs if provided
//   const targetLocationIds = selectedLocationIds?.length ? selectedLocationIds : [];

//   // Cache lookups to avoid redundant database reads across loops
//   const sublocationMapCache =
//     caches?.mappedSublocations ??
//     new Map<string, { locationId: string; sublocationId: string }>();

//   // 2. Resolve local integer location IDs to mid-server locationId and sublocationId
//   const linesToSync: (LocalInventoryLine & {
//     resolvedLocationId: string;
//     resolvedSublocationId: string;
//   })[] = [];

//   for (const line of inventoryLines) {
//     if (line.locationId === null || line.locationId === undefined) continue;

//     const rawLocalId = Number(line.locationId);
//     if (isNaN(rawLocalId)) continue;

//     let mapped = sublocationMapCache.get(String(rawLocalId));

//     if (!mapped) {
//       // Query SublocationLocationMap using the local flat location ID
//       const dbMap = await tx.sublocationLocationMap.findFirst({
//         where: {
//           localId: rawLocalId,
//           ...(targetLocationIds.length > 0
//             ? { locationId: { in: targetLocationIds } }
//             : {}),
//         },
//         select: {
//           locationId: true,
//           sublocationId: true,
//         },
//       });

//       if (dbMap) {
//         mapped = {
//           locationId: dbMap.locationId,
//           sublocationId: dbMap.sublocationId,
//         };
//         sublocationMapCache.set(String(rawLocalId), mapped);
//       }
//     }

//     if (mapped) {
//       linesToSync.push({
//         ...line,
//         resolvedLocationId: mapped.locationId,
//         resolvedSublocationId: mapped.sublocationId,
//       });
//     } else {
//       console.warn(
//         `[Sync Notification] Skipping local location ID "${line.locationId}" because no SublocationLocationMap record was found.`
//       );
//     }
//   }

//   if (!linesToSync.length) return;

//   // 3. Aggregate quantities per mid-server location and sublocation
//   const locationTotals = new Map<string, Prisma.Decimal>();
//   const sublocationTotals = new Map<
//     string,
//     { locationId: string; sublocationId: string; totalQty: Prisma.Decimal }
//   >();

//   for (const line of linesToSync) {
//     const lineQty = toDecimal(line.quantityOnHand) ?? new Prisma.Decimal(0);
//     const locId = line.resolvedLocationId;
//     const sublocId = line.resolvedSublocationId;

//     // Aggregate overall location total
//     const currentLocTotal = locationTotals.get(locId) ?? new Prisma.Decimal(0);
//     locationTotals.set(locId, currentLocTotal.plus(lineQty));

//     // Aggregate sublocation bin total
//     const subKey = `${locId}_${sublocId}`;
//     const existingSub = sublocationTotals.get(subKey) ?? {
//       locationId: locId,
//       sublocationId: sublocId,
//       totalQty: new Prisma.Decimal(0),
//     };
//     existingSub.totalQty = existingSub.totalQty.plus(lineQty);
//     sublocationTotals.set(subKey, existingSub);
//   }

//   // 4. Update Inventory and InventoryBin records
//   const activeLocationIds = [...locationTotals.keys()];
//   const existingInventories = await tx.inventory.findMany({
//     where: {
//       productId,
//       locationId: { in: activeLocationIds },
//     },
//   });

//   const existingInventoryMap = new Map<string, (typeof existingInventories)[0]>();
//   for (const inv of existingInventories) {
//     existingInventoryMap.set(inv.locationId, inv);
//   }

//   for (const [locationId, newTotalQty] of locationTotals) {
//     const existingInv = existingInventoryMap.get(locationId);
//     const existingReserved = existingInv?.quantityReserved ?? new Prisma.Decimal(0);

//     // Upsert parent Inventory record
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

//     // Fetch existing bins to compute delta changes for the ledger
//     const existingBins = await tx.inventoryBin.findMany({
//       where: { inventoryId: inventory.id },
//     });

//     const existingBinMap = new Map<string, Prisma.Decimal>();
//     for (const bin of existingBins) {
//       existingBinMap.set(bin.sublocationId, bin.quantity);
//     }

//     const updatedSublocationIds = new Set<string>();

//     // Upsert active sublocation bins
//     for (const [subKey, { sublocationId, totalQty }] of sublocationTotals) {
//       if (!subKey.startsWith(locationId)) continue;

//       updatedSublocationIds.add(sublocationId);
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

//     // Zero-out or clear bins no longer in the payload for this location
//     for (const bin of existingBins) {
//       if (!updatedSublocationIds.has(bin.sublocationId) && !bin.quantity.equals(0)) {
//         await tx.inventoryBin.update({
//           where: { id: bin.id },
//           data: { quantity: new Prisma.Decimal(0) },
//         });

//         await tx.inventoryLedger.create({
//           data: {
//             productId,
//             locationId,
//             sublocationId: bin.sublocationId,
//             transactionType: "OPENING_BALANCE",
//             quantityBefore: bin.quantity,
//             quantityChange: bin.quantity.negated(),
//             quantityAfter: new Prisma.Decimal(0),
//             remarks: "System Inbound Inventory Sync - Cleared Bin",
//           },
//         });
//       }
//     }
//   }
// }
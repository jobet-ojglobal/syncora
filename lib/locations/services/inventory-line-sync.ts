import { Prisma } from "@/generated/prisma/client";
import { LocalInventoryLine } from "../types";
import { toDecimal } from "@/helpers";
import { StockAdjustmentLineInput } from "@/schemas/stock-adjustment.schema";

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

export type SyncAdjustmentLine = StockAdjustmentLineInput & {
  targetLocationId: string;
  description?: string;
};

export async function syncInventoryLines(
  tx: Tx,
  productId: string,
  inventoryLines: LocalInventoryLine[],
  caches?: SyncCache,
  selectedLocationIds?: string[]
): Promise<SyncAdjustmentLine[]> {
  if (!inventoryLines || inventoryLines.length === 0) {
    return [];
  }

  const targetLocationIdsFilter = selectedLocationIds?.length
    ? selectedLocationIds
    : [];

  if (caches && !caches.mappedSublocations) {
    caches.mappedSublocations = new Map();
  }

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

  // Helper: Resolve raw local sublocation/location ID via Cache or Database
  async function resolveLocalLocation(rawLocalId: string) {
    if (sublocationMapCache.has(rawLocalId)) {
      return sublocationMapCache.get(rawLocalId)!;
    }

    const dbMap = await tx.sublocationLocationMap.findFirst({
      where: {
        localId: Number(rawLocalId),
        ...(targetLocationIdsFilter.length > 0
          ? { locationId: { in: targetLocationIdsFilter } }
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
      const mapped = {
        locationId: dbMap.locationId,
        sublocationId: dbMap.sublocationId,
        linkedLocationId: dbMap.sublocation?.linkedLocationId,
      };
      sublocationMapCache.set(rawLocalId, mapped);
      return mapped;
    }
    return null;
  }

  // Aggregate totals and incoming serials per target location ID
  const aggregatedByTargetLocation = new Map<
    string,
    {
      totalQty: Prisma.Decimal;
      serials: Set<string>;
    }
  >();

  // Step 1: Accumulate incoming quantities & serials per target location
  for (const line of inventoryLines) {
    if (line.locationId === null || line.locationId === undefined) continue;

    const rawLocalId = String(line.locationId);
    if (isNaN(Number(rawLocalId))) continue;

    const mapped = await resolveLocalLocation(rawLocalId);
    if (!mapped) {
      console.warn(
        `[Sync Warning] Skipping local location ID "${line.locationId}" because no SublocationLocationMap mapping was found.`
      );
      continue;
    }

    // Determine target location: linkedLocationId takes priority over locationId
    const targetLocationId = mapped.linkedLocationId || mapped.locationId;
    if (!targetLocationId) continue;

    const lineQty = toDecimal(line.quantityOnHand) ?? new Prisma.Decimal(0);
    const existing = aggregatedByTargetLocation.get(targetLocationId) ?? {
      totalQty: new Prisma.Decimal(0),
      serials: new Set<string>(),
    };

    existing.totalQty = existing.totalQty.plus(lineQty);

    // Collect serials from payload array
    if (line.serials && Array.isArray(line.serials)) {
      for (const serial of line.serials) {
        if (serial && typeof serial === "string") {
          existing.serials.add(serial.trim());
        }
      }
    }

    aggregatedByTargetLocation.set(targetLocationId, existing);
  }

  if (aggregatedByTargetLocation.size === 0) {
    return [];
  }

  const targetLocationIds = Array.from(aggregatedByTargetLocation.keys());

  // Step 2: Check if product tracks serial numbers
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { name: true, trackSerials: true },
  });
  const isTrackSerials = Boolean(product?.trackSerials);
  const productName = product?.name || "Product";

  // Step 3: Query current target location inventories & existing active serial numbers
  const existingInventories = await tx.inventory.findMany({
    where: {
      productId,
      locationId: { in: targetLocationIds },
    },
    select: {
      locationId: true,
      quantityOnHand: true,
      quantityReserved: true,
      bins: {
        select: {
          inventoryBinItems: {
            where: { status: "IN_STOCK" },
            select: { serialNumber: true },
          },
        },
      },
    },
  });

  const existingInventoryMap = new Map(
    existingInventories.map((inv) => [inv.locationId, inv])
  );

  const adjustmentLines: SyncAdjustmentLine[] = [];

  // Step 4: Calculate serial diffs or quantity deltas per location
  for (const [targetLocationId, data] of aggregatedByTargetLocation) {
    const existingInv = existingInventoryMap.get(targetLocationId);

    const currentOnHand = existingInv?.quantityOnHand ?? new Prisma.Decimal(0);
    const currentReserved = existingInv?.quantityReserved ?? new Prisma.Decimal(0);

    const newOnHand = data.totalQty;
    const quantityDelta = newOnHand.minus(currentOnHand);
    const hasQtyChange = !quantityDelta.equals(0);

    const incomingSerials = Array.from(data.serials);

    // Extract all existing in-stock serial numbers across bins for this location
    const existingTargetSerials = isTrackSerials && existingInv?.bins
      ? existingInv.bins.flatMap((b) =>
          b.inventoryBinItems.map((item) => item.serialNumber)
        )
      : [];

    // Calculate serial diffs
    const removedSerials = isTrackSerials
      ? existingTargetSerials.filter((s) => !incomingSerials.includes(s))
      : [];
    const addedSerials = isTrackSerials
      ? incomingSerials.filter((s) => !existingTargetSerials.includes(s))
      : [];

    const serialsChanged = removedSerials.length > 0 || addedSerials.length > 0;

    // Skip if nothing changed and inventory record already exists
    if (!hasQtyChange && !serialsChanged && existingInv) {
      continue;
    }

    const availableQty = Math.max(
      0,
      newOnHand.minus(currentReserved).toNumber()
    );

    if (isTrackSerials && serialsChanged) {
      // --- SERIALIZED ADJUSTMENT LINES ---

      // Line A: Removed Serials (Negative Adjustment)
      if (removedSerials.length > 0) {
        adjustmentLines.push({
          targetLocationId,
          productId,
          trackSerials: true,
          quantityAdjusted: -removedSerials.length,
          quantityOnHand: newOnHand.toNumber(),
          quantityReserved: currentReserved.toNumber(),
          quantityAvailable: availableQty,
          serials: removedSerials,
          description: `Removed ${removedSerials.length} serial(s) for ${productName}`,
          bins: [],
        });
      }

      // Line B: Added Serials (Positive Adjustment)
      if (addedSerials.length > 0) {
        adjustmentLines.push({
          targetLocationId,
          productId,
          trackSerials: true,
          quantityAdjusted: addedSerials.length,
          quantityOnHand: newOnHand.toNumber(),
          quantityReserved: currentReserved.toNumber(),
          quantityAvailable: availableQty,
          serials: addedSerials,
          description: `Added ${addedSerials.length} serial(s) for ${productName}`,
          bins: [],
        });
      }
    } else {
      // --- NON-SERIALIZED / REGULAR ADJUSTMENT LINE ---
      adjustmentLines.push({
        targetLocationId,
        productId,
        trackSerials: isTrackSerials,
        quantityAdjusted: quantityDelta.toNumber(),
        quantityOnHand: newOnHand.toNumber(),
        quantityReserved: currentReserved.toNumber(),
        quantityAvailable: availableQty,
        serials: incomingSerials,
        description: `Inbound sync inventory adjustment for ${productName}`,
        bins: [],
      });
    }
  }

  return adjustmentLines;
}

// import { Prisma } from "@/generated/prisma/client";
// import { LocalInventoryLine, LocalProductSerial } from "../types";
// import { toDecimal } from "@/helpers";
// import { StockAdjustmentLineInput } from "@/schemas/stock-adjustment.schema";

// type Tx = Prisma.TransactionClient;

// type SyncCache = {
//   verifiedLocationIds?: Set<string>;
//   mappedSublocations?: Map<
//     string,
//     {
//       locationId: string;
//       sublocationId: string;
//       linkedLocationId?: string | null;
//     }
//   >;
// };

// // Extended adjustment line interface to safely pass targetLocationId upstream
// export type SyncAdjustmentLine = StockAdjustmentLineInput & {
//   targetLocationId: string;
//   description?: string;
// };

// export async function syncInventoryLines(
//   tx: Tx,
//   productId: string,
//   inventoryLines: LocalInventoryLine[],
//   caches?: SyncCache,
//   selectedLocationIds?: string[]
// ): Promise<SyncAdjustmentLine[]> {
//   const adjustmentLines: SyncAdjustmentLine[] = [];
//   if (!inventoryLines.length) return adjustmentLines;

//   const targetLocationIds = selectedLocationIds?.length ? selectedLocationIds : [];

//   if (caches && !caches.mappedSublocations) {
//     caches.mappedSublocations = new Map();
//   }

//   const sublocationMapCache =
//     caches?.mappedSublocations ??
//     new Map<
//       string,
//       {
//         locationId: string;
//         sublocationId: string;
//         linkedLocationId?: string | null;
//       }
//     >();

//   // Helper to resolve raw local location IDs via cache/DB
//   async function resolveLocalLocation(rawLocalId: string) {
//     if (sublocationMapCache.has(rawLocalId)) {
//       return sublocationMapCache.get(rawLocalId)!;
//     }

//     const dbMap = await tx.sublocationLocationMap.findFirst({
//       where: {
//         localId: Number(rawLocalId),
//         ...(targetLocationIds.length > 0
//           ? { locationId: { in: targetLocationIds } }
//           : {}),
//       },
//       select: {
//         locationId: true,
//         sublocationId: true,
//         sublocation: {
//           select: {
//             linkedLocationId: true,
//           },
//         },
//       },
//     });

//     if (dbMap) {
//       const mapped = {
//         locationId: dbMap.locationId,
//         sublocationId: dbMap.sublocationId,
//         linkedLocationId: dbMap.sublocation?.linkedLocationId,
//       };
//       sublocationMapCache.set(rawLocalId, mapped);
//       return mapped;
//     }
//     return null;
//   }

//   // --- Step A: Process & Map Inventory Lines ---
//   const linesToSync: (LocalInventoryLine & {
//     resolvedLocationId: string;
//     resolvedSublocationId: string;
//   })[] = [];

//   for (const line of inventoryLines) {
//     if (line.locationId === null || line.locationId === undefined) continue;
//     const rawLocalId = String(line.locationId);
//     if (isNaN(Number(rawLocalId))) continue;

//     const mapped = await resolveLocalLocation(rawLocalId);
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

//   // --- Step B: Map Incoming Serials by Sublocation Key (`${locationId}_${sublocationId}`) ---
//   const serialsBySubKey = new Map<string, string[]>();

//   for (const serial of serials) {
//     if (serial.locationId === null || serial.locationId === undefined) continue;
//     const rawLocalId = String(serial.locationId);
//     if (isNaN(Number(rawLocalId))) continue;

//     const mapped = await resolveLocalLocation(rawLocalId);
//     if (mapped) {
//       const subKey = `${mapped.locationId}_${mapped.sublocationId}`;
//       const existing = serialsBySubKey.get(subKey) ?? [];
//       existing.push(serial.serialNumber);
//       serialsBySubKey.set(subKey, existing);
//     }
//   }

//   if (!linesToSync.length) return adjustmentLines;

//   // --- Step C: Aggregate Totals ---
//   const locationTotals = new Map<string, Prisma.Decimal>();
//   const sublocationTotals = new Map<
//     string,
//     {
//       locationId: string;
//       sublocationId: string;
//       totalQty: Prisma.Decimal;
//       rawSublocationName?: string;
//       linkedLocationId?: string | null;
//     }
//   >();

//   for (const line of linesToSync) {
//     const lineQty = toDecimal(line.quantityOnHand) ?? new Prisma.Decimal(0);
//     const locId = line.resolvedLocationId;
//     const sublocId = line.resolvedSublocationId;
//     const rawLocalId = String(line.locationId);

//     const currentLocTotal = locationTotals.get(locId) ?? new Prisma.Decimal(0);
//     locationTotals.set(locId, currentLocTotal.plus(lineQty));

//     const cached = sublocationMapCache.get(rawLocalId);

//     const subKey = `${locId}_${sublocId}`;
//     const existingSub = sublocationTotals.get(subKey) ?? {
//       locationId: locId,
//       sublocationId: sublocId,
//       totalQty: new Prisma.Decimal(0),
//       rawSublocationName: line.sublocation ?? undefined,
//       linkedLocationId: cached?.linkedLocationId,
//     };
//     existingSub.totalQty = existingSub.totalQty.plus(lineQty);
//     sublocationTotals.set(subKey, existingSub);
//   }

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

//   // --- Step D: Upsert Inventory, Bins, and Serial Items ---
//   for (const [locationId, newTotalQty] of locationTotals) {
//     const existingInv = existingInventoryMap.get(locationId);
//     const existingReserved = existingInv?.quantityReserved ?? new Prisma.Decimal(0);

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

//     const existingBins = await tx.inventoryBin.findMany({
//       where: { inventoryId: inventory.id },
//       include: {
//         sublocation: {
//           select: {
//             id: true,
//             name: true,
//             linkedLocationId: true,
//           },
//         },
//       },
//     });

//     const existingBinMap = new Map<string, Prisma.Decimal>();
//     for (const bin of existingBins) {
//       existingBinMap.set(bin.sublocationId, bin.quantity);
//     }

//     const updatedSublocationIds = new Set<string>();

//     for (const [subKey, { sublocationId, totalQty, linkedLocationId }] of sublocationTotals) {
//       if (!subKey.startsWith(locationId)) continue;

//       updatedSublocationIds.add(sublocationId);
//       const binQtyBefore = existingBinMap.get(sublocationId) ?? new Prisma.Decimal(0);
//       const binQtyChange = totalQty.minus(binQtyBefore);

//       const inventoryBin = await tx.inventoryBin.upsert({
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

//       // --- Step E: Sync InventoryBinItems (Serials) for this Bin ---
//       const activeSerials = serialsBySubKey.get(subKey) ?? [];

//       if (activeSerials.length > 0) {
//         // Upsert all incoming active serial numbers
//         for (const serialNumber of activeSerials) {
//           await tx.inventoryBinItem.upsert({
//             where: { serialNumber },
//             create: {
//               serialNumber,
//               productId,
//               locationId,
//               inventoryBinId: inventoryBin.id,
//               status: "IN_STOCK",
//             },
//             update: {
//               productId,
//               locationId,
//               inventoryBinId: inventoryBin.id,
//               status: "IN_STOCK",
//             },
//           });
//         }

//         // Unlink serials that were in this bin previously but are no longer in this payload
//         await tx.inventoryBinItem.updateMany({
//           where: {
//             inventoryBinId: inventoryBin.id,
//             serialNumber: { notIn: activeSerials },
//           },
//           data: {
//             inventoryBinId: null,
//           },
//         });
//       }

//       // Ledger Entry for quantity changes
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
//             remarks: "System Inbound Local Inventory Sync",
//           },
//         });
//       }

//       // --- Step F: Linked Location Process for Adjustments Payload ---
//       if (linkedLocationId) {
//         const targetLocationId = linkedLocationId;

//         const linkedInventory = await tx.inventory.findUnique({
//           where: {
//             productId_locationId: {
//               productId,
//               locationId: targetLocationId,
//             },
//           },
//           include: {
//             product: {
//               select: {
//                 trackSerials: true,
//               },
//             },
//           },
//         });

//         const trackSerials =
//           linkedInventory?.product?.trackSerials ??
//           (
//             await tx.product.findUnique({
//               where: { id: productId },
//               select: { trackSerials: true },
//             })
//           )?.trackSerials ??
//           false;

//         const targetBinBefore =
//           linkedInventory?.quantityOnHand ?? new Prisma.Decimal(0);
//         const targetBinReserve =
//           linkedInventory?.quantityReserved ?? new Prisma.Decimal(0);

//         const linkedBinQtyChange = totalQty.minus(targetBinBefore);

//         if (!linkedBinQtyChange.equals(0)) {
//           adjustmentLines.push({
//             targetLocationId,
//             productId,
//             quantityAdjusted: linkedBinQtyChange.toNumber(),
//             quantityOnHand: totalQty.toNumber(),
//             quantityReserved: targetBinReserve.toNumber(),
//             quantityAvailable: Math.max(
//               0,
//               totalQty.minus(targetBinReserve).toNumber()
//             ),
//             trackSerials,
//             bins: [],
//             serials: activeSerials, // Pass synced serials downstream
//             description: "System Inbound Inventory Delta Sync",
//           });
//         }
//       }
//     }

//     // Clear stale bins
//     for (const bin of existingBins) {
//       if (!updatedSublocationIds.has(bin.sublocationId) && !bin.quantity.equals(0)) {
//         await tx.inventoryBin.update({
//           where: { id: bin.id },
//           data: { quantity: new Prisma.Decimal(0) },
//         });

//         // Unlink serials from cleared bins
//         await tx.inventoryBinItem.updateMany({
//           where: { inventoryBinId: bin.id },
//           data: { inventoryBinId: null },
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
//             remarks: "System Inbound Local Inventory Sync - Cleared Bin",
//           },
//         });
//       }
//     }
//   }

//   return adjustmentLines;
// }

// export async function syncInventoryLines(
//   tx: Tx,
//   productId: string,
//   inventoryLines: LocalInventoryLine[],
//   caches?: SyncCache,
//   selectedLocationIds?: string[]
// ): Promise<SyncAdjustmentLine[]> {
//   const adjustmentLines: SyncAdjustmentLine[] = [];
//   if (!inventoryLines.length) return adjustmentLines;

//   const targetLocationIds = selectedLocationIds?.length ? selectedLocationIds : [];

//   // Ensure map exists on cache object if passed
//   if (caches && !caches.mappedSublocations) {
//     caches.mappedSublocations = new Map();
//   }

//   const sublocationMapCache =
//     caches?.mappedSublocations ??
//     new Map<
//       string,
//       {
//         locationId: string;
//         sublocationId: string;
//         linkedLocationId?: string | null;
//       }
//     >();

//   const linesToSync: (LocalInventoryLine & {
//     resolvedLocationId: string;
//     resolvedSublocationId: string;
//   })[] = [];

//   for (const line of inventoryLines) {
//     if (line.locationId === null || line.locationId === undefined) continue;

//     const rawLocalId = String(line.locationId);
//     if (isNaN(Number(rawLocalId))) continue;

//     let mapped = sublocationMapCache.get(rawLocalId);

//     if (!mapped) {
//       const dbMap = await tx.sublocationLocationMap.findFirst({
//         where: {
//           localId: Number(rawLocalId),
//           ...(targetLocationIds.length > 0
//             ? { locationId: { in: targetLocationIds } }
//             : {}),
//         },
//         select: {
//           locationId: true,
//           sublocationId: true,
//           sublocation: {
//             select: {
//               linkedLocationId: true,
//             },
//           },
//         },
//       });

//       if (dbMap) {
//         mapped = {
//           locationId: dbMap.locationId,
//           sublocationId: dbMap.sublocationId,
//           linkedLocationId: dbMap.sublocation?.linkedLocationId,
//         };
//         sublocationMapCache.set(rawLocalId, mapped);
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

//   if (!linesToSync.length) return adjustmentLines;

//   const locationTotals = new Map<string, Prisma.Decimal>();
//   const sublocationTotals = new Map<
//     string,
//     {
//       locationId: string;
//       sublocationId: string;
//       totalQty: Prisma.Decimal;
//       rawSublocationName?: string;
//       linkedLocationId?: string | null;
//     }
//   >();

//   for (const line of linesToSync) {
//     const lineQty = toDecimal(line.quantityOnHand) ?? new Prisma.Decimal(0);
//     const locId = line.resolvedLocationId;
//     const sublocId = line.resolvedSublocationId;
//     const rawLocalId = String(line.locationId);

//     const currentLocTotal = locationTotals.get(locId) ?? new Prisma.Decimal(0);
//     locationTotals.set(locId, currentLocTotal.plus(lineQty));

//     const cached = sublocationMapCache.get(rawLocalId);

//     const subKey = `${locId}_${sublocId}`;
//     const existingSub = sublocationTotals.get(subKey) ?? {
//       locationId: locId,
//       sublocationId: sublocId,
//       totalQty: new Prisma.Decimal(0),
//       rawSublocationName: line.sublocation ?? undefined,
//       linkedLocationId: cached?.linkedLocationId,
//     };
//     existingSub.totalQty = existingSub.totalQty.plus(lineQty);
//     sublocationTotals.set(subKey, existingSub);
//   }

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

//     const existingBins = await tx.inventoryBin.findMany({
//       where: { inventoryId: inventory.id },
//       include: {
//         sublocation: {
//           select: {
//             id: true,
//             name: true,
//             linkedLocationId: true,
//           },
//         },
//       },
//     });

//     const existingBinMap = new Map<string, Prisma.Decimal>();
//     for (const bin of existingBins) {
//       existingBinMap.set(bin.sublocationId, bin.quantity);
//     }

//     const updatedSublocationIds = new Set<string>();

//     // Global Location sublocations update inventory bin
//     for (const [subKey, { sublocationId, totalQty, linkedLocationId }] of sublocationTotals) {
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

//         // Write ledger entry ONLY when there is an actual quantity change
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

//       // Linked Location Process for Adjustments Payload
//       if (linkedLocationId) {
//         const targetLocationId = linkedLocationId;

//         // 1. Fetch existing inventory along with product tracking settings
//         const linkedInventory = await tx.inventory.findUnique({
//           where: {
//             productId_locationId: {
//               productId,
//               locationId: targetLocationId,
//             },
//           },
//           include: {
//             product: {
//               select: {
//                 trackSerials: true,
//               },
//             },
//           },
//         });

//         // If product is missing or not initialized at this location yet, fetch product details
//         const trackSerials =
//           linkedInventory?.product?.trackSerials ??
//           (
//             await tx.product.findUnique({
//               where: { id: productId },
//               select: { trackSerials: true },
//             })
//           )?.trackSerials ??
//           false;
        
//         // temporary skip serialize item
//         if(trackSerials) continue;

//         // 2. Extract current target values safely (Convert Prisma.Decimal -> Decimal / Number)
//         const targetBinBefore =
//           linkedInventory?.quantityOnHand ?? new Prisma.Decimal(0);
//         const targetBinReserve =
//           linkedInventory?.quantityReserved ?? new Prisma.Decimal(0);

//         // Compute the delta change
//         const linkedBinQtyChange = totalQty.minus(targetBinBefore);

//         // 3. Push adjustment payload if a delta exists
//         if (!linkedBinQtyChange.equals(0)) {
//           adjustmentLines.push({
//             targetLocationId,
//             productId,
//             quantityAdjusted: linkedBinQtyChange.toNumber(),
//             quantityOnHand: totalQty.toNumber(),
//             quantityReserved: targetBinReserve.toNumber(),
//             quantityAvailable: Math.max(
//               0,
//               totalQty.minus(targetBinReserve).toNumber()
//             ),
//             trackSerials,
//             bins: [],
//             serials: [],
//             description: "System Inbound Inventory Delta Sync",
//           });
//         }
//       }
//     }

//     // to clear global location bins
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

//   return adjustmentLines;
// }

// 08/19/2026
// // inventory-lines.sync.ts
// import { Prisma } from "@/generated/prisma/client";
// import { LocalInventoryLine } from "../types";
// import { toDecimal } from "@/helpers";
// import { StockAdjustmentLineInput } from "@/schemas/stock-adjustment.schema";

// type Tx = Prisma.TransactionClient;

// type SyncCache = {
//   verifiedLocationIds?: Set<string>;
//   mappedSublocations?: Map<
//     string,
//     {
//       locationId: string;
//       sublocationId: string;
//       linkedLocationId?: string | null;
//     }
//   >;
// };

// // Extended adjustment line interface to safely pass targetLocationId upstream
// export type SyncAdjustmentLine = StockAdjustmentLineInput & {
//   targetLocationId: string;
//   description?: string;
// };

// export async function syncInventoryLines(
//   tx: Tx,
//   productId: string,
//   inventoryLines: LocalInventoryLine[],
//   caches?: SyncCache,
//   selectedLocationIds?: string[]
// ): Promise<SyncAdjustmentLine[]> {
//   const adjustmentLines: SyncAdjustmentLine[] = [];
//   if (!inventoryLines.length) return adjustmentLines;

//   const targetLocationIds = selectedLocationIds?.length ? selectedLocationIds : [];

//   // Ensure map exists on cache object if passed
//   if (caches && !caches.mappedSublocations) {
//     caches.mappedSublocations = new Map();
//   }

//   const sublocationMapCache =
//     caches?.mappedSublocations ??
//     new Map<
//       string,
//       {
//         locationId: string;
//         sublocationId: string;
//         linkedLocationId?: string | null;
//       }
//     >();

//   const linesToSync: (LocalInventoryLine & {
//     resolvedLocationId: string;
//     resolvedSublocationId: string;
//   })[] = [];

//   for (const line of inventoryLines) {
//     if (line.locationId === null || line.locationId === undefined) continue;

//     const rawLocalId = String(line.locationId);
//     if (isNaN(Number(rawLocalId))) continue;

//     let mapped = sublocationMapCache.get(rawLocalId);

//     if (!mapped) {
//       const dbMap = await tx.sublocationLocationMap.findFirst({
//         where: {
//           localId: Number(rawLocalId),
//           ...(targetLocationIds.length > 0
//             ? { locationId: { in: targetLocationIds } }
//             : {}),
//         },
//         select: {
//           locationId: true,
//           sublocationId: true,
//           sublocation: {
//             select: {
//               linkedLocationId: true,
//             },
//           },
//         },
//       });

//       if (dbMap) {
//         mapped = {
//           locationId: dbMap.locationId,
//           sublocationId: dbMap.sublocationId,
//           linkedLocationId: dbMap.sublocation?.linkedLocationId,
//         };
//         sublocationMapCache.set(rawLocalId, mapped);
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

//   if (!linesToSync.length) return adjustmentLines;

//   const locationTotals = new Map<string, Prisma.Decimal>();
//   const sublocationTotals = new Map<
//     string,
//     {
//       locationId: string;
//       sublocationId: string;
//       totalQty: Prisma.Decimal;
//       rawSublocationName?: string;
//       linkedLocationId?: string | null;
//     }
//   >();

//   for (const line of linesToSync) {
//     const lineQty = toDecimal(line.quantityOnHand) ?? new Prisma.Decimal(0);
//     const locId = line.resolvedLocationId;
//     const sublocId = line.resolvedSublocationId;
//     const rawLocalId = String(line.locationId);

//     const currentLocTotal = locationTotals.get(locId) ?? new Prisma.Decimal(0);
//     locationTotals.set(locId, currentLocTotal.plus(lineQty));

//     const cached = sublocationMapCache.get(rawLocalId);

//     const subKey = `${locId}_${sublocId}`;
//     const existingSub = sublocationTotals.get(subKey) ?? {
//       locationId: locId,
//       sublocationId: sublocId,
//       totalQty: new Prisma.Decimal(0),
//       rawSublocationName: line.sublocation ?? undefined,
//       linkedLocationId: cached?.linkedLocationId,
//     };
//     existingSub.totalQty = existingSub.totalQty.plus(lineQty);
//     sublocationTotals.set(subKey, existingSub);
//   }

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

//     const existingBins = await tx.inventoryBin.findMany({
//       where: { inventoryId: inventory.id },
//       include: {
//         sublocation: {
//           select: {
//             id: true,
//             name: true,
//             linkedLocationId: true,
//           },
//         },
//       },
//     });

//     const existingBinMap = new Map<string, Prisma.Decimal>();
//     for (const bin of existingBins) {
//       existingBinMap.set(bin.sublocationId, bin.quantity);
//     }

//     const updatedSublocationIds = new Set<string>();

//     // Global Location sublocations update inventory bin
//     for (const [subKey, { sublocationId, totalQty, linkedLocationId }] of sublocationTotals) {
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

//         // Write ledger entry ONLY when there is an actual quantity change
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

//       // Linked Location Process for Adjustments Payload
//       if (linkedLocationId) {
//         const targetLocationId = linkedLocationId;

//         // 1. Fetch existing inventory along with product tracking settings
//         const linkedInventory = await tx.inventory.findUnique({
//           where: {
//             productId_locationId: {
//               productId,
//               locationId: targetLocationId,
//             },
//           },
//           include: {
//             product: {
//               select: {
//                 trackSerials: true,
//               },
//             },
//           },
//         });

//         // If product is missing or not initialized at this location yet, fetch product details
//         const trackSerials =
//           linkedInventory?.product?.trackSerials ??
//           (
//             await tx.product.findUnique({
//               where: { id: productId },
//               select: { trackSerials: true },
//             })
//           )?.trackSerials ??
//           false;
        
//         // temporary skip serialize item
//         if(trackSerials) continue;

//         // 2. Extract current target values safely (Convert Prisma.Decimal -> Decimal / Number)
//         const targetBinBefore =
//           linkedInventory?.quantityOnHand ?? new Prisma.Decimal(0);
//         const targetBinReserve =
//           linkedInventory?.quantityReserved ?? new Prisma.Decimal(0);

//         // Compute the delta change
//         const linkedBinQtyChange = totalQty.minus(targetBinBefore);

//         // console.log("LINKED QTY BEFORE: ", targetBinBefore.toString());
//         // console.log("TARGET QTY AFTER: ", totalQty.toString());

//         // 3. Push adjustment payload if a delta exists
//         if (!linkedBinQtyChange.equals(0)) {
//           adjustmentLines.push({
//             targetLocationId,
//             productId,
//             quantityAdjusted: linkedBinQtyChange.toNumber(),
//             quantityOnHand: totalQty.toNumber(),
//             quantityReserved: targetBinReserve.toNumber(),
//             quantityAvailable: Math.max(
//               0,
//               totalQty.minus(targetBinReserve).toNumber()
//             ),
//             trackSerials,
//             bins: [],
//             serials: [],
//             description: "System Inbound Inventory Delta Sync",
//           });
//         }
//       }
//     }

//     // (alias) type StockAdjustmentLineInput = {
//     //   productId: string;
//     //   trackSerials: boolean;
//     //   quantityAdjusted: number;
//     //   quantityOnHand: number;
//     //   quantityReserved: number;
//     //   quantityAvailable: number;
//     //   bins: {
//     //   sublocationId: string;
//     //   quantity: number;
//     //   serials: string[];
//     //   id?: string | undefined;
//     //   }[];
//     //   serials: string[];
//     //   id?: string | undefined;
//     //   reason?: string | null | undefined;
//     //   }
//     //   import StockAdjustmentLineInput

//     // export const binAllocationSchema = z.object({
//     //   id: z.string().optional(),
//     //   sublocationId: z.string().min(1, "Must select a sublocation zone slot"),
//     //   quantity: z
//     //     .number({ error: "Must be a number" }),
//     //   serials: z.array(z.string()),
//     // });
    
//     // export const adjustmentLineSchema = z
//     //   .object({
//     //     id: z.string().optional(),
//     //     productId: z.string().min(1, "Product is required"),
//     //     trackSerials: z.boolean(),
//     //     quantityAdjusted: z.number({ error: "Must be a number" }),
//     //     quantityOnHand: z
//     //       .number({ error: "Must be a number" })
//     //       .min(0, "Stock balance cannot be negative"),
//     //     quantityReserved: z
//     //       .number({ error: "Must be a number" })
//     //       .min(0, "Reserved values cannot be negative"),
//     //     quantityAvailable: z.number(),
        
//     //     reason: z.string().optional().nullable(),
//     //     bins: z.array(binAllocationSchema),
//     //     serials: z.array(z.string()),
//     //   })



//     // to clear global location bins
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

//         // adjustmentLines.push({
//         //   stockAdjustmentLineId: crypto.randomUUID().toLowerCase(),
//         //   productId,
//         //   sublocation: bin.sublocationId,
//         //   targetLocationId: bin.sublocation?.linkedLocationId || locationId,
//         //   quantity: {
//         //     standardQuantity: String(bin.quantity.negated().toNumber()),
//         //     uomQuantity: null,
//         //     uom: "pcs.",
//         //     serialNumbers: [],
//         //   },
//         //   description: "System Inbound Inventory Sync - Cleared Bin",
//         // });
//       }
//     }
//   }

//   // console.log("LINES: ", JSON.stringify(adjustmentLines, null, 2));

//   return adjustmentLines;
// }



      // if (!binQtyChange.equals(0)) {
      //   await tx.inventoryLedger.create({
      //     data: {
      //       productId,
      //       locationId,
      //       sublocationId,
      //       transactionType: "OPENING_BALANCE",
      //       quantityBefore: binQtyBefore,
      //       quantityChange: binQtyChange,
      //       quantityAfter: totalQty,
      //       remarks: "System Inbound Inventory Sync",
      //     },
      //   });

      //   adjustmentLines.push({
      //     stockAdjustmentLineId: crypto.randomUUID().toLowerCase(),
      //     productId,
      //     sublocation: sublocationId,
      //     targetLocationId: linkedLocationId || locationId,
      //     quantity: {
      //       standardQuantity: String(binQtyChange),
      //       uomQuantity: null,
      //       uom: "pcs.",
      //       serialNumbers: [],
      //     },
      //     description: "System Inbound Inventory Delta Sync",
      //   });
      // }



// ====================== RETU

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
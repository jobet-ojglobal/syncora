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

// Extended adjustment line interface to safely pass targetLocationId upstream
export type SyncAdjustmentLine = InflowStockAdjustmentLine & {
  targetLocationId: string;
};

export async function syncInventoryLines(
  tx: Tx,
  productId: string,
  inventoryLines: LocalInventoryLine[],
  caches?: SyncCache,
  selectedLocationIds?: string[]
): Promise<SyncAdjustmentLine[]> {
  const adjustmentLines: SyncAdjustmentLine[] = [];
  if (!inventoryLines.length) return adjustmentLines;

  const targetLocationIds = selectedLocationIds?.length ? selectedLocationIds : [];

  // Ensure map exists on cache object if passed
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

  const linesToSync: (LocalInventoryLine & {
    resolvedLocationId: string;
    resolvedSublocationId: string;
  })[] = [];

  for (const line of inventoryLines) {
    if (line.locationId === null || line.locationId === undefined) continue;

    const rawLocalId = String(line.locationId);
    if (isNaN(Number(rawLocalId))) continue;

    let mapped = sublocationMapCache.get(rawLocalId);

    if (!mapped) {
      const dbMap = await tx.sublocationLocationMap.findFirst({
        where: {
          localId: Number(rawLocalId),
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
          locationId: dbMap.locationId,
          sublocationId: dbMap.sublocationId,
          linkedLocationId: dbMap.sublocation?.linkedLocationId,
        };
        sublocationMapCache.set(rawLocalId, mapped);
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

  // Log map properly as array of entries
  console.log("MAPPED: ", JSON.stringify(Array.from(sublocationMapCache.entries()), null, 2));

  const locationTotals = new Map<string, Prisma.Decimal>();
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

  console.log("LINES TO SYNC: ", JSON.stringify(linesToSync, null, 2));

  for (const line of linesToSync) {
    const lineQty = toDecimal(line.quantityOnHand) ?? new Prisma.Decimal(0);
    const locId = line.resolvedLocationId;
    const sublocId = line.resolvedSublocationId;
    const rawLocalId = String(line.locationId);

    const currentLocTotal = locationTotals.get(locId) ?? new Prisma.Decimal(0);
    locationTotals.set(locId, currentLocTotal.plus(lineQty));

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

  // Log map properly as array of entries
  console.log("SUBLOCATIONS: ", JSON.stringify(Array.from(sublocationTotals.entries()), null, 2));

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


  console.log("LOCATIONS: ", JSON.stringify(Array.from(locationTotals.entries()), null, 2));


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

    for (const [subKey, { sublocationId, totalQty, linkedLocationId }] of sublocationTotals) {
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

        adjustmentLines.push({
          stockAdjustmentLineId: crypto.randomUUID().toLowerCase(),
          productId,
          sublocation: sublocationId,
          targetLocationId: linkedLocationId || locationId,
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

        adjustmentLines.push({
          stockAdjustmentLineId: crypto.randomUUID().toLowerCase(),
          productId,
          sublocation: bin.sublocationId,
          targetLocationId: bin.sublocation?.linkedLocationId || locationId,
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

  console.log("ADJUSTMENT LINES: ", JSON.stringify(adjustmentLines, null, 2));

  return adjustmentLines;
}



export async function syncInventoryLinesReturnLines(
  tx: Tx,
  productId: string,
  inventoryLines: LocalInventoryLine[],
  caches?: SyncCache,
  selectedLocationIds?: string[]
): Promise<SyncAdjustmentLine[]> {
  const adjustmentLines: SyncAdjustmentLine[] = [];
  if (!inventoryLines.length) return adjustmentLines;

  const targetLocationIds = selectedLocationIds?.length ? selectedLocationIds : [];

  // Ensure map exists on cache object if passed
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

  const linesToSync: (LocalInventoryLine & {
    resolvedLocationId: string;
    resolvedSublocationId: string;
  })[] = [];

  for (const line of inventoryLines) {
    if (line.locationId === null || line.locationId === undefined) continue;

    const rawLocalId = String(line.locationId);
    if (isNaN(Number(rawLocalId))) continue;

    let mapped = sublocationMapCache.get(rawLocalId);

    if (!mapped) {
      const dbMap = await tx.sublocationLocationMap.findFirst({
        where: {
          localId: Number(rawLocalId),
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
          locationId: dbMap.locationId,
          sublocationId: dbMap.sublocationId,
          linkedLocationId: dbMap.sublocation?.linkedLocationId,
        };
        sublocationMapCache.set(rawLocalId, mapped);
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

  // console.log("MAPPED: ", JSON.stringify(Array.from(sublocationMapCache.entries()), null, 2));

  const locationTotals = new Map<string, Prisma.Decimal>();
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

  // console.log("LINES TO SYNC: ", JSON.stringify(linesToSync, null, 2));

  for (const line of linesToSync) {
    const lineQty = toDecimal(line.quantityOnHand) ?? new Prisma.Decimal(0);
    const locId = line.resolvedLocationId;
    const sublocId = line.resolvedSublocationId;
    const rawLocalId = String(line.locationId);

    const currentLocTotal = locationTotals.get(locId) ?? new Prisma.Decimal(0);
    locationTotals.set(locId, currentLocTotal.plus(lineQty));

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

  // console.log("SUBLOCATIONS: ", JSON.stringify(Array.from(sublocationTotals.entries()), null, 2));

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

  // console.log("LOCATIONS: ", JSON.stringify(Array.from(locationTotals.entries()), null, 2));

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

    for (const [subKey, { sublocationId, totalQty, linkedLocationId }] of sublocationTotals) {
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

        adjustmentLines.push({
          stockAdjustmentLineId: crypto.randomUUID().toLowerCase(),
          productId,
          sublocation: sublocationId,
          targetLocationId: linkedLocationId || locationId,
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

    // Zero-out cleared bins and emit negative adjustment lines
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

        adjustmentLines.push({
          stockAdjustmentLineId: crypto.randomUUID().toLowerCase(),
          productId,
          sublocation: bin.sublocationId,
          targetLocationId: bin.sublocation?.linkedLocationId || locationId,
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

  console.log("ADJUSTMENT LINES: ", JSON.stringify(adjustmentLines, null, 2));

  return adjustmentLines;
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockAdjustmentInput } from "@/schemas/stock-adjustment.schema";
import {
  AdjustmentStatus,
  InventorySerialAdjustmentAction,
  Prisma,
  InventoryAdjustmentLineReason,
} from "@/generated/prisma/client";
import { ZodError } from "zod";
import { InflowStockAdjustInput } from "@/lib/inflow/types";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";

async function generateAdjustmentNumber(tx: Prisma.TransactionClient): Promise<string> {
  // Explicitly lock the table in EXCLUSIVE mode for the duration of this transaction.
  // Other concurrent transactions will wait until this transaction commits.
  await tx.$executeRaw`
    LOCK TABLE "inventory_adjustment" IN EXCLUSIVE MODE;
  `;

  // Fetch the current MAXIMUM numeric ID value instead of COUNT to safely handle deletes
  const result = await tx.$queryRaw<Array<{ max_num: bigint | number | null }>>`
    SELECT MAX(
      NULLIF(
        regexp_replace("adjustmentNumber", '^ADJ-', ''), 
        ''
      )::bigint
    ) AS max_num 
    FROM "inventory_adjustment"
  `;

  const currentMax = Number(result[0]?.max_num ?? 0);
  const nextNum = (currentMax + 1).toString().padStart(5, "0");

  return `ADJ-${nextNum}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate request body against Zod Schema
    // const validatedData = stockAdjustmentSchema.parse(body);
    const {
      id: existingAdjustmentId,
      reasonId,
      locationId,
      remarks,
      status,
      lines,
    } = body as StockAdjustmentInput;
    
    // TODO: Replace with dynamic user context from session / auth header
    const performedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

    // Execute atomic transaction with custom timeout
    const result = await prisma.$transaction(
      async (tx) => {
        let adjustment: any;

        const createdAdjustmentLines: Array<{
          inflowId: string | null;
          productId: string;
          quantityOnHand: number;
          sublocation: string | null;
          serials: string[];
        }> = [];

        if (status === AdjustmentStatus.DRAFT && !existingAdjustmentId) {
          const existingDraft = await tx.inventoryAdjustment.findFirst({
            where: {
              status: AdjustmentStatus.DRAFT,
              lines: {
                some: {
                  locationId: locationId,
                  productId: { in: lines.map((l) => l.productId) },
                },
              },
            },
            select: { id: true, adjustmentNumber: true },
          });

          if (existingDraft) {
            throw new Error(
              `An open draft (${existingDraft.adjustmentNumber}) already exists for these items at this location. Please edit the existing draft or post it before creating a new one.`
            );
          }
        }

        // ----------------------------------------------------------------
        // 1. Save Header (Create or Update Draft Header)
        // ----------------------------------------------------------------
        if (existingAdjustmentId) {
          const existing = await tx.inventoryAdjustment.findUnique({
            where: { id: existingAdjustmentId },
          });

          if (!existing) {
            throw new Error("Adjustment record not found.");
          }
          if (existing.status === AdjustmentStatus.POSTED) {
            throw new Error("Cannot modify an adjustment that is already POSTED.");
          }

          // Clear nested draft records
          const existingLines = await tx.inventoryAdjustmentLine.findMany({
            where: { adjustmentId: existingAdjustmentId },
            select: { id: true },
          });
          const existingLineIds = existingLines.map((l) => l.id);

          if (existingLineIds.length > 0) {
            await tx.inventoryAdjustmentSerial.deleteMany({
              where: { adjustmentLineId: { in: existingLineIds } },
            });
            await tx.inventoryAdjustmentLineBin.deleteMany({
              where: { adjustmentLineId: { in: existingLineIds } },
            });
            await tx.inventoryAdjustmentLine.deleteMany({
              where: { adjustmentId: existingAdjustmentId },
            });
          }

          adjustment = await tx.inventoryAdjustment.update({
            where: { id: existingAdjustmentId },
            data: {
              adjustmentReasonId: reasonId || null,
              remarks: remarks || null,
              lastModifiedById: performedById,
              status: status as AdjustmentStatus,
            },
          });
        } else {
          const adjustmentNumber = await generateAdjustmentNumber(tx);
          const computedInflowId = crypto.randomUUID().toLowerCase();

          adjustment = await tx.inventoryAdjustment.create({
            data: {
              inflowId: computedInflowId,
              adjustmentNumber,
              adjustmentReasonId: reasonId || null,
              performedById,
              status: status as AdjustmentStatus,
              remarks: remarks || null,
            },
          });
        }

        // ----------------------------------------------------------------
        // 2. DRAFT FLOW
        // ----------------------------------------------------------------
        if (status === AdjustmentStatus.DRAFT) {
          const draftSerialsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const inventory = await tx.inventory.findUnique({
              where: {
                productId_locationId: {
                  productId: line.productId,
                  locationId,
                },
              },
            });

            const currentQtyBefore = inventory ? Number(inventory.quantityOnHand) : 0;
            const totalTargetQty = Number(line.quantityOnHand) || 0;
            const netAdjustmentQty = totalTargetQty - currentQtyBefore;
            const computedInflowId = crypto.randomUUID().toLowerCase();

            // In DRAFT mode, we create 1 line per product input
            const createdLine = await tx.inventoryAdjustmentLine.create({
              data: {
                inflowId: computedInflowId,
                adjustmentId: adjustment.inflowId,
                inventoryId: inventory?.id || null,
                productId: line.productId,
                locationId,
                inventoryBinId: null, // Left null during draft
                quantityBefore: currentQtyBefore,
                quantityAdjusted: netAdjustmentQty,
                quantityAfter: totalTargetQty,
                quantityReserved: line.quantityReserved,
                reason: (line.reason as InventoryAdjustmentLineReason) || null,
              },
            });

            const { bins = [] } = line;
            const assignedBinSerials = new Set<string>();

            // Process Draft Bins
            for (const binData of bins) {
              if (!binData.sublocationId) continue;

              const createdDraftBin = await tx.inventoryAdjustmentLineBin.create({
                data: {
                  adjustmentLineId: createdLine.id,
                  sublocationId: binData.sublocationId,
                  quantity: Number(binData.quantity) || 0,
                },
              });

              if (Array.isArray(binData.serials)) {
                binData.serials.forEach((sn: string) => {
                  const cleaned = sn?.trim();
                  if (cleaned) {
                    assignedBinSerials.add(cleaned);
                    draftSerialsToCreate.push({
                      adjustmentLineId: createdLine.id,
                      draftBinId: createdDraftBin.id,
                      serialNumber: cleaned,
                      action: InventorySerialAdjustmentAction.VERIFY,
                    });
                  }
                });
              }
            }

            // Unassigned / Line-level Serials
            const rawLineSerials: string[] = line.serials || [];
            rawLineSerials.forEach((sn: string) => {
              const cleaned = sn?.trim();
              if (cleaned && !assignedBinSerials.has(cleaned)) {
                draftSerialsToCreate.push({
                  adjustmentLineId: createdLine.id,
                  draftBinId: null,
                  serialNumber: cleaned,
                  action: InventorySerialAdjustmentAction.VERIFY,
                });
              }
            });
          }

          if (draftSerialsToCreate.length > 0) {
            await tx.inventoryAdjustmentSerial.createMany({
              data: draftSerialsToCreate,
            });
          }

          return adjustment;
        }

        // ----------------------------------------------------------------
        // 3. POSTED FLOW (Commit to Inventory, Bins, & Ledgers)
        // ----------------------------------------------------------------
        const ledgerEntriesToCreate: Prisma.InventoryLedgerCreateManyInput[] = [];
        const serialAuditsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const { productId, bins = [], trackSerials } = line;

          // Find or create header inventory
          let inventory = await tx.inventory.findUnique({
            where: { productId_locationId: { productId, locationId } },
          });

          const targetOnHand = Number(line.quantityOnHand) || 0;
          const currentOnHand = inventory ? Number(inventory.quantityOnHand) : 0;
          const netOnHandChange = targetOnHand - currentOnHand;

          if (!inventory) {
            inventory = await tx.inventory.create({
              data: {
                productId,
                locationId,
                quantityOnHand: targetOnHand,
                quantityAvailable: Math.max(
                  0,
                  targetOnHand - (Number(line.quantityReserved) || 0)
                ),
                quantityReserved: Number(line.quantityReserved) || 0,
              },
            });
          } else {
            const currentReserved = Number(inventory.quantityReserved) || 0;
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantityOnHand: targetOnHand,
                quantityReserved: Number(line.quantityReserved) || 0,
                quantityAvailable: Math.max(0, targetOnHand - currentReserved),
                lastCountedAt: new Date(),
                lastMovementAt: new Date(),
              },
            });
          }

          // Bin-level reconciliations
          const sublocationToBinMap = new Map<string, string>();

          for (const binData of bins) {
            const targetBinQty = Number(binData.quantity) || 0;
            const sublocationId = binData.sublocationId;

            if (!sublocationId) continue;

            let binRecord = await tx.inventoryBin.findUnique({
              where: {
                inventoryId_sublocationId: {
                  inventoryId: inventory.id,
                  sublocationId,
                },
              },
            });

            const previousBinQty = binRecord ? Number(binRecord.quantity) : 0;
            const quantityDifference = targetBinQty - previousBinQty;

            if (binRecord) {
              binRecord = await tx.inventoryBin.update({
                where: { id: binRecord.id },
                data: { quantity: targetBinQty },
              });
            } else {
              binRecord = await tx.inventoryBin.create({
                data: {
                  inventoryId: inventory.id,
                  sublocationId,
                  quantity: targetBinQty,
                },
              });
            }

            sublocationToBinMap.set(sublocationId, binRecord.id);

            // Staging Bin Ledger Entries
            if (quantityDifference !== 0) {
              ledgerEntriesToCreate.push({
                productId,
                locationId,
                sublocationId,
                transactionType: "ADJUSTMENT",
                referenceType: "ADJUSTMENT",
                referenceId: adjustment.id,
                performedById,
                quantityChange: quantityDifference,
                quantityBefore: previousBinQty,
                quantityAfter: targetBinQty,
                remarks:
                  remarks ||
                  `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
              });
            }
          }

          // Location Ledger Entry if no bins are present
          if (bins.length === 0 && netOnHandChange !== 0) {
            ledgerEntriesToCreate.push({
              productId,
              locationId,
              sublocationId: null,
              transactionType: "ADJUSTMENT",
              referenceType: "ADJUSTMENT",
              referenceId: adjustment.id,
              performedById,
              quantityChange: netOnHandChange,
              quantityBefore: currentOnHand,
              quantityAfter: targetOnHand,
              remarks:
                remarks ||
                `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
            });
          }

          // ==============================================================
          // BIN LINKING & ADJUSTMENT LINE CREATION
          // ==============================================================

          // if (!trackSerials) {
          //   // NON-SERIALIZED PATH:
          //   // Link directly to inventoryBinId on each InventoryAdjustmentLine.
          //   if (bins.length > 0) {
          //     for (const binData of bins) {
          //       if (!binData.sublocationId) continue;
          //       const committedBinId = sublocationToBinMap.get(binData.sublocationId) || null;
          //       const targetBinQty = Number(binData.quantity) || 0;

          //       // Find existing bin balance prior to update to compute delta
          //       const existingBin = await tx.inventoryBin.findUnique({
          //         where: {
          //           inventoryId_sublocationId: {
          //             inventoryId: inventory.id,
          //             sublocationId: binData.sublocationId,
          //           },
          //         },
          //       });
                
          //       const prevBinQty = existingBin ? Number(existingBin.quantity) : 0;

          //       await tx.inventoryAdjustmentLine.create({
          //         data: {
          //           adjustmentId: adjustment.id,
          //           inventoryId: inventory.id,
          //           productId,
          //           locationId,
          //           inventoryBinId: committedBinId, // Directly populated
          //           quantityBefore: prevBinQty,
          //           quantityAdjusted: targetBinQty - prevBinQty,
          //           quantityAfter: targetBinQty,
          //           quantityReserved: line.quantityReserved,
          //           reason: (line.reason as InventoryAdjustmentLineReason) || null,
          //         },
          //       });
          //     }
          //   } else {
          //     // Non-bin tracked line
          //     await tx.inventoryAdjustmentLine.create({
          //       data: {
          //         adjustmentId: adjustment.id,
          //         inventoryId: inventory.id,
          //         productId,
          //         locationId,
          //         inventoryBinId: null,
          //         quantityBefore: currentOnHand,
          //         quantityAdjusted: netOnHandChange,
          //         quantityAfter: targetOnHand,
          //         quantityReserved: line.quantityReserved,
          //         reason: (line.reason as InventoryAdjustmentLineReason) || null,
          //       },
          //     });
          //   }
          // } 
          if (!trackSerials) {
            // NON-SERIALIZED PATH:
            if (bins.length > 0) {
              for (const binData of bins) {
                if (!binData.sublocationId) continue;

                const sublocation = await tx.sublocation.findUnique({
                  where: { id: binData.sublocationId },
                  select: { name: true }
                });

                if (!sublocation?.name) continue;

                const targetBinQty = Number(binData.quantity) || 0;
                const committedBinId = sublocationToBinMap.get(binData.sublocationId) || null;

                // 1. Fetch the bin state BEFORE upserting
                const existingBin = await tx.inventoryBin.findUnique({
                  where: {
                    inventoryId_sublocationId: {
                      inventoryId: inventory.id,
                      sublocationId: binData.sublocationId,
                    },
                  },
                });

                const prevBinQty = existingBin ? Number(existingBin.quantity) : 0;
                const quantityDifference = targetBinQty - prevBinQty;

                // 2. Upsert the Bin
                if (existingBin) {
                  await tx.inventoryBin.update({
                    where: { id: existingBin.id },
                    data: { quantity: targetBinQty },
                  });
                } else {
                  const newBin = await tx.inventoryBin.create({
                    data: {
                      inventoryId: inventory.id,
                      sublocationId: binData.sublocationId,
                      quantity: targetBinQty,
                    },
                  });
                  // Update map for created bin ID
                  sublocationToBinMap.set(binData.sublocationId, newBin.id);
                }

                // 3. Stage Bin Ledger Entry
                if (quantityDifference !== 0) {
                  ledgerEntriesToCreate.push({
                    productId,
                    locationId,
                    sublocationId: binData.sublocationId,
                    transactionType: "ADJUSTMENT",
                    referenceType: "ADJUSTMENT",
                    referenceId: adjustment.id,
                    performedById,
                    quantityChange: quantityDifference,
                    quantityBefore: prevBinQty,
                    quantityAfter: targetBinQty,
                    remarks:
                      remarks ||
                      `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
                  });
                }

                const computedInflowId = crypto.randomUUID().toLowerCase();

                // 4. Create Line Item with accurate quantityBefore (0)
                const createdLine = await tx.inventoryAdjustmentLine.create({
                  data: {
                    inflowId: computedInflowId,
                    adjustmentId: adjustment.inflowId,
                    inventoryId: inventory.id,
                    productId,
                    locationId,
                    inventoryBinId: committedBinId || sublocationToBinMap.get(binData.sublocationId),
                    quantityBefore: prevBinQty, // Correctly records 0 for new bins!
                    quantityAdjusted: quantityDifference,
                    quantityAfter: targetBinQty,
                    quantityReserved: line.quantityReserved,
                    reason: (line.reason as InventoryAdjustmentLineReason) || null,
                  },
                });

                // Keep track of the created line data for the payload
                createdAdjustmentLines.push({
                  inflowId: createdLine.inflowId,
                  productId: line.productId,
                  quantityOnHand: targetBinQty,
                  sublocation: sublocation.name,
                  serials: [],
                });
              }
            } else {
              // Non-bin tracked line
              const computedInflowId = crypto.randomUUID().toLowerCase();

              const createdLine = await tx.inventoryAdjustmentLine.create({
                data: {
                  inflowId: computedInflowId,
                  adjustmentId: adjustment.inflowId,
                  inventoryId: inventory.id,
                  productId,
                  locationId,
                  inventoryBinId: null,
                  quantityBefore: currentOnHand,
                  quantityAdjusted: netOnHandChange,
                  quantityAfter: targetOnHand,
                  quantityReserved: line.quantityReserved,
                  reason: (line.reason as InventoryAdjustmentLineReason) || null,
                },
              });

              // Keep track of the created line data for the payload
              createdAdjustmentLines.push({
                inflowId: createdLine.inflowId,
                productId: line.productId,
                quantityOnHand: Number(line.quantityOnHand) || 0,
                sublocation: null,
                serials: [],
              });
            }
          } else {

            const computedInflowId = crypto.randomUUID().toLowerCase();
          
            // SERIALIZED PATH:
            // Single line representing the primary serial transaction
            const createdLine = await tx.inventoryAdjustmentLine.create({
              data: {
                inflowId: computedInflowId,
                adjustmentId: adjustment.inflowId,
                inventoryId: inventory.id,
                productId,
                locationId,
                inventoryBinId: null, // Serials carry their own to/from bin references
                quantityBefore: currentOnHand,
                quantityAdjusted: netOnHandChange,
                quantityAfter: targetOnHand,
                quantityReserved: line.quantityReserved,
                reason: (line.reason as InventoryAdjustmentLineReason) || null,
              },
            });

            // Map serial numbers to bins
            const serialToBinIdMap = new Map<string, string | null>();
            const allIncomingSerials: string[] = [];

            (line.serials || []).forEach((s: string) => {
              const cleaned = s.trim();
              if (cleaned) {
                allIncomingSerials.push(cleaned);
                serialToBinIdMap.set(cleaned, null);
              }
            });

            for (const b of bins) {
              const binId = sublocationToBinMap.get(b.sublocationId) || null;
              
              if (Array.isArray(b.serials)) {
                for (const binSerial of b.serials) {
                  const cleaned = binSerial.trim();
                  if (cleaned) {
                    if (!allIncomingSerials.includes(cleaned)) {
                      allIncomingSerials.push(cleaned);
                    }
                    serialToBinIdMap.set(cleaned, binId);
                  }
                }
              }
            }

            // BUILD QUEUE PAYLOAD FOR SERIALS
            if (bins.length > 0) {
              // Collect serials mapped to specific sublocations vs unallocated
              const allocatedSerials = new Set<string>();

              for (const b of bins) {
                const sublocation = await tx.sublocation.findUnique({
                  where: { id: b.sublocationId },
                  select: { name: true },
                });

                const binSerials = (b.serials || []).map((s) => s.trim()).filter(Boolean);
                binSerials.forEach((s) => allocatedSerials.add(s));

                createdAdjustmentLines.push({
                  inflowId: createdLine.inflowId,
                  productId: line.productId,
                  quantityOnHand: Number(b.quantity) || binSerials.length,
                  sublocation: sublocation?.name || null,
                  serials: binSerials,
                });
              }

              // Capture remaining unallocated master serials (not in any bin)
              const unallocatedSerials = allIncomingSerials.filter(
                (sn) => !allocatedSerials.has(sn)
              );

              if (unallocatedSerials.length > 0) {
                createdAdjustmentLines.push({
                  inflowId: createdLine.inflowId,
                  productId: line.productId,
                  quantityOnHand: unallocatedSerials.length,
                  sublocation: null,
                  serials: unallocatedSerials,
                });
              }
            } else {
              // Serialized product with no sublocations/bins
              createdAdjustmentLines.push({
                inflowId: createdLine.inflowId,
                productId: line.productId,
                quantityOnHand: Number(line.quantityOnHand) || 0,
                sublocation: null,
                serials: allIncomingSerials,
              });
            }

            const existingSerials = await tx.inventoryBinItem.findMany({
              where: { productId, locationId },
            });

            const existingSerialMap = new Map(
              existingSerials.map((s) => [s.serialNumber, s])
            );
            const existingSerialNumbers = Array.from(existingSerialMap.keys());

            const serialsToCreate = allIncomingSerials.filter(
              (sn) => !existingSerialNumbers.includes(sn)
            );
            const serialsToDelete = existingSerials.filter(
              (s) =>
                !allIncomingSerials.includes(s.serialNumber) &&
                s.status === "IN_STOCK"
            );

            // 1. Process Insertions
            for (const sn of serialsToCreate) {
              const targetBinId = serialToBinIdMap.get(sn) || null;
              const newItem = await tx.inventoryBinItem.create({
                data: {
                  productId,
                  locationId,
                  inventoryBinId: targetBinId,
                  serialNumber: sn,
                  status: "IN_STOCK",
                },
              });

              serialAuditsToCreate.push({
                adjustmentLineId: createdLine.id,
                inventoryBinItemId: newItem.id,
                serialNumber: sn,
                action: InventorySerialAdjustmentAction.ADD,
                fromInventoryBinId: null,
                toInventoryBinId: targetBinId,
              });
            }

            // 2. Process Movements & Verifications
            for (const sn of allIncomingSerials) {
              if (existingSerialMap.has(sn)) {
                const item = existingSerialMap.get(sn)!;
                const targetBinId = serialToBinIdMap.get(sn) || null;

                if (item.inventoryBinId !== targetBinId) {
                  await tx.inventoryBinItem.update({
                    where: { id: item.id },
                    data: { inventoryBinId: targetBinId },
                  });

                  serialAuditsToCreate.push({
                    adjustmentLineId: createdLine.id,
                    inventoryBinItemId: item.id,
                    serialNumber: sn,
                    action: InventorySerialAdjustmentAction.MOVE,
                    fromInventoryBinId: item.inventoryBinId,
                    toInventoryBinId: targetBinId,
                  });
                } else {
                  serialAuditsToCreate.push({
                    adjustmentLineId: createdLine.id,
                    inventoryBinItemId: item.id,
                    serialNumber: sn,
                    action: InventorySerialAdjustmentAction.VERIFY,
                    fromInventoryBinId: targetBinId,
                    toInventoryBinId: targetBinId,
                  });
                }
              }
            }

            // 3. Process Deletions
            if (serialsToDelete.length > 0) {
              serialsToDelete.forEach((item) => {
                serialAuditsToCreate.push({
                  adjustmentLineId: createdLine.id,
                  inventoryBinItemId: null,
                  serialNumber: item.serialNumber,
                  action: InventorySerialAdjustmentAction.REMOVE,
                  fromInventoryBinId: item.inventoryBinId,
                  toInventoryBinId: null,
                });
              });

              await tx.inventoryBinItem.deleteMany({
                where: { id: { in: serialsToDelete.map((s) => s.id) } },
              });
            }
          }
        }

        // Dynamic Bulk Inserts for Ledger & Audit Logs
        if (ledgerEntriesToCreate.length > 0) {
          await tx.inventoryLedger.createMany({ data: ledgerEntriesToCreate });
        }
        if (serialAuditsToCreate.length > 0) {
          await tx.inventoryAdjustmentSerial.createMany({ data: serialAuditsToCreate });
        }

        return {
          adjustment,
          createdAdjustmentLines,
        };
      },
      { timeout: 15000 }
    );

    // =================================================================
    // DISPATCH BACKGROUND WORKER JOB
    // =================================================================
    // Only dispatch background sync when posted (or handle draft sync if applicable)
    if (status === AdjustmentStatus.POSTED) {
      const inflowPayload: InflowStockAdjustInput = {
        // Send inFlow UUID if present, otherwise generate a valid v4 UUID
        stockAdjustmentId: result.adjustment.inflowId,
        adjustmentNumber: result.adjustment.adjustmentNumber,
        adjustmentReasonId: reasonId || "",
        date: new Date().toISOString(),
        isCancelled: false,
        lastModifiedById: performedById,
        locationId: locationId,
        remarks: remarks || "",
        // Map using the created db line records
        lines: result.createdAdjustmentLines.map((createdLine: any) => ({
          stockAdjustmentLineId: createdLine.inflowId, // Matches computedInflowId saved in DB
          productId: createdLine.productId,
          sublocation: createdLine.sublocation,
          quantity: {
            standardQuantity: String(createdLine.quantityOnHand),
            uomQuantity: String(createdLine.quantityOnHand),
            uom: "ea.",
            serialNumbers: createdLine.serials,
          },
        })),
      };

      const midQueue = getMidSyncQueue();
      // await midQueue.add("stock_adjust_upsert", {
      //   source: "STOCK_ADJUST_UPSERT_CLOUD",
      //   model: "StockAdjustment",
      //   payload: inflowPayload,
      //   timestamp: new Date().toISOString(),
      // });
    }

    return NextResponse.json(
      {
        message:
          status === AdjustmentStatus.DRAFT
            ? "Adjustment draft saved successfully."
            : "Adjustment posted successfully.",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    console.error("[INVENTORY_ADJUSTMENT_POST_ERROR]", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "An internal error occurred while processing the adjustment.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { adjustmentId, status, reason } = body;

    if (!adjustmentId || !status) {
      return NextResponse.json(
        { error: "Adjustment ID and target status are required." },
        { status: 400 }
      );
    }

    // Validate allowed transition statuses
    const allowedStatuses = [AdjustmentStatus.POSTED, AdjustmentStatus.VOIDED];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid target status. Must be one of: ${allowedStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch existing adjustment to verify state
    const existingAdjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id: adjustmentId },
      select: { id: true, status: true },
    });

    if (!existingAdjustment) {
      return NextResponse.json(
        { error: "Inventory adjustment record not found." },
        { status: 404 }
      );
    }

    // Guard rail: Only DRAFT adjustments can be status-updated or cancelled
    if (existingAdjustment.status !== AdjustmentStatus.DRAFT) {
      return NextResponse.json(
        { error: `Cannot update adjustment. Current status is ${existingAdjustment.status}. Only DRAFT adjustments can be modified or voided.` },
        { status: 422 }
      );
    }

    // Perform status patch
    const updatedAdjustment = await prisma.inventoryAdjustment.update({
      where: { id: adjustmentId },
      data: {
        status: status,
        remarks: reason ? `[${status}] ${reason}` : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Adjustment ${adjustmentId} status updated to ${status}.`,
      data: updatedAdjustment,
    });
  } catch (error: any) {
    console.error("Failed to patch adjustment status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to patch adjustment status." },
      { status: 500 }
    );
  }
}


/**
 * Generates the next sequential adjustment number using transactional locking
 * to prevent duplicate key race conditions under high concurrency.
 */
// async function generateAdjustmentNumber(tx: Prisma.TransactionClient): Promise<string> {
//   const result = await tx.$queryRaw<Array<{ count: bigint | number }>>`
//     SELECT COUNT(*)::bigint FROM "inventory_adjustment"
//   `;

//   // Number(...) cleanly parses both JS numbers and BigInts
//   const count = Number(result[0]?.count ?? 0); 
//   const nextNum = (count + 1).toString().padStart(5, "0");
  
//   return `ADJ-${nextNum}`;
// }

/**
 * Generates the next sequential adjustment number using explicit table locking
 * to prevent duplicate key race conditions under high concurrency.
 */

// if (!trackSerials) {
//             // NON-SERIALIZED PATH:
//             // Link directly to inventoryBinId on each InventoryAdjustmentLine.
//             if (bins.length > 0) {
//               for (const binData of bins) {
//                 if (!binData.sublocationId) continue;
                
//                 const committedBinId = sublocationToBinMap.get(binData.sublocationId) || null;
//                 const targetBinQty = Number(binData.quantity) || 0;

//                 // 1. Query existing bin balance BEFORE performing upsert/update
//                 const existingBin = await tx.inventoryBin.findUnique({
//                   where: {
//                     inventoryId_sublocationId: {
//                       inventoryId: inventory.id,
//                       sublocationId: binData.sublocationId,
//                     },
//                   },
//                 });

//                 const prevBinQty = existingBin ? Number(existingBin.quantity) : 0;
//                 const quantityAdjusted = targetBinQty - prevBinQty;

//                 // 2. Upsert/Update the Bin quantity
//                 if (existingBin) {
//                   await tx.inventoryBin.update({
//                     where: { id: existingBin.id },
//                     data: { quantity: targetBinQty },
//                   });
//                 } else {
//                   await tx.inventoryBin.create({
//                     data: {
//                       inventoryId: inventory.id,
//                       sublocationId: binData.sublocationId,
//                       quantity: targetBinQty,
//                     },
//                   });
//                 }

//                 // 3. Create the adjustment line with accurate before/adjusted values
//                 await tx.inventoryAdjustmentLine.create({
//                   data: {
//                     adjustmentId: adjustment.id,
//                     inventoryId: inventory.id,
//                     productId,
//                     locationId,
//                     inventoryBinId: committedBinId,
//                     quantityBefore: prevBinQty, // Correctly records 0 for initial stock
//                     quantityAdjusted: quantityAdjusted, // Correctly records targetBinQty - 0
//                     // quantityBefore: currentOnHand,
//                     // quantityAdjusted: netOnHandChange,
//                     quantityAfter: targetBinQty,
//                     quantityReserved: line.quantityReserved,
//                     reason: (line.reason as InventoryAdjustmentLineReason) || null,
//                   },
//                 });
//               }
//             } else {
//               // Non-bin tracked line
//               await tx.inventoryAdjustmentLine.create({
//                 data: {
//                   adjustmentId: adjustment.id,
//                   inventoryId: inventory.id,
//                   productId,
//                   locationId,
//                   inventoryBinId: null,
//                   quantityBefore: currentOnHand,
//                   quantityAdjusted: netOnHandChange,
//                   quantityAfter: targetOnHand,
//                   quantityReserved: line.quantityReserved,
//                   reason: (line.reason as InventoryAdjustmentLineReason) || null,
//                 },
//               });
//             }
            
//           } else {


        // ----------------------------------------------------------------
        // 3. Save DRAFT Sub-resources & Early Return
        // ----------------------------------------------------------------
        // if (status === AdjustmentStatus.DRAFT) {
        //   const draftSerialsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];
        //   const draftBinsToCreate: Prisma.InventoryAdjustmentLineBinCreateManyInput[] = [];

        //   for (let i = 0; i < lines.length; i++) {
        //     const line = lines[i];
        //     const createdLine = createdLines[i];

        //     // A. Process Serials for Draft
        //     const allLineSerials = new Set<string>(
        //       (line.serials || []).map((s: string) => s.trim()).filter(Boolean)
        //     );

        //     if (Array.isArray(line.bins)) {
        //       for (const b of line.bins) {
        //         if (Array.isArray(b.serials)) {
        //           b.serials.forEach((sn: string) => {
        //             const cleaned = sn?.trim();
        //             if (cleaned) allLineSerials.add(cleaned);
        //           });
        //         }
        //       }
        //     }

        //     if (allLineSerials.size > 0) {
        //       Array.from(allLineSerials).forEach((sn) => {
        //         draftSerialsToCreate.push({
        //           adjustmentLineId: createdLine.id,
        //           serialNumber: sn,
        //           action: InventorySerialAdjustmentAction.VERIFY,
        //         });
        //       });
        //     }

        //     // B. Process Bin Allocations for Draft
        //     const { bins = [] } = line;
        //     for (const binData of bins) {
        //       if (!binData.sublocationId) continue;

        //       draftBinsToCreate.push({
        //         adjustmentLineId: createdLine.id,
        //         sublocationId: binData.sublocationId,
        //         quantity: Number(binData.quantity) || 0,
        //       });
        //     }
        //   }

        //   if (draftSerialsToCreate.length > 0) {
        //     await tx.inventoryAdjustmentSerial.createMany({
        //       data: draftSerialsToCreate,
        //     });
        //   }

        //   if (draftBinsToCreate.length > 0) {
        //     await tx.inventoryAdjustmentLineBin.createMany({
        //       data: draftBinsToCreate,
        //     });
        //   }

        //   return adjustment;
        // }


// if (status === AdjustmentStatus.DRAFT) {
        //   const draftSerialsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];

        //   for (const line of lines) {
        //     const createdLine = createdLineMap.get(line.productId);
        //     const { productId, bins = [] } = line;

        //     // Find or create Inventory container so sublocation bins can be mapped/linked
        //     let inventory = await tx.inventory.findUnique({
        //       where: { productId_locationId: { productId, locationId } },
        //     });

        //     if (!inventory) {
        //       inventory = await tx.inventory.create({
        //         data: {
        //           productId,
        //           locationId,
        //           quantityOnHand: 0,
        //           quantityAvailable: 0,
        //           quantityReserved: 0,
        //         },
        //       });
        //     }

        //     // Map sublocations to actual InventoryBin records during DRAFT save
        //     const sublocationToBinMap = new Map<string, string>();
        //     const serialToBinIdMap = new Map<string, string | null>();

        //     for (const binData of bins) {
        //       const sublocationId = binData.sublocationId;
        //       if (!sublocationId) continue;

        //       // Find existing bin or create placeholder bin for draft persistence
        //       let binRecord = await tx.inventoryBin.findUnique({
        //         where: {
        //           inventoryId_sublocationId: {
        //             inventoryId: inventory.id,
        //             sublocationId,
        //           },
        //         },
        //       });

        //       if (!binRecord) {
        //         binRecord = await tx.inventoryBin.create({
        //           data: {
        //             inventoryId: inventory.id,
        //             sublocationId,
        //             quantity: Number(binData.quantity) || 0,
        //           },
        //         });
        //       }

        //       sublocationToBinMap.set(sublocationId, binRecord.id);

        //       // Map serials inside this bin to its bin record ID
        //       if (Array.isArray(binData.serials)) {
        //         binData.serials.forEach((binSerial: string) => {
        //           const cleaned = binSerial?.trim();
        //           if (cleaned) {
        //             serialToBinIdMap.set(cleaned, binRecord.id);
        //           }
        //         });
        //       }
        //     }

        //     // Collect top-level and bin-level serials
        //     const allLineSerials = new Map<string, string | null>();

        //     (line.serials || []).forEach((s: string) => {
        //       const cleaned = s.trim();
        //       if (cleaned) {
        //         allLineSerials.set(cleaned, serialToBinIdMap.get(cleaned) || null);
        //       }
        //     });

        //     for (const [sn, targetBinId] of serialToBinIdMap.entries()) {
        //       if (!allLineSerials.has(sn)) {
        //         allLineSerials.set(sn, targetBinId);
        //       }
        //     }

        //     // Stage serial adjustment audit records with target bin context for DRAFT mode
        //     for (const [sn, targetBinId] of allLineSerials.entries()) {
        //       draftSerialsToCreate.push({
        //         adjustmentLineId: createdLine.id,
        //         serialNumber: sn,
        //         action: InventorySerialAdjustmentAction.VERIFY,
        //         fromInventoryBinId: targetBinId,
        //         toInventoryBinId: targetBinId,
        //       });
        //     }
        //   }

        //   if (draftSerialsToCreate.length > 0) {
        //     await tx.inventoryAdjustmentSerial.createMany({
        //       data: draftSerialsToCreate,
        //     });
        //   }

        //   return adjustment;
        // }

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { stockAdjustmentSchema } from "@/schemas/stock-adjustment.schema";
// import {
//   InventoryTransactionType,
//   InventoryReferenceType,
//   AdjustmentStatus,
// } from "@/generated/prisma/client";

// async function generateAdjustmentNumber(tx: any): Promise<string> {
//   const count = await tx.inventoryAdjustment.count();
//   const nextNum = (count + 1).toString().padStart(5, "0");
//   return `ADJ-${nextNum}`;
// }

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();

//     // 1. Validate request body against Zod Schema
//     const validatedData = stockAdjustmentSchema.parse(body);
//     const {
//       id: existingAdjustmentId,
//       reasonId,
//       locationId,
//       remarks,
//       status,
//       lines,
//     } = validatedData;

//     const performedById = "cc920c31-bcb2-4264-9946-4b7693c9c7e0"; // test user

//     // Execute atomic transaction
//     const result = await prisma.$transaction(async (tx) => {
//       let adjustment: any;

//       // ----------------------------------------------------------------
//       // 1. Save Header & Lines (Draft or Posted)
//       // ----------------------------------------------------------------
//       if (existingAdjustmentId) {
//         const existing = await tx.inventoryAdjustment.findUnique({
//           where: { id: existingAdjustmentId },
//         });

//         if (!existing) {
//           throw new Error("Adjustment record not found.");
//         }
//         if (existing.status === AdjustmentStatus.POSTED) {
//           throw new Error("Cannot modify an adjustment that is already POSTED.");
//         }

//         // Clean up old draft lines before re-creating them
//         await tx.inventoryAdjustmentLine.deleteMany({
//           where: { adjustmentId: existingAdjustmentId },
//         });

//         adjustment = await tx.inventoryAdjustment.update({
//           where: { id: existingAdjustmentId },
//           data: {
//             adjustmentReasonId: reasonId || null,
//             remarks: remarks || null,
//             performedById,
//             status: status as AdjustmentStatus,
//           },
//         });
//       } else {
//         const adjustmentNumber = await generateAdjustmentNumber(tx);

//         adjustment = await tx.inventoryAdjustment.create({
//           data: {
//             adjustmentNumber,
//             adjustmentReasonId: reasonId || null,
//             performedById,
//             status: status as AdjustmentStatus,
//             remarks: remarks || null,
//           },
//         });
//       }

//       // Record adjustment lines and serial audit snapshots
//       const createdLineMap = new Map<string, any>(); // Map productId -> created line

//       for (const line of lines) {
//         const inventory = await tx.inventory.findUnique({
//           where: {
//             productId_locationId: {
//               productId: line.productId,
//               locationId,
//             },
//           },
//         });

//         const currentQtyBefore = inventory ? Number(inventory.quantityOnHand) : 0;
//         const totalTargetQty = Number(line.quantityOnHand) || 0;
//         const netAdjustmentQty = totalTargetQty - currentQtyBefore;

//         const createdLine = await tx.inventoryAdjustmentLine.create({
//           data: {
//             adjustmentId: adjustment.id,
//             inventoryId: inventory?.id || null,
//             productId: line.productId,
//             locationId: locationId,
//             quantityBefore: currentQtyBefore,
//             quantityAdjusted: netAdjustmentQty,
//             quantityAfter: totalTargetQty,
//             reason: line.reason || null,
//           },
//         });

//         createdLineMap.set(line.productId, createdLine);
//       }

//       // ----------------------------------------------------------------
//       // 2. Return early if DRAFT status
//       // ----------------------------------------------------------------
//       if (status === "DRAFT") {
//         // Collect top-level and bin-level serials for draft record
//         for (const line of lines) {
//           const createdLine = createdLineMap.get(line.productId);
//           const allLineSerials = new Set<string>(
//             (line.serials || []).map((s) => s.trim()).filter(Boolean)
//           );
//           if (Array.isArray(line.bins)) {
//             for (const b of line.bins) {
//               if (Array.isArray(b.serials)) {
//                 b.serials.forEach((sn) => {
//                   if (sn && sn.trim()) allLineSerials.add(sn.trim());
//                 });
//               }
//             }
//           }

//           if (allLineSerials.size > 0) {
//             await tx.inventoryAdjustmentSerial.createMany({
//               data: Array.from(allLineSerials).map((sn) => ({
//                 adjustmentLineId: createdLine.id,
//                 serialNumber: sn,
//               })),
//             });
//           }
//         }
//         return adjustment;
//       }

//       // ----------------------------------------------------------------
//       // 3. Process Inventory, Bins, Ledgers & Serials (POSTED Status)
//       // ----------------------------------------------------------------
//       for (const line of lines) {
//         const { productId, bins = [] } = line;
//         const createdLine = createdLineMap.get(productId);

//         let inventory = await tx.inventory.findUnique({
//           where: { productId_locationId: { productId, locationId } },
//         });

//         const targetOnHand = Number(line.quantityOnHand) || 0;
//         const currentOnHand = inventory ? Number(inventory.quantityOnHand) : 0;
//         const netOnHandChange = targetOnHand - currentOnHand;

//         if (!inventory) {
//           inventory = await tx.inventory.create({
//             data: {
//               productId,
//               locationId,
//               quantityOnHand: targetOnHand,
//               quantityAvailable: Math.max(
//                 0,
//                 targetOnHand - (Number(line.quantityReserved) || 0)
//               ),
//               quantityReserved: Number(line.quantityReserved) || 0,
//             },
//           });
//         } else {
//           const currentReserved = Number(inventory.quantityReserved) || 0;
//           await tx.inventory.update({
//             where: { id: inventory.id },
//             data: {
//               quantityOnHand: targetOnHand,
//               quantityAvailable: Math.max(0, targetOnHand - currentReserved),
//               lastCountedAt: new Date(),
//               lastMovementAt: new Date(),
//             },
//           });
//         }

//         // Map sublocation ID -> InventoryBin ID
//         const sublocationToBinMap = new Map<string, string>();

//         for (const binData of bins) {
//           const targetBinQty = Number(binData.quantity) || 0;
//           const sublocationId = binData.sublocationId;

//           if (!sublocationId) continue;

//           let binRecord = await tx.inventoryBin.findUnique({
//             where: {
//               inventoryId_sublocationId: {
//                 inventoryId: inventory.id,
//                 sublocationId,
//               },
//             },
//           });

//           const previousBinQty = binRecord ? Number(binRecord.quantity) : 0;
//           const quantityDifference = targetBinQty - previousBinQty;

//           if (binRecord) {
//             binRecord = await tx.inventoryBin.update({
//               where: { id: binRecord.id },
//               data: { quantity: targetBinQty },
//             });
//           } else {
//             binRecord = await tx.inventoryBin.create({
//               data: {
//                 inventoryId: inventory.id,
//                 sublocationId,
//                 quantity: targetBinQty,
//               },
//             });
//           }

//           sublocationToBinMap.set(sublocationId, binRecord.id);

//           // Bin-level Audit Ledger entry
//           if (quantityDifference !== 0) {
//             await tx.inventoryLedger.create({
//               data: {
//                 productId,
//                 locationId,
//                 sublocationId,
//                 transactionType: InventoryTransactionType.ADJUSTMENT,
//                 referenceType: InventoryReferenceType.ADJUSTMENT,
//                 referenceId: adjustment.id,
//                 performedById,
//                 quantityChange: quantityDifference,
//                 quantityBefore: previousBinQty,
//                 quantityAfter: targetBinQty,
//                 remarks:
//                   remarks ||
//                   `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
//               },
//             });
//           }
//         }

//         // Location-level Audit Ledger entry (if no bins are defined)
//         if (bins.length === 0 && netOnHandChange !== 0) {
//           await tx.inventoryLedger.create({
//             data: {
//               productId,
//               locationId,
//               sublocationId: null,
//               transactionType: InventoryTransactionType.ADJUSTMENT,
//               referenceType: InventoryReferenceType.ADJUSTMENT,
//               referenceId: adjustment.id,
//               performedById,
//               quantityChange: netOnHandChange,
//               quantityBefore: currentOnHand,
//               quantityAfter: targetOnHand,
//               remarks:
//                 remarks ||
//                 `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
//             },
//           });
//         }

//         // ------------------------------------------------------------
//         // 4. Reconcile Serial Numbers & Linking (InventoryBinItem)
//         // ------------------------------------------------------------
//         const serialToBinIdMap = new Map<string, string | null>();
//         const allIncomingSerials: string[] = [];

//         // Gather top-level serials
//         (line.serials || []).forEach((s) => {
//           const cleaned = s.trim();
//           if (cleaned) {
//             allIncomingSerials.push(cleaned);
//             serialToBinIdMap.set(cleaned, null);
//           }
//         });

//         // Gather bin-level serials (override bin ID)
//         for (const b of bins) {
//           const binId = sublocationToBinMap.get(b.sublocationId) || null;
//           if (Array.isArray(b.serials)) {
//             for (const binSerial of b.serials) {
//               const cleaned = binSerial.trim();
//               if (cleaned) {
//                 if (!allIncomingSerials.includes(cleaned)) {
//                   allIncomingSerials.push(cleaned);
//                 }
//                 serialToBinIdMap.set(cleaned, binId);
//               }
//             }
//           }
//         }

//         if (line.trackSerials) {
//           // Find existing serial items currently in stock for this product & location
//           const existingSerials = await tx.inventoryBinItem.findMany({
//             where: { productId, locationId },
//           });

//           const existingSerialNumbers = existingSerials.map((s) => s.serialNumber);

//           const serialsToCreate = allIncomingSerials.filter(
//             (sn) => !existingSerialNumbers.includes(sn)
//           );
//           const serialsToDelete = existingSerials.filter(
//             (s) => !allIncomingSerials.includes(s.serialNumber) && s.status === "IN_STOCK"
//           );

//           // Delete removed serials
//           if (serialsToDelete.length > 0) {
//             await tx.inventoryBinItem.deleteMany({
//               where: {
//                 id: { in: serialsToDelete.map((s) => s.id) },
//               },
//             });
//           }

//           // Create new serials
//           if (serialsToCreate.length > 0) {
//             for (const sn of serialsToCreate) {
//               await tx.inventoryBinItem.create({
//                 data: {
//                   productId,
//                   locationId,
//                   inventoryBinId: serialToBinIdMap.get(sn) || null,
//                   serialNumber: sn,
//                   status: "IN_STOCK",
//                 },
//               });
//             }
//           }

//           // Update bin placements for kept existing serials
//           for (const sn of allIncomingSerials) {
//             if (existingSerialNumbers.includes(sn)) {
//               await tx.inventoryBinItem.updateMany({
//                 where: { productId, locationId, serialNumber: sn },
//                 data: { inventoryBinId: serialToBinIdMap.get(sn) || null },
//               });
//             }
//           }
//         }

//         // Link all adjusted serials back to InventoryAdjustmentSerial for auditing
//         const activeSerialRecords = await tx.inventoryBinItem.findMany({
//           where: {
//             productId,
//             locationId,
//             serialNumber: { in: allIncomingSerials },
//           },
//         });

//         const serialIdMap = new Map(
//           activeSerialRecords.map((item) => [item.serialNumber, item.id])
//         );

//         if (allIncomingSerials.length > 0) {
//           await tx.inventoryAdjustmentSerial.createMany({
//             data: allIncomingSerials.map((sn) => ({
//               adjustmentLineId: createdLine.id,
//               serialNumber: sn,
//               inventoryItemId: serialIdMap.get(sn) || null,
//             })),
//           });
//         }
//       }

//       return adjustment;
//     });

//     return NextResponse.json(
//       {
//         message:
//           status === "DRAFT"
//             ? "Adjustment draft saved successfully."
//             : "Adjustment posted successfully.",
//         data: result,
//       },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     console.error("[INVENTORY_ADJUSTMENT_POST_ERROR]", error);
//     return NextResponse.json(
//       {
//         error:
//           error.message ||
//           "An internal error occurred while processing the adjustment.",
//       },
//       { status: 500 }
//     );
//   }
// }
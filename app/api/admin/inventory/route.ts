// app/api/admin/inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { InventoryService } from "@/services/inventory.service";
import { inventorySchema } from "@/schemas/inventory.multi.schema";

export async function GET() {
  try {
    const globalInventory = await InventoryService.getGlobalInventory();

    return NextResponse.json(globalInventory, { status: 200 });
  } catch (error) {
    console.error("Master stock ledger pipeline failure:", error);
    return NextResponse.json({ error: "Internal inventory ledger query failure." }, { status: 500 });
  }
}


// Helper to safely filter valid bin items
// function lineDataBins(bins: Array<{ sublocationId: string; quantity: number | string }>) {
//   return bins.filter((bin) => Boolean(bin.sublocationId));
// }

// ==========================================
// POST: Batch Create / Bulk Upsert Inventory, Bin Allocations, Serials & Ledger
// ==========================================

// Helper to filter and sanitize bin structures
function lineDataBins(bins: any[] | undefined) {
  if (!Array.isArray(bins)) return [];
  return bins.filter(
    (b) => b && typeof b.sublocationId === "string" && b.sublocationId.trim() !== ""
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validate request body with Zod
    const validatedData = inventorySchema.parse(body);
    const { locationId, lines, remarks } = validatedData;

    // 2. Perform atomic database updates inside a transaction
    const results = await prisma.$transaction(async (tx) => {
      const processedInventories: string[] = [];

      for (const line of lines) {
        // Fetch existing inventory balance before mutation for Ledger logging
        const existingInventory = await tx.inventory.findUnique({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: locationId,
            },
          },
        });

        const quantityBefore = existingInventory
          ? Number(existingInventory.quantityOnHand)
          : 0;
        const quantityAfter = Number(line.quantityOnHand);
        const quantityChange = quantityAfter - quantityBefore;

        // A. Upsert parent Inventory record for (productId + locationId)
        const inventory = await tx.inventory.upsert({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: locationId,
            },
          },
          create: {
            productId: line.productId,
            locationId: locationId,
            quantityOnHand: line.quantityOnHand,
            quantityReserved: line.quantityReserved,
            quantityAvailable: line.quantityAvailable,
            lastCountedAt: new Date(),
            lastMovementAt: quantityChange !== 0 ? new Date() : undefined,
          },
          update: {
            quantityOnHand: line.quantityOnHand,
            quantityReserved: line.quantityReserved,
            quantityAvailable: line.quantityAvailable,
            lastCountedAt: new Date(),
            ...(quantityChange !== 0 ? { lastMovementAt: new Date() } : {}),
          },
        });

        const validBins = lineDataBins(line.bins);
        const activeSublocationIds = validBins.map((b) => b.sublocationId);

        // B. Clear removed bin allocations for this product inventory
        await tx.inventoryBin.deleteMany({
          where: {
            inventoryId: inventory.id,
            sublocationId: { notIn: activeSublocationIds },
          },
        });

        // C. Upsert InventoryBin allocations and construct Sublocation -> Bin ID Lookup Map
        const sublocationToBinIdMap = new Map<string, string>();

        for (const bin of validBins) {
          const upsertedBin = await tx.inventoryBin.upsert({
            where: {
              inventoryId_sublocationId: {
                inventoryId: inventory.id,
                sublocationId: bin.sublocationId,
              },
            },
            create: {
              inventoryId: inventory.id,
              sublocationId: bin.sublocationId,
              quantity: bin.quantity,
            },
            update: {
              quantity: bin.quantity,
            },
          });

          sublocationToBinIdMap.set(bin.sublocationId, upsertedBin.id);
        }

        // D. Reconcile Serial Numbers (InventoryBinItem) & Inventory Bin Allocations
        if (line.trackSerials) {
          const incomingSerials = (line.serials || [])
            .map((s: string) => s.trim())
            .filter(Boolean);

          // Build a lookup map of Serial Number -> InventoryBin ID
          const serialToBinIdMap = new Map<string, string>();
          for (const bin of validBins) {
            const binId = sublocationToBinIdMap.get(bin.sublocationId);
            if (binId && Array.isArray(bin.serials)) {
              for (const binSerial of bin.serials) {
                const cleanedSerial = binSerial.trim();
                if (cleanedSerial) {
                  serialToBinIdMap.set(cleanedSerial, binId);
                }
              }
            }
          }

          // Fetch existing inventory serial items
          const existingSerialItems = await tx.inventoryBinItem.findMany({
            where: {
              productId: line.productId,
              locationId: locationId,
            },
          });

          const existingSerialNumbers = existingSerialItems.map(
            (item) => item.serialNumber
          );

          // Identify serials to create vs. delete
          const serialsToCreate = incomingSerials.filter(
            (sn) => !existingSerialNumbers.includes(sn)
          );
          const serialsToDelete = existingSerialItems.filter(
            (item) =>
              !incomingSerials.includes(item.serialNumber) &&
              item.status === "IN_STOCK"
          );

          // 1. Delete removed in-stock serial items
          if (serialsToDelete.length > 0) {
            await tx.inventoryBinItem.deleteMany({
              where: {
                id: { in: serialsToDelete.map((item) => item.id) },
              },
            });
          }

          // 2. Create new serial items linked to inventoryBinId
          if (serialsToCreate.length > 0) {
            await tx.inventoryBinItem.createMany({
              data: serialsToCreate.map((sn) => ({
                productId: line.productId,
                locationId: locationId,
                inventoryBinId: serialToBinIdMap.get(sn) || null,
                serialNumber: sn,
                status: "IN_STOCK",
              })),
            });
          }

          // 3. Sync inventoryBinId assignments for existing preserved serials
          for (const sn of incomingSerials) {
            if (existingSerialNumbers.includes(sn)) {
              const targetBinId = serialToBinIdMap.get(sn) || null;
              await tx.inventoryBinItem.updateMany({
                where: {
                  productId: line.productId,
                  locationId: locationId,
                  serialNumber: sn,
                },
                data: {
                  inventoryBinId: targetBinId,
                },
              });
            }
          }
        }

        // E. Audit Trail: Create InventoryLedger transaction record on stock changes
        if (quantityChange !== 0) {
          await tx.inventoryLedger.create({
            data: {
              productId: line.productId,
              locationId: locationId,
              transactionType: existingInventory
                ? "ADJUSTMENT"
                : "OPENING_BALANCE",
              referenceType: "ADJUSTMENT",
              quantityChange: quantityChange,
              quantityBefore: quantityBefore,
              quantityAfter: quantityAfter,
              remarks: remarks || "Manual stock allocation & bin update",
            },
          });
        }

        processedInventories.push(inventory.id);
      }

      // Return refreshed full inventory state with bins and product relation
      return await tx.inventory.findMany({
        where: {
          id: { in: processedInventories },
        },
        include: {
          bins: {
            include: {
              sublocation: true,
              inventoryBinItems: true,
            },
          },
          product: true,
        },
      });
    });

    return NextResponse.json(
      {
        message: "Inventory balances updated successfully",
        data: results,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.flatten().fieldErrors,
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("[INVENTORY_POST_ERROR]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();

//     // 1. Validate request body with Zod
//     const validatedData = inventorySchema.parse(body);
//     const { locationId, lines, remarks } = validatedData;

//     // 2. Perform atomic database updates inside a transaction
//     const results = await prisma.$transaction(async (tx) => {
//       const processedInventories: string[] = [];

//       for (const line of lines) {
//         // Fetch existing inventory balance before mutation for Ledger logging
//         const existingInventory = await tx.inventory.findUnique({
//           where: {
//             productId_locationId: {
//               productId: line.productId,
//               locationId: locationId,
//             },
//           },
//         });

//         const quantityBefore = existingInventory
//           ? Number(existingInventory.quantityOnHand)
//           : 0;
//         const quantityAfter = Number(line.quantityOnHand);
//         const quantityChange = quantityAfter - quantityBefore;

//         // A. Upsert parent Inventory record for (productId + locationId)
//         const inventory = await tx.inventory.upsert({
//           where: {
//             productId_locationId: {
//               productId: line.productId,
//               locationId: locationId,
//             },
//           },
//           create: {
//             productId: line.productId,
//             locationId: locationId,
//             quantityOnHand: line.quantityOnHand,
//             quantityReserved: line.quantityReserved,
//             quantityAvailable: line.quantityAvailable,
//             lastCountedAt: new Date(),
//             lastMovementAt: quantityChange !== 0 ? new Date() : undefined,
//           },
//           update: {
//             quantityOnHand: line.quantityOnHand,
//             quantityReserved: line.quantityReserved,
//             quantityAvailable: line.quantityAvailable,
//             lastCountedAt: new Date(),
//             ...(quantityChange !== 0 ? { lastMovementAt: new Date() } : {}),
//           },
//         });

//         const validBins = lineDataBins(line.bins);
//         const activeSublocationIds = validBins.map((b) => b.sublocationId);

//         // B. Clear removed bin allocations for this product inventory
//         await tx.inventoryBin.deleteMany({
//           where: {
//             inventoryId: inventory.id,
//             sublocationId: { notIn: activeSublocationIds },
//           },
//         });

//         // C. Upsert InventoryBin allocations using compound key (inventoryId_sublocationId)
//         for (const bin of validBins) {
//           await tx.inventoryBin.upsert({
//             where: {
//               inventoryId_sublocationId: {
//                 inventoryId: inventory.id,
//                 sublocationId: bin.sublocationId,
//               },
//             },
//             create: {
//               inventoryId: inventory.id,
//               sublocationId: bin.sublocationId,
//               quantity: bin.quantity,
//             },
//             update: {
//               quantity: bin.quantity,
//             },
//           });
//         }

//         // D. Reconcile Serial Numbers (InventoryBinItem) & Granular Bin Allocations
//         if (line.trackSerials) {
//           const incomingSerials = (line.serials || [])
//             .map((s) => s.trim())
//             .filter(Boolean);

//           // Build a lookup map of Serial Number -> Sublocation ID
//           const serialToSublocationMap = new Map<string, string>();
//           for (const bin of validBins) {
//             if (Array.isArray(bin.serials)) {
//               for (const binSerial of bin.serials) {
//                 const cleanedSerial = binSerial.trim();
//                 if (cleanedSerial) {
//                   serialToSublocationMap.set(cleanedSerial, bin.sublocationId);
//                 }
//               }
//             }
//           }

//           // Fetch existing inventory serial items
//           const existingSerialItems = await tx.inventoryBinItem.findMany({
//             where: {
//               productId: line.productId,
//               locationId: locationId,
//             },
//           });

//           const existingSerialNumbers = existingSerialItems.map((item) => item.serialNumber);

//           // Identify serials to create vs. delete
//           const serialsToCreate = incomingSerials.filter(
//             (sn) => !existingSerialNumbers.includes(sn)
//           );
//           const serialsToDelete = existingSerialItems.filter(
//             (item) => !incomingSerials.includes(item.serialNumber) && item.status === "IN_STOCK"
//           );

//           // 1. Delete removed in-stock serial items
//           if (serialsToDelete.length > 0) {
//             await tx.inventoryBinItem.deleteMany({
//               where: {
//                 id: { in: serialsToDelete.map((item) => item.id) },
//               },
//             });
//           }

//           // 2. Create new serial items
//           // If a serial is in a bin, assign that sublocationId; otherwise set to null (unassigned/floor)
//           if (serialsToCreate.length > 0) {
//             await tx.inventoryBinItem.createMany({
//               data: serialsToCreate.map((sn) => ({
//                 productId: line.productId,
//                 locationId: locationId,
//                 sublocationId: serialToSublocationMap.get(sn) || null,
//                 serialNumber: sn,
//                 status: "IN_STOCK",
//               })),
//             });
//           }

//           // 3. Sync sublocation assignments for existing preserved serials
//           for (const sn of incomingSerials) {
//             if (existingSerialNumbers.includes(sn)) {
//               const targetSublocationId = serialToSublocationMap.get(sn) || null;
//               await tx.inventoryBinItem.updateMany({
//                 where: {
//                   productId: line.productId,
//                   locationId: locationId,
//                   serialNumber: sn,
//                 },
//                 data: {
//                   sublocationId: targetSublocationId,
//                 },
//               });
//             }
//           }
//         }

//         // E. Audit Trail: Create InventoryLedger transaction record on stock changes
//         if (quantityChange !== 0) {
//           await tx.inventoryLedger.create({
//             data: {
//               productId: line.productId,
//               locationId: locationId,
//               transactionType: existingInventory ? "ADJUSTMENT" : "OPENING_BALANCE",
//               referenceType: "ADJUSTMENT",
//               quantityChange: quantityChange,
//               quantityBefore: quantityBefore,
//               quantityAfter: quantityAfter,
//               remarks: remarks || "Manual stock allocation & bin update",
//             },
//           });
//         }

//         processedInventories.push(inventory.id);
//       }

//       // Return refreshed full inventory state with bins and product relation
//       return await tx.inventory.findMany({
//         where: {
//           id: { in: processedInventories },
//         },
//         include: {
//           bins: {
//             include: {
//               sublocation: true,
//             },
//           },
//           product: true,
//         },
//       });
//     });

//     return NextResponse.json(
//       {
//         message: "Inventory balances updated successfully",
//         data: results,
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       return NextResponse.json(
//         {
//           error: "Validation failed",
//           details: error.flatten().fieldErrors,
//           issues: error.issues,
//         },
//         { status: 400 }
//       );
//     }

//     console.error("[INVENTORY_POST_ERROR]", error);
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();

//     // 1. Validate request body with Zod
//     const validatedData = inventorySchema.parse(body);
//     const { locationId, lines, remarks } = validatedData;

//     // 2. Perform atomic database updates inside a transaction
//     const results = await prisma.$transaction(async (tx) => {
//       const processedInventories: string[] = [];

//       for (const line of lines) {
//         // Fetch existing inventory balance before mutation for Ledger logging
//         const existingInventory = await tx.inventory.findUnique({
//           where: {
//             productId_locationId: {
//               productId: line.productId,
//               locationId: locationId,
//             },
//           },
//         });

//         const quantityBefore = existingInventory
//           ? Number(existingInventory.quantityOnHand)
//           : 0;
//         const quantityAfter = Number(line.quantityOnHand);
//         const quantityChange = quantityAfter - quantityBefore;

//         // A. Upsert parent Inventory record for (productId + locationId)
//         const inventory = await tx.inventory.upsert({
//           where: {
//             productId_locationId: {
//               productId: line.productId,
//               locationId: locationId,
//             },
//           },
//           create: {
//             productId: line.productId,
//             locationId: locationId,
//             quantityOnHand: line.quantityOnHand,
//             quantityReserved: line.quantityReserved,
//             quantityAvailable: line.quantityAvailable,
//             lastCountedAt: new Date(),
//             lastMovementAt: quantityChange !== 0 ? new Date() : undefined,
//           },
//           update: {
//             quantityOnHand: line.quantityOnHand,
//             quantityReserved: line.quantityReserved,
//             quantityAvailable: line.quantityAvailable,
//             lastCountedAt: new Date(),
//             ...(quantityChange !== 0 ? { lastMovementAt: new Date() } : {}),
//           },
//         });

//         const validBins = lineDataBins(line.bins);
//         const activeSublocationIds = validBins.map((b) => b.sublocationId);

//         // B. Clear removed bin allocations for this product inventory
//         await tx.inventoryBin.deleteMany({
//           where: {
//             inventoryId: inventory.id,
//             sublocationId: { notIn: activeSublocationIds },
//           },
//         });

//         // C. Upsert InventoryBin allocations using compound key (inventoryId_sublocationId)
//         for (const bin of validBins) {
//           await tx.inventoryBin.upsert({
//             where: {
//               inventoryId_sublocationId: {
//                 inventoryId: inventory.id,
//                 sublocationId: bin.sublocationId,
//               },
//             },
//             create: {
//               inventoryId: inventory.id,
//               sublocationId: bin.sublocationId,
//               quantity: bin.quantity,
//             },
//             update: {
//               quantity: bin.quantity,
//             },
//           });
//         }

//         // D. Reconcile Serial Numbers (InventoryBinItem) if trackSerials is enabled
//         if (line.trackSerials) {
//           const incomingSerials = line.serials.map((s) => s.trim()).filter(Boolean);

//           // Get existing items for this product + location
//           const existingSerialItems = await tx.inventoryBinItem.findMany({
//             where: {
//               productId: line.productId,
//               locationId: locationId,
//             },
//           });

//           const existingSerialNumbers = existingSerialItems.map((item) => item.serialNumber);

//           // Identify serials to create and serials to delete/remove
//           const serialsToCreate = incomingSerials.filter(
//             (sn) => !existingSerialNumbers.includes(sn)
//           );
//           const serialsToDelete = existingSerialItems.filter(
//             (item) => !incomingSerials.includes(item.serialNumber) && item.status === "IN_STOCK"
//           );

//           // Delete/Remove in-stock serials no longer submitted
//           if (serialsToDelete.length > 0) {
//             await tx.inventoryBinItem.deleteMany({
//               where: {
//                 id: { in: serialsToDelete.map((item) => item.id) },
//               },
//             });
//           }

//           // Pick primary sublocation ID if bins are defined
//           const primarySublocationId = validBins.length > 0 ? validBins[0].sublocationId : null;

//           // Create new InventoryBinItems for newly added serial numbers
//           if (serialsToCreate.length > 0) {
//             await tx.inventoryBinItem.createMany({
//               data: serialsToCreate.map((sn) => ({
//                 productId: line.productId,
//                 locationId: locationId,
//                 sublocationId: primarySublocationId,
//                 serialNumber: sn,
//                 status: "IN_STOCK",
//               })),
//             });
//           }

//           // Sync sublocation for existing preserved serial items
//           if (primarySublocationId) {
//             await tx.inventoryBinItem.updateMany({
//               where: {
//                 productId: line.productId,
//                 locationId: locationId,
//                 serialNumber: { in: incomingSerials },
//               },
//               data: {
//                 sublocationId: primarySublocationId,
//               },
//             });
//           }
//         }

//         // E. Audit Trail: Create InventoryLedger transaction record on stock changes
//         if (quantityChange !== 0) {
//           await tx.inventoryLedger.create({
//             data: {
//               productId: line.productId,
//               locationId: locationId,
//               transactionType: existingInventory ? "ADJUSTMENT" : "OPENING_BALANCE",
//               referenceType: "ADJUSTMENT",
//               quantityChange: quantityChange,
//               quantityBefore: quantityBefore,
//               quantityAfter: quantityAfter,
//               remarks: remarks || "Manual stock allocation & bin update",
//             },
//           });
//         }

//         processedInventories.push(inventory.id);
//       }

//       // Return refreshed full inventory state with bins and product relation
//       return await tx.inventory.findMany({
//         where: {
//           id: { in: processedInventories },
//         },
//         include: {
//           bins: {
//             include: {
//               sublocation: true,
//             },
//           },
//           product: true,
//         },
//       });
//     });

//     return NextResponse.json(
//       {
//         message: "Inventory balances updated successfully",
//         data: results,
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       return NextResponse.json(
//         {
//           error: "Validation failed",
//           details: error.flatten().fieldErrors,
//           issues: error.issues,
//         },
//         { status: 400 }
//       );
//     }

//     console.error("[INVENTORY_POST_ERROR]", error);
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// ==========================================
// POST: Batch Create / Bulk Upsert Inventory & Bin Allocations
// ==========================================
// export async function POST(request: Request) {
//   try {
//     const body = await request.json();

//     // 1. Validate request body with Zod
//     const validatedData = inventorySchema.parse(body);
//     const { locationId, lines } = validatedData;

//     // 2. Perform atomic database updates inside a transaction
//     const results = await prisma.$transaction(async (tx) => {
//       const processedInventories: string[] = [];

//       for (const line of lines) {
//         // A. Upsert parent Inventory record for (productId + locationId)
//         const inventory = await tx.inventory.upsert({
//           where: {
//             productId_locationId: {
//               productId: line.productId,
//               locationId: locationId,
//             },
//           },
//           create: {
//             productId: line.productId,
//             locationId: locationId,
//             quantityOnHand: line.quantityOnHand,
//             quantityReserved: line.quantityReserved,
//             quantityAvailable: line.quantityAvailable,
//           },
//           update: {
//             quantityOnHand: line.quantityOnHand,
//             quantityReserved: line.quantityReserved,
//             quantityAvailable: line.quantityAvailable,
//           },
//         });

//         const validBins = lineDataBins(line.bins);
//         const activeSublocationIds = validBins.map((b) => b.sublocationId);

//         // B. Clear removed bin allocations for this product inventory
//         await tx.inventoryBin.deleteMany({
//           where: {
//             inventoryId: inventory.id,
//             sublocationId: { notIn: activeSublocationIds },
//           },
//         });

//         // C. Upsert InventoryBin allocations using compound key (inventoryId_sublocationId)
//         for (const bin of validBins) {
//           await tx.inventoryBin.upsert({
//             where: {
//               inventoryId_sublocationId: {
//                 inventoryId: inventory.id,
//                 sublocationId: bin.sublocationId,
//               },
//             },
//             create: {
//               inventoryId: inventory.id,
//               sublocationId: bin.sublocationId,
//               quantity: bin.quantity,
//             },
//             update: {
//               quantity: bin.quantity,
//             },
//           });
//         }

//         processedInventories.push(inventory.id);
//       }

//       // Return refreshed full inventory state for these products
//       return await tx.inventory.findMany({
//         where: {
//           id: { in: processedInventories },
//         },
//         include: {
//           bins: {
//             include: {
//               sublocation: true,
//             },
//           },
//           product: true,
//         },
//       });
//     });

//     return NextResponse.json(
//       {
//         message: "Inventory balances updated successfully",
//         data: results,
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       return NextResponse.json(
//         {
//           error: "Validation failed",
//           details: error.flatten().fieldErrors,
//           issues: error.issues,
//         },
//         { status: 400 }
//       );
//     }

//     console.error("[INVENTORY_POST_ERROR]", error);
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// ==========================================
// PATCH: Update Specific Inventory Record / Sublocation Allocations
// ==========================================
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    // 1. Validate request payload
    const validatedData = inventorySchema.parse(body);
    const { locationId, lines } = validatedData;

    // 2. Perform updates inside a transaction
    const updatedRecords = await prisma.$transaction(async (tx) => {
      const lineResults: string[] = [];

      for (const line of lines) {
        // A. Update or create the main Inventory row
        const inventory = await tx.inventory.upsert({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: locationId,
            },
          },
          create: {
            productId: line.productId,
            locationId: locationId,
            quantityOnHand: line.quantityOnHand,
            quantityReserved: line.quantityReserved,
            quantityAvailable: line.quantityAvailable,
          },
          update: {
            quantityOnHand: line.quantityOnHand,
            quantityReserved: line.quantityReserved,
            quantityAvailable: line.quantityAvailable,
          },
        });

        const validBins = lineDataBins(line.bins);
        const incomingSublocationIds = validBins.map((b) => b.sublocationId);

        // B. Remove bin allocations removed from the incoming list
        await tx.inventoryBin.deleteMany({
          where: {
            inventoryId: inventory.id,
            sublocationId: { notIn: incomingSublocationIds },
          },
        });

        // C. Sync individual bin allocations using compound key (inventoryId_sublocationId)
        for (const binData of validBins) {
          await tx.inventoryBin.upsert({
            where: {
              inventoryId_sublocationId: {
                inventoryId: inventory.id,
                sublocationId: binData.sublocationId,
              },
            },
            create: {
              inventoryId: inventory.id,
              sublocationId: binData.sublocationId,
              quantity: binData.quantity,
            },
            update: {
              quantity: binData.quantity,
            },
          });
        }

        lineResults.push(inventory.id);
      }

      // Fetch and return updated inventory with associated sublocations
      return await tx.inventory.findMany({
        where: { id: { in: lineResults } },
        include: {
          bins: {
            include: {
              sublocation: true,
            },
          },
          product: true,
        },
      });
    });

    return NextResponse.json(
      {
        message: "Inventory allocations patched successfully",
        data: updatedRecords,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.flatten().fieldErrors,
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("[INVENTORY_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}



// const batchSchema = z.object({
//   locationId: z.string().min(1, "Location ID is required"),
//   productIds: z.array(z.string()).min(1, "At least one Product ID is required"),
// });

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const validation = batchSchema.safeParse(body);

//     if (!validation.success) {
//       return NextResponse.json(
//         { error: "Invalid payload", details: validation.error.format() },
//         { status: 400 }
//       );
//     }

//     const { locationId, productIds } = validation.data;

//     // Query all requested SKUs for this location
//     const inventoryRecords = await prisma.inventory.findMany({
//       where: {
//         locationId,
//         productId: { in: productIds },
//       },
//       include: {
//         bins: {
//           include: {
//             sublocation: {
//               select: { id: true, name: true },
//             },
//           },
//         },
//       },
//     });

//     // Map results into a keyed map dictionary: { [productId]: StockDetails }
//     const results: Record<string, any> = {};

//     productIds.forEach((prodId) => {
//       const record = inventoryRecords.find((r) => r.productId === prodId);

//       if (!record) {
//         results[prodId] = {
//           existsInInventory: false,
//           quantityOnHand: 0,
//           quantityAvailable: 0,
//           quantityReserved: 0,
//           bulkAreaQuantity: 0,
//           bins: [],
//         };
//       } else {
//         const quantityOnHand = Number(record.quantityOnHand || 0);
//         const quantityAvailable = Number(record.quantityAvailable || 0);
//         const quantityReserved = Number(record.quantityReserved || 0);

//         const bins = record.bins.map((bin) => ({
//           binId: bin.id,
//           sublocationId: bin.sublocationId,
//           sublocationName: bin.sublocation.name,
//           quantity: Number(bin.quantity || 0),
//         }));

//         const totalAllocatedToBins = bins.reduce((sum, b) => sum + b.quantity, 0);
//         const bulkAreaQuantity = Math.max(0, quantityOnHand - totalAllocatedToBins);

//         results[prodId] = {
//           existsInInventory: true,
//           inventoryId: record.id,
//           quantityOnHand,
//           quantityAvailable,
//           quantityReserved,
//           bulkAreaQuantity,
//           bins,
//         };
//       }
//     });

//     return NextResponse.json(results);
//   } catch (error: any) {
//     console.error("Error checking batch inventory stock:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error", message: error.message },
//       { status: 500 }
//     );
//   }
// }


/**
 * 🟢 INITIALIZE FRESH STOCK LEDGER ENTRY
 */
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { productId, locationId, quantityOnHand, quantityReserved, quantityAvailable, bins } = body;

//     if (!productId || !locationId) {
//       return NextResponse.json({ error: "Missing product or destination facility mappings tokens." }, { status: 400 });
//     }

//     // Verify system collision constraints to ensure uniqueness across [productId, locationId] rows
//     const duplicateCheck = await prisma.inventory.findUnique({
//       where: { productId_locationId: { productId, locationId } }
//     });
//     if (duplicateCheck) {
//       return NextResponse.json({ error: "A stock configuration record for this specific product SKU already exists at this warehouse site. Use modification controls instead." }, { status: 409 });
//     }

//     const createdInventoryNode = await prisma.$transaction(async (tx) => {
//       // Step A: Generate the root stock ledger profile block
//       const invRoot = await tx.inventory.create({
//         data: {
//           productId,
//           locationId,
//           quantityOnHand,
//           quantityReserved,
//           quantityAvailable,
//         }
//       });

//       // Step B: Filter and create bins only if valid sublocationId is provided
//       const validBins = (bins || []).filter((bin: any) => bin.sublocationId && bin.quantity != null);

//       if (validBins.length > 0) {
//         await tx.inventoryBin.createMany({
//           data: validBins.map((bin: any) => ({
//             inventoryId: invRoot.id,
//             productId,
//             sublocationId: bin.sublocationId,
//             quantity: bin.quantity,
//           }))
//         });
//       }

//       // Step B: If sublocation bins have assignments, generate child rows sequentially
//       // if (bins && validBins.length > 0) {
//       //   await tx.inventoryBin.createMany({
//       //     data: bins.map((bin: any) => ({
//       //       inventoryId: invRoot.id,
//       //       productId,
//       //       sublocationId: bin.sublocationId,
//       //       quantity: bin.quantity,
//       //     }))
//       //   });
//       // }

//       return invRoot;
//     });

//     return NextResponse.json(createdInventoryNode, { status: 201 });
//   } catch (error) {
//     console.error("Failed to commit initial inventory ledger entries:", error);
//     return NextResponse.json({ error: "Internal Database processing framework malfunction." }, { status: 500 });
//   }
// }

/**
 * 🟡 PATCH/CORRECT EXISTING STOCK LEDGERS AND INTERNAL STORAGE BINS
 */
// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { id, quantityOnHand, quantityReserved, quantityAvailable, bins } = body;

//     if (!id) {
//       return NextResponse.json({ error: "Missing master inventory record pointer ID identifier token." }, { status: 400 });
//     }

//     const synchronizedPayload = await prisma.$transaction(async (tx) => {
//       // 1. Core update modifications down across root item parameters
//       const updatedInv = await tx.inventory.update({
//         where: { id },
//         data: {
//           quantityOnHand,
//           quantityReserved,
//           quantityAvailable,
//         }
//       });

//       // 2. Map and parse incoming active sub-bin identifiers to trace removals
//       const activeBinIds = bins.map((b: any) => b.id).filter(Boolean);

//       // Clean out tracking nodes that were dropped from the UI fields array matrix
//       await tx.inventoryBin.deleteMany({
//         where: {
//           inventoryId: id,
//           id: { notIn: activeBinIds }
//         }
//       });

//       // 3. Reconcile remaining configuration paths using upsert flows
//       for (const bin of bins) {
//         if (bin.id) {
//           // Sync existing row measurements
//           await tx.inventoryBin.update({
//             where: { id: bin.id },
//             data: { quantity: bin.quantity }
//           });
//         } else {
//           // Construct freshly appended storage bin assignments
//           await tx.inventoryBin.create({
//             data: {
//               inventoryId: id,
//               productId: updatedInv.productId, // Pull reference values straight from the master record
//               sublocationId: bin.sublocationId,
//               quantity: bin.quantity,
//             }
//           });
//         }
//       }

//       return updatedInv;
//     });

//     return NextResponse.json(synchronizedPayload, { status: 200 });
//   } catch (error) {
//     console.error("Critical failure during stock ledger correction adjustment routing:", error);
//     return NextResponse.json({ error: "Internal Database record process transaction modification exception." }, { status: 500 });
//   }
// }
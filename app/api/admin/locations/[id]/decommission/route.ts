import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// TODO: Replace this with your actual auth/session lookup.
async function getCurrentTeamMemberId(): Promise<string | null> {
  // Example:
  // const session = await auth.api.getSession(...)
  // return session?.user?.inflowId ?? null;

  return null;
}

type InventoryStrategy = "TRANSFER" | "WRITEOFF";

interface DecommissionBody {
  inventoryStrategy: InventoryStrategy | null;
  targetLocationId: string | null;
  reassignTargetLocationId: string | null;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  const { id: sourceLocationId } = await params;

  try {
    const body = (await request.json()) as DecommissionBody;

    const {
      inventoryStrategy,
      targetLocationId,
      reassignTargetLocationId,
    } = body;

    if (
      inventoryStrategy !== null &&
      inventoryStrategy !== "TRANSFER" &&
      inventoryStrategy !== "WRITEOFF"
    ) {
      return NextResponse.json(
        { error: "Invalid inventory strategy." },
        { status: 400 }
      );
    }

    if (
      inventoryStrategy === "TRANSFER" &&
      !targetLocationId
    ) {
      return NextResponse.json(
        {
          error:
            "A target location is required when transferring inventory.",
        },
        { status: 400 }
      );
    }

    if (targetLocationId === sourceLocationId) {
      return NextResponse.json(
        {
          error:
            "Inventory cannot be transferred to the same location.",
        },
        { status: 400 }
      );
    }

    if (reassignTargetLocationId === sourceLocationId) {
      return NextResponse.json(
        {
          error:
            "Orders cannot be reassigned to the same location.",
        },
        { status: 400 }
      );
    }

    /*
     * ------------------------------------------------------------
     * SOURCE LOCATION
     * ------------------------------------------------------------
     */

    const sourceLocation = await prisma.location.findUnique({
      where: {
        inflowId: sourceLocationId,
      },
      select: {
        id: true,
        inflowId: true,
        name: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!sourceLocation) {
      return NextResponse.json(
        { error: "Location not found." },
        { status: 404 }
      );
    }

    if (!sourceLocation.isActive || sourceLocation.deletedAt) {
      return NextResponse.json(
        {
          error: "Location is already inactive.",
        },
        { status: 400 }
      );
    }

    /*
     * ------------------------------------------------------------
     * CURRENT USER
     * ------------------------------------------------------------
     */

    const performedById = await getCurrentTeamMemberId();

    /*
     * Write-offs require an InventoryAdjustment because
     * InventoryAdjustment.performedById is required.
     */
    if (inventoryStrategy === "WRITEOFF" && !performedById) {
      return NextResponse.json(
        {
          error:
            "Unable to determine the team member performing the write-off.",
        },
        { status: 401 }
      );
    }

    /*
     * ------------------------------------------------------------
     * VALIDATE TARGET LOCATION
     * ------------------------------------------------------------
     */

    let targetLocation = null;

    if (targetLocationId) {
      targetLocation = await prisma.location.findUnique({
        where: {
          inflowId: targetLocationId,
        },
        select: {
          inflowId: true,
          name: true,
          isActive: true,
          deletedAt: true,
        },
      });

      if (
        !targetLocation ||
        !targetLocation.isActive ||
        targetLocation.deletedAt
      ) {
        return NextResponse.json(
          {
            error:
              "The inventory destination location is invalid or inactive.",
          },
          { status: 400 }
        );
      }
    }

    let reassignLocation = null;

    if (reassignTargetLocationId) {
      reassignLocation = await prisma.location.findUnique({
        where: {
          inflowId: reassignTargetLocationId,
        },
        select: {
          inflowId: true,
          name: true,
          isActive: true,
          deletedAt: true,
        },
      });

      if (
        !reassignLocation ||
        !reassignLocation.isActive ||
        reassignLocation.deletedAt
      ) {
        return NextResponse.json(
          {
            error:
              "The order reassignment location is invalid or inactive.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * TRANSACTION
     * ------------------------------------------------------------
     */

    await prisma.$transaction(
      async (tx) => {
        /*
         * ========================================================
         * 1. LOAD INVENTORY
         * ========================================================
         */

        const inventories = await tx.inventory.findMany({
          where: {
            locationId: sourceLocationId,
            quantityOnHand: {
              gt: 0,
            },
          },
          include: {
            product: {
              select: {
                inflowId: true,
                name: true,
              },
            },
            bins: {
              include: {
                sublocation: {
                  select: {
                    id: true,
                    name: true,
                    locationId: true,
                  },
                },
              },
            },
          },
        });

        /*
         * ========================================================
         * 2. TRANSFER INVENTORY
         * ========================================================
         */

        if (
          inventoryStrategy === "TRANSFER" &&
          targetLocationId
        ) {
          for (const sourceInventory of inventories) {
            /*
             * ----------------------------------------------------
             * TARGET INVENTORY
             * ----------------------------------------------------
             */

            let targetInventory =
              await tx.inventory.findUnique({
                where: {
                  productId_locationId: {
                    productId: sourceInventory.productId,
                    locationId: targetLocationId,
                  },
                },
              });

            if (!targetInventory) {
              targetInventory = await tx.inventory.create({
                data: {
                  productId: sourceInventory.productId,
                  locationId: targetLocationId,

                  quantityOnHand:
                    sourceInventory.quantityOnHand,

                  quantityAvailable:
                    sourceInventory.quantityAvailable ?? 0,

                  quantityReserved:
                    sourceInventory.quantityReserved ?? 0,

                  reorderThreshold:
                    sourceInventory.reorderThreshold,

                  reorderQuantity:
                    sourceInventory.reorderQuantity,

                  isAutoReorderEnabled:
                    sourceInventory.isAutoReorderEnabled,

                  preferredSourceLocationId:
                    sourceInventory.preferredSourceLocationId,

                  lastMovementAt: new Date(),
                },
              });
            } else {
              targetInventory =
                await tx.inventory.update({
                  where: {
                    id: targetInventory.id,
                  },
                  data: {
                    quantityOnHand: {
                      increment:
                        sourceInventory.quantityOnHand,
                    },

                    quantityAvailable:
                      sourceInventory.quantityAvailable !== null
                        ? {
                            increment:
                              sourceInventory.quantityAvailable,
                          }
                        : undefined,

                    quantityReserved:
                      sourceInventory.quantityReserved !== null
                        ? {
                            increment:
                              sourceInventory.quantityReserved,
                          }
                        : undefined,

                    lastMovementAt: new Date(),
                  },
                });
            }

            /*
             * ----------------------------------------------------
             * MOVE EACH SUBLOCATION/BIN
             * ----------------------------------------------------
             *
             * Example:
             *
             * Source:
             *   Rack A = 10
             *   Rack B = 5
             *
             * Target:
             *   Rack A = created/reused
             *   Rack B = created/reused
             */

            for (const sourceBin of sourceInventory.bins) {
              const sourceSublocation =
                sourceBin.sublocation;

              /*
               * Find same-named sublocation in target.
               */
              let targetSublocation =
                await tx.sublocation.findUnique({
                  where: {
                    locationId_name: {
                      locationId: targetLocationId,
                      name: sourceSublocation.name,
                    },
                  },
                });

              /*
               * Automatically create it if it doesn't exist.
               */
              if (!targetSublocation) {
                targetSublocation =
                  await tx.sublocation.create({
                    data: {
                      locationId: targetLocationId,
                      name: sourceSublocation.name,
                    },
                  });
              }

              /*
               * Find/create target inventory bin.
               */
              let targetBin =
                await tx.inventoryBin.findUnique({
                  where: {
                    inventoryId_sublocationId: {
                      inventoryId: targetInventory.id,
                      sublocationId:
                        targetSublocation.id,
                    },
                  },
                });

              if (!targetBin) {
                targetBin = await tx.inventoryBin.create({
                  data: {
                    inventoryId: targetInventory.id,
                    sublocationId:
                      targetSublocation.id,
                    quantity: 0,
                  },
                });
              }

              /*
               * --------------------------------------------------
               * MOVE BIN QUANTITY
               * --------------------------------------------------
               */

              await tx.inventoryBin.update({
                where: {
                  id: targetBin.id,
                },
                data: {
                  quantity: {
                    increment: sourceBin.quantity,
                  },
                },
              });

              /*
               * --------------------------------------------------
               * MOVE SERIALIZED ITEMS
               * --------------------------------------------------
               */

              const serialItems =
                await tx.inventoryBinItem.findMany({
                  where: {
                    inventoryBinId: sourceBin.id,
                  },
                  select: {
                    id: true,
                    serialNumber: true,
                  },
                });

              for (const serial of serialItems) {
                /*
                 * Keep the same InventoryBinItem.
                 *
                 * We are moving the physical item rather than
                 * creating a new serialized item.
                 */
                await tx.inventoryBinItem.update({
                  where: {
                    id: serial.id,
                  },
                  data: {
                    locationId: targetLocationId,
                    inventoryBinId: targetBin.id,
                  },
                });

                /*
                 * Historical serial movement.
                 */
                await tx.inventoryLedger.create({
                  data: {
                    productId:
                      sourceInventory.productId,

                    locationId:
                      targetLocationId,

                    sublocationId:
                      targetSublocation.id,

                    transactionType: "TRANSFER_IN",

                    fromLocationId:
                      sourceLocationId,

                    toLocationId:
                      targetLocationId,

                    fromSublocationId:
                      sourceSublocation.id,

                    toSublocationId:
                      targetSublocation.id,

                    inventoryBinItemId:
                      serial.id,

                    quantityChange: 1,

                    /*
                     * The quantityBefore/After here represents
                     * the target-side quantity.
                     */
                    quantityBefore:
                      targetInventory.quantityOnHand,

                    quantityAfter:
                      targetInventory.quantityOnHand,

                    performedById:
                      performedById ?? undefined,

                    remarks:
                      `Location decommission transfer of serial ${serial.serialNumber}.`,
                  },
                });
              }

              /*
               * --------------------------------------------------
               * TRANSFER OUT LEDGER
               * --------------------------------------------------
               *
               * One aggregate ledger entry for the source bin.
               */

              await tx.inventoryLedger.create({
                data: {
                  productId:
                    sourceInventory.productId,

                  locationId:
                    sourceLocationId,

                  sublocationId:
                    sourceSublocation.id,

                  transactionType:
                    "TRANSFER_OUT",

                  fromLocationId:
                    sourceLocationId,

                  toLocationId:
                    targetLocationId,

                  fromSublocationId:
                    sourceSublocation.id,

                  toSublocationId:
                    targetSublocation.id,

                  quantityChange:
                    sourceBin.quantity.neg(),

                  quantityBefore:
                    sourceBin.quantity,

                  quantityAfter: 0,

                  performedById:
                    performedById ?? undefined,

                  remarks:
                    `Location decommission transfer from ${sourceLocation.name} to ${targetLocation?.name}.`,
                },
              });
            }

            /*
             * ----------------------------------------------------
             * MOVE UNASSIGNED/FLOOR STOCK
             * ----------------------------------------------------
             *
             * If Inventory has stock that isn't represented by
             * InventoryBin, it still needs a ledger entry.
             */

            const binQuantity =
              sourceInventory.bins.reduce(
                (sum, bin) =>
                  sum + Number(bin.quantity),
                0
              );

            const unassignedQuantity =
              Number(
                sourceInventory.quantityOnHand
              ) - binQuantity;

            if (unassignedQuantity > 0) {
              await tx.inventoryLedger.create({
                data: {
                  productId:
                    sourceInventory.productId,

                  locationId:
                    sourceLocationId,

                  sublocationId: null,

                  transactionType:
                    "TRANSFER_OUT",

                  fromLocationId:
                    sourceLocationId,

                  toLocationId:
                    targetLocationId,

                  fromSublocationId: null,
                  toSublocationId: null,

                  quantityChange:
                    new Prisma.Decimal(
                      -unassignedQuantity
                    ),

                  quantityBefore:
                    new Prisma.Decimal(
                      unassignedQuantity
                    ),

                  quantityAfter: 0,

                  performedById:
                    performedById ?? undefined,

                  remarks:
                    `Unassigned/floor stock transferred during location decommission.`,
                },
              });

              await tx.inventoryLedger.create({
                data: {
                  productId:
                    sourceInventory.productId,

                  locationId:
                    targetLocationId,

                  sublocationId: null,

                  transactionType:
                    "TRANSFER_IN",

                  fromLocationId:
                    sourceLocationId,

                  toLocationId:
                    targetLocationId,

                  fromSublocationId: null,
                  toSublocationId: null,

                  quantityChange:
                    new Prisma.Decimal(
                      unassignedQuantity
                    ),

                  quantityBefore:
                    targetInventory.quantityOnHand,

                  quantityAfter:
                    targetInventory.quantityOnHand.add(
                      new Prisma.Decimal(
                        unassignedQuantity
                      )
                    ),

                  performedById:
                    performedById ?? undefined,

                  remarks:
                    `Unassigned/floor stock received during location decommission.`,
                },
              });
            }

            /*
             * ----------------------------------------------------
             * SOURCE INVENTORY
             * ----------------------------------------------------
             *
             * At this point all current stock has been moved.
             */

            await tx.inventory.delete({
              where: {
                id: sourceInventory.id,
              },
            });
          }
        }

        /*
         * ========================================================
         * 3. WRITE OFF INVENTORY
         * ========================================================
         */

        if (inventoryStrategy === "WRITEOFF") {
          if (!performedById) {
            throw new Error(
              "A team member is required to perform an inventory write-off."
            );
          }

          /*
           * Use a dedicated adjustment reason if you have one.
           *
           * Better yet, create a system/internal reason such as:
           *
           * "LOCATION_DECOMMISSION_WRITEOFF"
           */

          const adjustmentReason =
            await tx.adjustmentReason.findFirst({
              where: {
                name: "Location Decommission Write-off",
                isInternal: true,
              },
            });

          if (!adjustmentReason) {
            throw new Error(
              "Missing internal adjustment reason: Location Decommission Write-off."
            );
          }

          const adjustment =
            await tx.inventoryAdjustment.create({
              data: {
                inflowId: `DECOMMISSION-${sourceLocationId}-${Date.now()}`,

                adjustmentNumber:
                  `ADJ-DECOM-${Date.now()}`,

                adjustmentReasonId:
                  adjustmentReason.inflowId,

                remarks:
                  `Inventory written off during decommission of ${sourceLocation.name}.`,

                performedById,

                status: "POSTED",
              },
            });

          /*
           * ----------------------------------------------------
           * CREATE ADJUSTMENT LINES
           * ----------------------------------------------------
           */

          for (const inventory of inventories) {
            const before =
              inventory.quantityOnHand;

            /*
             * Negative adjustment.
             */
            const adjusted = before.neg();

            const after =
              new Prisma.Decimal(0);

            const line =
              await tx.inventoryAdjustmentLine.create({
                data: {
                  inflowId:
                    `DECOM-LINE-${inventory.id}-${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`,

                  adjustmentId:
                    adjustment.inflowId,

                  inventoryId:
                    inventory.id,

                  productId:
                    inventory.productId,

                  locationId:
                    sourceLocationId,

                  quantityBefore: before,

                  quantityAdjusted: adjusted,

                  quantityAfter: after,

                  quantityReserved:
                    inventory.quantityReserved,

                  reason: "MANUAL",

                  description:
                    `Location decommission write-off for ${sourceLocation.name}.`,
                },
              });

            /*
             * --------------------------------------------------
             * BIN ADJUSTMENTS
             * --------------------------------------------------
             */

            for (const bin of inventory.bins) {
              await tx.inventoryAdjustmentLineBin.create({
                data: {
                  adjustmentLineId: line.id,

                  sublocationId:
                    bin.sublocationId,

                  quantity:
                    bin.quantity.neg(),
                },
              });

              /*
               * Ledger for each bin.
               */
              await tx.inventoryLedger.create({
                data: {
                  productId:
                    inventory.productId,

                  locationId:
                    sourceLocationId,

                  sublocationId:
                    bin.sublocationId,

                  transactionType:
                    "ADJUSTMENT",

                  referenceType:
                    "ADJUSTMENT",

                  referenceId:
                    adjustment.inflowId,

                  performedById,

                  quantityChange:
                    bin.quantity.neg(),

                  quantityBefore:
                    bin.quantity,

                  quantityAfter: 0,

                  remarks:
                    `Location decommission write-off.`,
                },
              });

              /*
               * Serialized items become DAMAGED.
               */
              const serialItems =
                await tx.inventoryBinItem.findMany({
                  where: {
                    inventoryBinId: bin.id,
                  },
                  select: {
                    id: true,
                    serialNumber: true,
                  },
                });

              for (const serial of serialItems) {
                await tx.inventoryAdjustmentSerial.create({
                  data: {
                    adjustmentLineId: line.id,

                    inventoryBinItemId:
                      serial.id,

                    serialNumber:
                      serial.serialNumber,

                    action: "REMOVE",

                    fromInventoryBinId:
                      bin.id,
                  },
                });

                await tx.inventoryBinItem.update({
                  where: {
                    id: serial.id,
                  },
                  data: {
                    status: "DAMAGED",
                    inventoryBinId: null,
                  },
                });
              }
            }

            /*
             * --------------------------------------------------
             * ZERO INVENTORY
             * --------------------------------------------------
             */

            await tx.inventory.update({
              where: {
                id: inventory.id,
              },
              data: {
                quantityOnHand: 0,
                quantityAvailable: 0,
                quantityReserved: 0,
                lastMovementAt: new Date(),
              },
            });

            /*
             * Zero source bins.
             */
            await tx.inventoryBin.updateMany({
              where: {
                inventoryId: inventory.id,
              },
              data: {
                quantity: 0,
              },
            });
          }
        }

        /*
         * ========================================================
         * 4. REASSIGN OPEN SALES ORDERS
         * ========================================================
         */

        if (reassignTargetLocationId) {
          await tx.salesOrder.updateMany({
            where: {
              locationId: sourceLocationId,

              isCancelled: false,

              paymentStatus: {
                not: "QUOTE",
              },

              inventoryStatus: {
                not: "QUOTE",
              },
            },

            data: {
              locationId:
                reassignTargetLocationId,
            },
          });

          /*
           * ======================================================
           * 5. REASSIGN OPEN PURCHASE ORDERS
           * ======================================================
           */

          await tx.purchaseOrder.updateMany({
            where: {
              locationId: sourceLocationId,

              paymentStatus: {
                not: "QUOTE",
              },

              inventoryStatus: {
                not: "QUOTE",
              },
            },

            data: {
              locationId:
                reassignTargetLocationId,
            },
          });

          /*
           * ======================================================
           * 6. REASSIGN OPEN TRANSFERS
           * ======================================================
           */

          await tx.transferOrder.updateMany({
            where: {
              sourceLocationId,

              status: {
                in: [
                  "PENDING",
                  "IN_TRANSIT",
                  "PARTIALLY_RECEIVED",
                  "RECEIVED_DISCREPANCY",
                ],
              },
            },

            data: {
              sourceLocationId:
                reassignTargetLocationId,
            },
          });

          await tx.transferOrder.updateMany({
            where: {
              targetLocationId: sourceLocationId,

              status: {
                in: [
                  "PENDING",
                  "IN_TRANSIT",
                  "PARTIALLY_RECEIVED",
                  "RECEIVED_DISCREPANCY",
                ],
              },
            },

            data: {
              targetLocationId:
                reassignTargetLocationId,
            },
          });

          /*
           * ======================================================
           * 7. REASSIGN REORDER SETTINGS
           * ======================================================
           */

          await tx.reorderSetting.updateMany({
            where: {
              locationId: sourceLocationId,
            },

            data: {
              locationId:
                reassignTargetLocationId,
            },
          });

          await tx.reorderSetting.updateMany({
            where: {
              fromLocationId:
                sourceLocationId,
            },

            data: {
              fromLocationId:
                reassignTargetLocationId,
            },
          });
        }

        /*
         * ========================================================
         * 8. ARCHIVE LOCATION
         * ========================================================
         *
         * IMPORTANT:
         *
         * We do NOT touch:
         *
         * - InventoryLedger
         * - posted InventoryAdjustment
         * - historical adjustment lines
         * - historical serial adjustments
         *
         * They must continue pointing to the old location.
         */

        await tx.location.update({
          where: {
            inflowId: sourceLocationId,
          },

          data: {
            isActive: false,
            status: "INACTIVE",
            deletedAt: new Date(),
          },
        });
      },
      {
        timeout: 60_000,
      }
    );

    return NextResponse.json({
      success: true,

      message:
        inventoryStrategy === "TRANSFER"
          ? `"${sourceLocation.name}" was decommissioned and inventory was transferred.`
          : inventoryStrategy === "WRITEOFF"
            ? `"${sourceLocation.name}" was decommissioned and inventory was written off.`
            : `"${sourceLocation.name}" was decommissioned.`,

      locationId: sourceLocationId,

      inventoryStrategy,
      targetLocationId,
      reassignTargetLocationId,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/locations/[id]/decommission failed:",
      error
    );

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          error: "Database error while decommissioning location.",
          code: error.code,
          meta: error.meta,
        },
        { status: 500 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to decommission location.",
      },
      { status: 500 }
    );
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// type InventoryStrategy = "TRANSFER" | "WRITEOFF";

// interface RouteContext {
//   params: Promise<{ id: string }>;
// }

// interface DecommissionBody {
//   inventoryStrategy: InventoryStrategy | null;
//   targetLocationId: string | null;
//   reassignTargetLocationId: string | null;
// }

// export async function POST(
//   request: NextRequest,
//   { params }: RouteContext
// ) {
//   const { id } = await params;

//   try {
//     const body = (await request.json()) as DecommissionBody;

//     const {
//       inventoryStrategy,
//       targetLocationId,
//       reassignTargetLocationId,
//     } = body;

//     if (
//       inventoryStrategy !== null &&
//       inventoryStrategy !== "TRANSFER" &&
//       inventoryStrategy !== "WRITEOFF"
//     ) {
//       return NextResponse.json(
//         { error: "Invalid inventory strategy." },
//         { status: 400 }
//       );
//     }

//     /*
//      * Never allow the source location to be used as its own target.
//      */
//     if (targetLocationId === id) {
//       return NextResponse.json(
//         {
//           error: "Inventory cannot be transferred to the same location.",
//         },
//         { status: 400 }
//       );
//     }

//     if (reassignTargetLocationId === id) {
//       return NextResponse.json(
//         {
//           error: "Orders cannot be reassigned to the same location.",
//         },
//         { status: 400 }
//       );
//     }

//     const sourceLocation = await prisma.location.findUnique({
//       where: {
//         inflowId: id,
//       },
//       select: {
//         id: true,
//         inflowId: true,
//         name: true,
//         isActive: true,
//         deletedAt: true,
//       },
//     });

//     if (!sourceLocation) {
//       return NextResponse.json(
//         { error: "Location not found." },
//         { status: 404 }
//       );
//     }

//     if (!sourceLocation.isActive || sourceLocation.deletedAt) {
//       return NextResponse.json(
//         {
//           error: "Location is already inactive.",
//         },
//         { status: 400 }
//       );
//     }

//     /*
//      * Validate target locations.
//      */
//     if (targetLocationId) {
//       const target = await prisma.location.findUnique({
//         where: {
//           inflowId: targetLocationId,
//         },
//         select: {
//           inflowId: true,
//           name: true,
//           isActive: true,
//           deletedAt: true,
//         },
//       });

//       if (!target || !target.isActive || target.deletedAt) {
//         return NextResponse.json(
//           {
//             error: "The inventory destination location is invalid or inactive.",
//           },
//           { status: 400 }
//         );
//       }
//     }

//     if (reassignTargetLocationId) {
//       const target = await prisma.location.findUnique({
//         where: {
//           inflowId: reassignTargetLocationId,
//         },
//         select: {
//           inflowId: true,
//           name: true,
//           isActive: true,
//           deletedAt: true,
//         },
//       });

//       if (!target || !target.isActive || target.deletedAt) {
//         return NextResponse.json(
//           {
//             error:
//               "The order reassignment location is invalid or inactive.",
//           },
//           { status: 400 }
//         );
//       }
//     }

//     await prisma.$transaction(
//       async (tx) => {
//         /*
//          * ============================================================
//          * 1. INVENTORY
//          * ============================================================
//          */

//         const inventories = await tx.inventory.findMany({
//           where: {
//             locationId: id,
//             quantityOnHand: {
//               gt: 0,
//             },
//           },
//           select: {
//             id: true,
//             productId: true,
//             locationId: true,
//             quantityOnHand: true,
//             quantityAvailable: true,
//             quantityReserved: true,
//           },
//         });

//         if (inventories.length > 0) {
//           if (inventoryStrategy === "TRANSFER") {
//             if (!targetLocationId) {
//               throw new Error(
//                 "A target location is required to transfer inventory."
//               );
//             }

//             for (const sourceInventory of inventories) {
//               const existingTarget = await tx.inventory.findUnique({
//                 where: {
//                   productId_locationId: {
//                     productId: sourceInventory.productId,
//                     locationId: targetLocationId,
//                   },
//                 },
//               });

//               if (existingTarget) {
//                 await tx.inventory.update({
//                   where: {
//                     id: existingTarget.id,
//                   },
//                   data: {
//                     quantityOnHand: {
//                       increment: sourceInventory.quantityOnHand,
//                     },

//                     quantityAvailable:
//                       sourceInventory.quantityAvailable !== null
//                         ? {
//                             increment: sourceInventory.quantityAvailable,
//                           }
//                         : undefined,

//                     quantityReserved:
//                       sourceInventory.quantityReserved !== null
//                         ? {
//                             increment: sourceInventory.quantityReserved,
//                           }
//                         : undefined,

//                     lastMovementAt: new Date(),
//                   },
//                 });
//               } else {
//                 await tx.inventory.create({
//                   data: {
//                     productId: sourceInventory.productId,
//                     locationId: targetLocationId,
//                     quantityOnHand: sourceInventory.quantityOnHand,
//                     quantityAvailable:
//                       sourceInventory.quantityAvailable ?? 0,
//                     quantityReserved:
//                       sourceInventory.quantityReserved ?? 0,
//                     reorderThreshold: 0,
//                     reorderQuantity: 0,
//                     isAutoReorderEnabled: false,
//                     lastMovementAt: new Date(),
//                   },
//                 });
//               }

//               /*
//                * Move bin quantities.
//                *
//                * This is intentionally done before removing the source
//                * inventory record.
//                */
//               const sourceBins = await tx.inventoryBin.findMany({
//                 where: {
//                   inventoryId: sourceInventory.id,
//                 },
//                 select: {
//                   id: true,
//                   sublocationId: true,
//                   quantity: true,
//                 },
//               });

//               /*
//                * We cannot directly attach a source Sublocation to the
//                * target Location because Sublocation belongs to its
//                * Location.
//                *
//                * Therefore, use the first active target sublocation.
//                */
//               for (const sourceBin of sourceBins) {
//                 const sourceSublocation = await tx.sublocation.findUnique({
//                   where: {
//                     id: sourceBin.sublocationId,
//                   },
//                   select: {
//                     id: true,
//                     name: true,
//                   },
//                 });

//                 if (!sourceSublocation) {
//                   throw new Error(
//                     `Source sublocation ${sourceBin.sublocationId} was not found.`
//                   );
//                 }

//                 const targetInventory =
//                   await tx.inventory.findUnique({
//                     where: {
//                       productId_locationId: {
//                         productId: sourceInventory.productId,
//                         locationId: targetLocationId,
//                       },
//                     },
//                   });

//                 if (!targetInventory) {
//                   throw new Error(
//                     "Target inventory record was not created."
//                   );
//                 }

//                 // Find same-named sublocation in target location
//                 let targetSublocation = await tx.sublocation.findUnique({
//                   where: {
//                     locationId_name: {
//                       locationId: targetLocationId,
//                       name: sourceSublocation.name,
//                     },
//                   },
//                 });

//                 // Automatically create it if target doesn't have it
//                 if (!targetSublocation) {
//                   targetSublocation = await tx.sublocation.create({
//                     data: {
//                       locationId: targetLocationId,
//                       name: sourceSublocation.name,
//                     },
//                   });
//                 }

//                 // Find/create target inventory bin
//                 const targetBin = await tx.inventoryBin.findUnique({
//                   where: {
//                     inventoryId_sublocationId: {
//                       inventoryId: targetInventory.id,
//                       sublocationId: targetSublocation.id,
//                     },
//                   },
//                 });

//                 if (targetBin) {
//                   await tx.inventoryBin.update({
//                     where: {
//                       id: targetBin.id,
//                     },
//                     data: {
//                       quantity: {
//                         increment: sourceBin.quantity,
//                       },
//                     },
//                   });
//                 } else {
//                   await tx.inventoryBin.create({
//                     data: {
//                       inventoryId: targetInventory.id,
//                       sublocationId: targetSublocation.id,
//                       quantity: sourceBin.quantity,
//                     },
//                   });
//                 }
//               }

//               /*
//                * Move serialized items belonging to this location.
//                *
//                * Their bin relationship is cleared here because the
//                * source bin is about to disappear. If you need exact
//                * serial-bin preservation, use a dedicated bin migration
//                * strategy instead.
//                */
//               await tx.inventoryBinItem.updateMany({
//                 where: {
//                   locationId: id,
//                   inventoryBinId: {
//                     not: null,
//                   },
//                 },
//                 data: {
//                   locationId: targetLocationId,
//                   inventoryBinId: null,
//                 },
//               });

//               /*
//                * Remove source inventory.
//                */
//               await tx.inventory.delete({
//                 where: {
//                   id: sourceInventory.id,
//                 },
//               });
//             }
//           } else if (inventoryStrategy === "WRITEOFF") {
//             /*
//              * Write inventory down to zero.
//              */
//             await tx.inventory.updateMany({
//               where: {
//                 locationId: id,
//               },
//               data: {
//                 quantityOnHand: 0,
//                 quantityAvailable: 0,
//                 quantityReserved: 0,
//                 lastMovementAt: new Date(),
//               },
//             });

//             /*
//              * Zero out bin quantities as well.
//              */
//             await tx.inventoryBin.updateMany({
//               where: {
//                 inventory: {
//                   locationId: id,
//                 },
//               },
//               data: {
//                 quantity: 0,
//               },
//             });

//             /*
//              * Serialized inventory is no longer in stock.
//              */
//             await tx.inventoryBinItem.updateMany({
//               where: {
//                 locationId: id,
//               },
//               data: {
//                 status: "DAMAGED",
//                 inventoryBinId: null,
//               },
//             });
//           }
//         }

//         /*
//          * ============================================================
//          * 2. SALES ORDERS
//          * ============================================================
//          */

//         if (reassignTargetLocationId) {
//           await tx.salesOrder.updateMany({
//             where: {
//               locationId: id,
//               isCancelled: false,
//               paymentStatus: {
//                 not: "QUOTE",
//               },
//               inventoryStatus: {
//                 not: "QUOTE",
//               },
//             },
//             data: {
//               locationId: reassignTargetLocationId,
//             },
//           });

//           /*
//            * ==========================================================
//            * 3. PURCHASE ORDERS
//            * ==========================================================
//            */

//           await tx.purchaseOrder.updateMany({
//             where: {
//               locationId: id,
//               paymentStatus: {
//                 not: "QUOTE",
//               },
//               inventoryStatus: {
//                 not: "QUOTE",
//               },
//             },
//             data: {
//               locationId: reassignTargetLocationId,
//             },
//           });

//           /*
//            * ==========================================================
//            * 4. TRANSFER ORDERS
//            * ==========================================================
//            *
//            * A transfer can reference the location as either source
//            * or destination.
//            */
//           await tx.transferOrder.updateMany({
//             where: {
//               sourceLocationId: id,
//               status: {
//                 in: [
//                   "PENDING",
//                   "IN_TRANSIT",
//                   "PARTIALLY_RECEIVED",
//                   "RECEIVED_DISCREPANCY",
//                 ],
//               },
//             },
//             data: {
//               sourceLocationId: reassignTargetLocationId,
//             },
//           });

//           await tx.transferOrder.updateMany({
//             where: {
//               targetLocationId: id,
//               status: {
//                 in: [
//                   "PENDING",
//                   "IN_TRANSIT",
//                   "PARTIALLY_RECEIVED",
//                   "RECEIVED_DISCREPANCY",
//                 ],
//               },
//             },
//             data: {
//               targetLocationId: reassignTargetLocationId,
//             },
//           });

//           /*
//            * ==========================================================
//            * 5. REORDER SETTINGS
//            * ==========================================================
//            *
//            * The location can be either the reorder target or source.
//            */
//           await tx.reorderSetting.updateMany({
//             where: {
//               locationId: id,
//             },
//             data: {
//               locationId: reassignTargetLocationId,
//             },
//           });

//           await tx.reorderSetting.updateMany({
//             where: {
//               fromLocationId: id,
//             },
//             data: {
//               fromLocationId: reassignTargetLocationId,
//             },
//           });
//         }

//         /*
//          * ============================================================
//          * 6. DISABLE LOCATION
//          * ============================================================
//          */

//         await tx.location.update({
//           where: {
//             inflowId: id,
//           },
//           data: {
//             isActive: false,
//             status: "INACTIVE",
//             deletedAt: new Date(),
//           },
//         });
//       },
//       {
//         /*
//          * Inventory migration can involve many rows.
//          */
//         timeout: 30_000,
//       }
//     );

//     return NextResponse.json({
//       success: true,
//       message: `Dependencies reassigned and "${sourceLocation.name}" archived.`,
//       locationId: id,
//     });
//   } catch (error) {
//     console.error(
//       "POST /api/admin/locations/[id]/decommission failed:",
//       error
//     );

//     if (error instanceof Error) {
//       return NextResponse.json(
//         {
//           error: error.message,
//         },
//         { status: 400 }
//       );
//     }

//     return NextResponse.json(
//       {
//         error: "Failed to decommission location.",
//       },
//       { status: 500 }
//     );
//   }
// }
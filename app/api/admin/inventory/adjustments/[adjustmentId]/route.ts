import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ adjustmentId: string }> }
) {
  try {
    const { adjustmentId } = await params;

    if (!adjustmentId) {
      return NextResponse.json(
        { error: "Adjustment ID is required" },
        { status: 400 }
      );
    }

    // Step 1: Check status first to decide dynamic relation inclusions
    const statusCheck = await prisma.inventoryAdjustment.findUnique({
      where: { id: adjustmentId },
      select: { status: true },
    });

    if (!statusCheck) {
      return NextResponse.json(
        { error: "Inventory adjustment not found" },
        { status: 404 }
      );
    }

    const isDraft = statusCheck.status === "DRAFT";

    // Step 2: Fetch the complete record with status-based bin inclusion
    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: {
        id: adjustmentId,
      },
      include: {
        adjustmentReason: {
          select: {
            id: true,
            name: true,
          },
        },
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lastModifiedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            product: {
              select: {
                inflowId: true,
                name: true,
                sku: true,
                trackSerials: true,
                images: {
                  orderBy: { position: "asc" },
                  take: 1,
                  select: { thumbUrl: true, originalUrl: true },
                },
              },
            },
            location: {
              select: {
                inflowId: true,
                name: true,
                sublocations: {
                  select: { id: true, name: true, locationId: true },
                },
              },
            },
            // Include draftBins ONLY if in DRAFT status
            ...(isDraft
              ? {
                  draftBins: {
                    include: {
                      sublocation: {
                        select: { id: true, name: true },
                      },
                      serials: {
                        select: {
                          id: true,
                          serialNumber: true,
                        },
                      },
                    },
                  },
                }
              : {
                  // Include committed InventoryBin ONLY if POSTED or VOIDED
                  inventoryBin: {
                    select: {
                      id: true,
                      inventoryId: true,
                      sublocationId: true,
                      sublocation: {
                        select: { id: true, name: true },
                      },
                    },
                  },
                }),
            serials: {
              select: {
                id: true,
                serialNumber: true,
                action: true,
                draftBinId: true,
                fromInventoryBinId: true,
                toInventoryBinId: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: adjustment,
    });
  } catch (error: any) {
    console.error("GET /api/admin/inventory/adjustments/[adjustmentId] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ adjustmentId: string }> }
// ) {
//   try {
//     const { adjustmentId } = await params;

//     if (!adjustmentId) {
//       return NextResponse.json(
//         { error: "Adjustment ID is required" },
//         { status: 400 }
//       );
//     }

//     const adjustment = await prisma.inventoryAdjustment.findUnique({
//       where: {
//         id: adjustmentId,
//       },
//       include: {
//         adjustmentReason: {
//           select: {
//             id: true,
//             name: true,
//           },
//         },
//         performedBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         lastModifiedBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         lines: {
//           include: {
//             product: {
//               select: {
//                 inflowId: true,
//                 name: true,
//                 sku: true,
//                 trackSerials: true,
//                 images: {
//                   orderBy: { position: "asc" },
//                   take: 1,
//                   select: { thumbUrl: true, originalUrl: true },
//                 },
//               },
//             },
//             location: {
//               select: {
//                 inflowId: true,
//                 name: true,
//                 sublocations: {
//                   select: { id: true, name: true, locationId: true },
//                 },
//               },
//             },
//             draftBins: {
//               include: {
//                 sublocation: {
//                   select: { id: true, name: true },
//                 },
//                 serials: {
//                   select: {
//                     id: true,
//                     serialNumber: true,
//                   },
//                 },
//               },
//             },
//             serials: {
//               select: {
//                 id: true,
//                 serialNumber: true,
//                 action: true,
//                 draftBinId: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!adjustment) {
//       return NextResponse.json(
//         { error: "Inventory adjustment not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       data: adjustment,
//     });
//   } catch (error: any) {
//     console.error("GET /api/admin/inventory/adjustments/[adjustmentId] Error:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error", details: error.message },
//       { status: 500 }
//     );
//   }
// }


// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// interface Props {
//   params: Promise<{
//     adjustmentId: string;
//   }>;
// }

// export async function GET(
//   request: NextRequest,
//   { params }: Props
// ) {
//   try {
//     const { adjustmentId: id } = await params;

//     const adjustment = await prisma.inventoryAdjustment.findUnique({
//       where: { id },
//       include: {
//         adjustmentReason: true,
//         performedBy: {
//           select: { id: true, name: true, email: true },
//         },
//         lastModifiedBy: {
//           select: { id: true, name: true, email: true },
//         },
//         lines: {
//           include: {
//             product: {
//               select: { id: true, inflowId: true, name: true, sku: true },
//             },
//             location: {
//               select: { id: true, inflowId: true, name: true },
//             },
//             serials: {
//               include: {
//                 inventoryBinItem: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!adjustment) {
//       return NextResponse.json(
//         { error: "Inventory adjustment entry not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({ data: adjustment });
//   } catch (error: any) {
//     console.error("[INVENTORY_ADJUSTMENT_GET_SINGLE]", error);
//     return NextResponse.json(
//       { error: "Failed to fetch inventory adjustment details", details: error.message },
//       { status: 500 }
//     );
//   }
// }
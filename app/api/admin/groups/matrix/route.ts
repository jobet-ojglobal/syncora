// api/admin/groups/matrix

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust this path to match your Prisma client instance location

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch all product groups with relational matrix hydration mapping
    const productGroups = await prisma.productGroup.findMany({
      where: {
        deletedAt: null, // Filter out soft-deleted records if applicable
      },
      select: {
        id: true,
        inflowId: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        brandId: true,
        categoryId: true,
        
        // Load Brand properties context if needed
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        
        // Load Category tracking node details
        category: {
          select: {
            inflowId: true,
            name: true,
          },
        },

        // 🎯 Crucial: Pull existing variant configurations for the signature dropdown selection
        // variants: {
        //   select: {
        //     inflowId: true,
        //     signature: true,
        //     productId: true,
        //     defaultPrice: true,
        //     isActive: true,
        //     // Include connected product info to show if a slot is currently occupied
        //     product: {
        //       select: {
        //         sku: true,
        //         name: true,
        //       },
        //     },
        //     // Pull option selection mappings to display readable titles on the frontend
        //     selections: {
        //       select: {
        //         optionId: true,
        //         optionValueId: true,
        //         optionValue: {
        //           select: {
        //             attributeValue: {
        //               select: {
        //                 value: true,
        //               },
        //             },
        //           },
        //         },
        //       },
        //     },
        //   },
        // },

        variants: {
          select: {
            inflowId: true,
            signature: true,
            productId: true,
            defaultPrice: true,
            isActive: true,
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
            selections: {
              select: {
                optionId: true,
                optionValueId: true,
                // 💡 Realignment: Query the ProductGroupOptionValue model path safely
                optionValue: {
                  select: {
                    attributeValue: {
                      select: {
                        id: true,
                        value: true, // This grabs the readable literal text (e.g., "Red", "Large")
                      },
                    },
                  },
                },
              },
            },
          },
        },

        // Load root Group Options structural layout metadata matrix
        options: {
          orderBy: {
            lineNum: "asc",
          },
          select: {
            inflowId: true,
            lineNum: true,
            attribute: {
              select: {
                id: true,
                name: true,
              },
            },
            values: {
              orderBy: {
                lineNum: "asc",
              },
              select: {
                inflowId: true,
                lineNum: true,
                attributeValue: {
                  select: {
                    id: true,
                    value: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc", // Keep newly created groups near the top of the UI list
      },
    });

    // 2. Return payload wrapper array to the UI consumer client components safely
    return NextResponse.json(productGroups, { status: 200 });
  } catch (error: any) {
    console.error("⛔ CRITICAL FAILED TO RETRIEVE PRODUCT GROUPS MATRIX:", error);
    return NextResponse.json(
      { error: error.message || "Failed parsing matrix catalogs metadata nodes." },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id: locationId } = await params;

    if (!locationId) {
      return NextResponse.json(
        { error: "Missing required logistics location identifier token." },
        { status: 400 }
      );
    }

    // 1. Resolve Location Inflow ID
    const locationExists = await prisma.location.findUnique({
      where: { id: locationId },
      select: { inflowId: true },
    });

    if (!locationExists) {
      return NextResponse.json(
        { error: "Requested logistics warehouse deployment node not found in ledgers." },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "all";

    const sublocationIdsParam = searchParams.get("sublocationIds");
    const sublocationIds = sublocationIdsParam
      ? sublocationIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id !== "all")
      : [];
    
    // Extract serial tracking and low stock parameters
    const trackSerialsParam = searchParams.get("trackSerials")?.trim();
    const isLowStockFilter = searchParams.get("lowStock") === "true";

    const minQty = searchParams.get("minQty") ? Number(searchParams.get("minQty")) : null;
    const maxQty = searchParams.get("maxQty") ? Number(searchParams.get("maxQty")) : null;
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = page * limit;

    const whereClause: any = {
      locationId: locationExists.inflowId
    };

    // Status filter
    if (status === "active") {
      whereClause.product = { ...whereClause.product, isActive: true };
    } else if (status === "inactive") {
      whereClause.product = { ...whereClause.product, isActive: false };
    }

    // Serialized Products Filter
    if (trackSerialsParam === "true") {
      whereClause.product = { ...whereClause.product, trackSerials: true };
    } else if (trackSerialsParam === "false") {
      whereClause.product = { ...whereClause.product, trackSerials: false };
    }

    // Sublocations Filter Fix
    if (sublocationIds.length > 0) {
      whereClause.bins = {
        some: {
          sublocationId: { in: sublocationIds },
        },
      };
    }

    // Low Stock Filter (reorderThreshold > 0 and available stock <= reorderThreshold)
    if (isLowStockFilter) {
      whereClause.reorderThreshold = { gt: 0 };
      whereClause.quantityAvailable = {
        lte: prisma.inventory.fields.reorderThreshold,
      };
    }

    // Quantity range filter
    if (minQty !== null || maxQty !== null) {
      whereClause.quantityOnHand = {};
      if (minQty !== null && !isNaN(minQty)) {
        whereClause.quantityOnHand.gte = minQty;
      }
      if (maxQty !== null && !isNaN(maxQty)) {
        whereClause.quantityOnHand.lte = maxQty;
      }
    }

    // Search filter across product name, SKU, and location name
    if (search) {
      whereClause.OR = [
        { product: { name: { contains: search, mode: "insensitive" } } },
        { product: { sku: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Execute queries concurrently
    const [stockItems, totalRecords, activeInTransitLines] = await prisma.$transaction([
      prisma.inventory.findMany({
        where: whereClause,
        include: {
          product: {
            select: {
              inflowId: true,
              name: true,
              slug: true,
              sku: true,
              trackSerials: true,
              isActive: true,
              images: {
                orderBy: { position: "asc" },
                take: 1,
                select: { thumbUrl: true, originalUrl: true },
              },
              prices: {
                where: { deletedAt: null },
                include: {
                  pricingScheme: {
                    select: {
                      inflowId: true,
                      name: true,
                      isDefault: true,
                      isTaxInclusive: true,
                      isActive: true,
                      currency: {
                        select: {
                          isoCode: true,
                          symbol: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          bins: {
            include: {
              sublocation: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: skip,
        take: limit,
      }),
      prisma.inventory.count({
        where: whereClause,
      }),
      prisma.transferOrderLine.findMany({
        where: {
          transferOrder: {
            status: "IN_TRANSIT",
          },
        },
        select: {
          productId: true,
          quantity: true,
          transferOrder: {
            select: {
              sourceLocationId: true,
            },
          },
        },
      }),
    ]);

    const inTransitMap: Record<string, number> = {};
    activeInTransitLines.forEach((line) => {
      const key = `${line.productId}_${line.transferOrder.sourceLocationId}`;
      inTransitMap[key] = (inTransitMap[key] || 0) + Number(line.quantity);
    });

    const mappedData = stockItems.map((item) => {
      const lookupKey = `${item.productId}_${item.locationId}`;

      // Format pricing schemes
      const productPrices = (item.product as any).prices || [];

      const prices = productPrices.map((pp: any) => ({
        id: pp.id,
        priceType: pp.priceType,
        unitPrice: pp.unitPrice ? Number(pp.unitPrice) : null,
        fixedMarkup: pp.fixedMarkup ? Number(pp.fixedMarkup) : null,
        pricingScheme: {
          inflowId: pp.pricingScheme.inflowId,
          name: pp.pricingScheme.name,
          isDefault: pp.pricingScheme.isDefault,
          isTaxInclusive: pp.pricingScheme.isTaxInclusive,
          isActive: pp.pricingScheme.isActive,
          currencySymbol: pp.pricingScheme.currency?.symbol || "$",
          currencyCode: pp.pricingScheme.currency?.isoCode || "USD",
        },
      }));

      // Find the default pricing scheme price entry
      const defaultPriceEntry = prices.find((p: any) => p.pricingScheme.isDefault) || prices[0] || null;

      return {
        id: item.id,
        product: {
          inflowId: item.product.inflowId,
          name: item.product.name,
          sku: item.product.sku,
          slug: item.product.slug,
          thumbnail:
            item.product.images[0]?.thumbUrl ||
            item.product.images[0]?.originalUrl ||
            null,
          trackSerials: item.product.trackSerials,
          isActive: item.product.isActive,
          prices,
          defaultPrice: defaultPriceEntry,
        },
        locationId: item.locationId,
        quantityOnHand: Number(item.quantityOnHand),
        quantityReserved: Number(item.quantityReserved || 0),
        quantityAvailable: Number(item.quantityAvailable || 0),
        quantityInTransit: inTransitMap[lookupKey] || 0,
        isAutoReorderEnabled: Boolean(item.isAutoReorderEnabled),
        reorderThreshold: Number(item.reorderThreshold || 0),
        reorderQuantity: Number(item.reorderQuantity || 0),
        preferredSourceLocationId: item.preferredSourceLocationId,
        bins: item.bins.map((bin) => ({
          id: bin.id,
          sublocationName: bin.sublocation.name,
          quantity: Number(bin.quantity),
        })),
      };
    });

    const pageCount = Math.ceil(totalRecords / limit) || 1;

    return NextResponse.json(
      {
        data: mappedData,
        totalRecords,
        pageCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching inventory catalog directory list:", error);
    return NextResponse.json(
      { error: "Internal server error fetching inventory records." },
      { status: 500 }
    );
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { FormattedInventoryItem } from "@/types/inventory.dto";

// interface Props {
//   params: Promise<{
//     id: string;
//   }>;
// }

// /**
//  * 🏢 ISOLATED LOCATION STOCK MATRIX ENGINE (PAGINATED INVENTORY ONLY)
//  */
// export async function GET(request: NextRequest, { params }: Props) {
//   try {
    // const { id: locationId } = await params;

    // if (!locationId) {
    //   return NextResponse.json(
    //     { error: "Missing required logistics location identifier token." },
    //     { status: 400 }
    //   );
    // }

    // // 1. Resolve Location Inflow ID
    // const locationExists = await prisma.location.findUnique({
    //   where: { id: locationId },
    //   select: { inflowId: true },
    // });

    // if (!locationExists) {
    //   return NextResponse.json(
    //     { error: "Requested logistics warehouse deployment node not found in ledgers." },
    //     { status: 404 }
    //   );
    // }

//     // 2. Parse Query Parameters
//     const { searchParams } = new URL(request.url);
//     const search = searchParams.get("search")?.trim() || "";
//     const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
//     const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));

//     // 3. Construct Table Filter Clause
//     const tableWhereClause: any = { locationId: locationExists.inflowId };
//     if (search) {
//       tableWhereClause.product = {
//         OR: [
//           { name: { contains: search, mode: "insensitive" } },
//           { slug: { contains: search, mode: "insensitive" } },
//         ],
//       };
//     }

//     // 4. Query Total Filtered Records & Paginated Items
//     const [totalRecords, stockItems] = await Promise.all([
//       prisma.inventory.count({ where: tableWhereClause }),
//       prisma.inventory.findMany({
//         where: tableWhereClause,
//         include: {
//           product: {
//             select: {
//               inflowId: true,
//               name: true,
//               slug: true,
//               sku: true,
//               trackSerials: true,
//               images: {
//                 orderBy: { position: "asc" },
//                 take: 1,
//                 select: { thumbUrl: true, originalUrl: true },
//               },
//             },
//           },
//           bins: {
//             include: { sublocation: { select: { name: true } } },
//           },
//         },
//         orderBy: { updatedAt: "desc" },
//         skip: page * limit,
//         take: limit,
//       }),
//     ]);

//     // 5. Batched In-Transit Line Calculations
//     const pageProductIds = stockItems.map((item) => item.productId);
//     const inTransitMap: Record<string, number> = {};

//     if (pageProductIds.length > 0) {
//       const activeInTransitLines = await prisma.transferOrderLine.findMany({
//         where: {
//           productId: { in: pageProductIds },
//           transferOrder: {
//             sourceLocationId: locationId,
//             status: "IN_TRANSIT",
//           },
//         },
//         select: { productId: true, quantity: true },
//       });

//       activeInTransitLines.forEach((line) => {
//         const qty = Number(line.quantity || 0);
//         inTransitMap[line.productId] = (inTransitMap[line.productId] || 0) + qty;
//       });
//     }

//     // 6. Format Final Response
//     const formattedInventory: FormattedInventoryItem[] = stockItems.map((item) => {
//       const formattedProduct = {
//         inflowId: item.product.inflowId,
//         name: item.product.name,
//         sku: item.product.sku,
//         slug: item.product.slug,
//         thumbnail:
//           item.product.images[0]?.thumbUrl ||
//           item.product.images[0]?.originalUrl ||
//           null,
//         trackSerials: item.product.trackSerials,
//       };

//       return {
//         id: item.id,
//         product: formattedProduct,
//         locationId: item.locationId,
//         quantityOnHand: Number(item.quantityOnHand || 0),
//         quantityReserved: Number(item.quantityReserved || 0),
//         quantityAvailable: Number(item.quantityAvailable || 0),
//         quantityInTransit: inTransitMap[item.productId] || 0,
//         isAutoReorderEnabled: Boolean(item.isAutoReorderEnabled),
//         reorderThreshold: Number(item.reorderThreshold || 0),
//         reorderQuantity: Number(item.reorderQuantity || 0),
//         preferredSourceLocationId: item.preferredSourceLocationId,
//         bins: item.bins.map((b) => ({
//           id: b.id,
//           sublocationName: b.sublocation.name,
//           quantity: Number(b.quantity || 0),
//         })),
//       };
//     });

//     return NextResponse.json(
//       {
//         inventory: formattedInventory,
//         pagination: {
//           totalRecords,
//           pageCount: Math.ceil(totalRecords / limit),
//           page,
//           limit,
//         },
//       },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     console.error("Isolated location stock ledger processing breakdown:", error);
//     return NextResponse.json(
//       { error: error.message || "Internal system failure querying isolated location stocks." },
//       { status: 500 }
//     );
//   }
// }
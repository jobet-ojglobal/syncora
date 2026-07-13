// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genUniqueSlug } from "@/helpers/genUniqueSlug";
import { Prisma } from "@/generated/prisma/client";

// export async function GET() {
//   try {
//     const catalogItems = await prisma.product.findMany({
//       where: { deletedAt: null }, // Global soft-delete filtering
//       include: {
//         brand: { select: { name: true } },
//         category: { select: { name: true } },
        
//         // 🟢 NEW: Pull parent Variant structure node to resolve associated ProductGroups
//         variant: {
//           include: {
//             group: {
//               select: { name: true }
//             }
//           }
//         },
        
//         // 🟢 FIXED: Include nested core UnitOfMeasure details
//         purchasingUom: {
//           include: {
//             uom: { select: { name: true, code: true } }
//           }
//         },
        
//         // 🟢 FIXED: Include nested core UnitOfMeasure details
//         salesUom: {
//           include: {
//             uom: { select: { name: true, code: true } }
//           }
//         },
        
//         barcodes: { select: { barcode: true } },
//         images: {
//           orderBy: { position: "asc" },
//           take: 1,
//           select: { thumbUrl: true, originalUrl: true }
//         }
//       },
//       orderBy: { updatedAt: "desc" }
//     });

//     const parsedProducts = catalogItems.map((prod) => {
//       // Safely extract structural strings from the new relational join schema layer
//       const purchasingCode = prod.purchasingUom?.uom?.code || prod.purchasingUom?.uom?.name;
//       const salesCode = prod.salesUom?.uom?.code || prod.salesUom?.uom?.name;

//       return {
//         id: prod.id,
//         inflowId: prod.inflowId,
//         sku: prod.sku || "N/A",
//         name: prod.name,
//         groupName: prod.variant?.group.name,
//         slug: prod.slug,
//         itemType: prod.itemType || "Stock",
//         isActive: prod.isActive,
//         trackExpiry: prod.trackExpiry,
//         trackLots: prod.trackLots,
//         trackSerials: prod.trackSerials,
//         brandName: prod.brand?.name || "Generic / White-label",
//         categoryName: prod.category?.name || "Unassigned Dept",
//         thumbnail: prod.images[0]?.thumbUrl || prod.images[0]?.originalUrl || null,
//         barcodesCount: prod.barcodes.length,
//         primaryBarcode: prod.barcodes[0]?.barcode || null,
        
//         // 🟢 FIXED: Displays the actual looked-up code (e.g., BOX, PCS) along with conversion variables
//         purchasingUomText: prod.purchasingUom && purchasingCode
//           ? `${purchasingCode} (${Number(prod.purchasingUom.standardQuantity)}:${Number(prod.purchasingUom.uomQuantity)})`
//           : "Not Set",
          
//         salesUomText: prod.salesUom && salesCode
//           ? `${salesCode} (${Number(prod.salesUom.standardQuantity)}:${Number(prod.salesUom.uomQuantity)})`
//           : "Not Set",
//       };
//     });

//     return NextResponse.json(parsedProducts, { status: 200 });
//   } catch (error: any) {
//     console.error("Master product catalog pipeline failure:", error);
//     return NextResponse.json(
//       { error: "Internal product database query execution failure.", details: error.message }, 
//       { status: 500 }
//     );
//   }
// }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination Parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "25"))
    const skip = (page - 1) * limit

    // Filter Parameters
    const search = searchParams.get("search")?.trim() || ""
    const statusParam = searchParams.get("status")
    
    // 🟢 Extract and convert array parameters safely
    const brands = searchParams.get("brands")?.split(",").filter(Boolean) || []
    const categories = searchParams.get("categories")?.split(",").filter(Boolean) || []

    // Sorting Parameters
    const sortBy = searchParams.get("sortBy") || ""
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // Construct Prisma Query Object
    const whereClause: any = { deletedAt: null }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ]
    }

    if (statusParam === "active") {
      whereClause.isActive = true
    } else if (statusParam === "inactive") {
      whereClause.isActive = false
    }

    // 🟢 Server-side relational database filters array processing
    if (brands.length > 0) {
      whereClause.brand = {
        id: { in: brands }
      }
    }

    if (categories.length > 0) {
      whereClause.category = {
        id: { in: categories }
      }
    }

    // Sort evaluation block
    let orderByClause: any = { updatedAt: "desc" }
    if (sortBy === "sku" || sortBy === "name") {
      orderByClause = { [sortBy]: sortOrder }
    }

    // Execute Concurrent Query Payload Requests
    const [totalRecords, catalogItems] = await prisma.$transaction([
      prisma.product.count({ where: whereClause }),
      prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
          variant: { include: { group: { select: { name: true } } } },
          purchasingUom: { include: { uom: { select: { name: true, code: true } } } },
          salesUom: { include: { uom: { select: { name: true, code: true } } } },
          barcodes: { select: { barcode: true } },
          images: { orderBy: { position: "asc" }, take: 1, select: { thumbUrl: true, originalUrl: true } }
        },
        orderBy: orderByClause
      })
    ]);

    // 5. Parse Data to match your table shape
    const parsedProducts = catalogItems.map((prod) => {
      const purchasingCode = prod.purchasingUom?.uom?.code || prod.purchasingUom?.uom?.name;
      const salesCode = prod.salesUom?.uom?.code || prod.salesUom?.uom?.name;

      return {
        id: prod.id,
        inflowId: prod.inflowId,
        sku: prod.sku || "N/A",
        name: prod.name,
        groupName: prod.variant?.group.name,
        slug: prod.slug,
        itemType: prod.itemType || "Stock",
        isActive: prod.isActive,
        trackExpiry: prod.trackExpiry,
        trackLots: prod.trackLots,
        trackSerials: prod.trackSerials,
        brandName: prod.brand?.name || "Generic / White-label",
        categoryName: prod.category?.name || "Unassigned Dept",
        thumbnail: prod.images[0]?.thumbUrl || prod.images[0]?.originalUrl || null,
        barcodesCount: prod.barcodes.length,
        primaryBarcode: prod.barcodes[0]?.barcode || null,
        purchasingUomText: prod.purchasingUom && purchasingCode
          ? `${purchasingCode} (${Number(prod.purchasingUom.standardQuantity)}:${Number(prod.purchasingUom.uomQuantity)})`
          : "Not Set",
        salesUomText: prod.salesUom && salesCode
          ? `${salesCode} (${Number(prod.salesUom.standardQuantity)}:${Number(prod.salesUom.uomQuantity)})`
          : "Not Set",
      };
    });

    // Return the items along with total counters for your pagination components
    return NextResponse.json({
      data: parsedProducts,
      meta: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: page,
        limit
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Master product catalog pipeline failure:", error);
    return NextResponse.json(
      { error: "Internal product database query execution failure.", details: error.message }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sku, name, description, itemType, brandId, categoryId,
      autoAssemble, isActive, isManufacturable, includeQuantityBuildable,
      trackExpiry, trackLots, trackSerials, shelfLifeDays, sellBeforeExpiryDays,
      expiryNotificationDays, weight, width, height, length, originCountry,
      hsTariffNumber, remarks, standardUomName, purchasingUom, salesUom, 
      productGroupId,   
      variantSignature,  
      barcodes = [], 
      images = [] 
    } = body;

    // 1. Core Structural Validation Constraints
    if (!sku?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "Missing required core SKU identity attributes entries." }, { status: 400 });
    }

    // 2. Pre-fetch target UOM IDs using the incoming Frontend Code Tokens
    const codeLookups = Array.from(new Set([
      purchasingUom?.name,
      salesUom?.name
    ].filter(Boolean)));

    const matchingUoms = await prisma.unitOfMeasure.findMany({
      where: { code: { in: codeLookups } },
      select: { id: true, code: true }
    });

    const uomMap = Object.fromEntries(matchingUoms.map(u => [u.code, u.id]));

    const purchasingUomId = purchasingUom?.name ? uomMap[purchasingUom.name] : null;
    const salesUomId = salesUom?.name ? uomMap[salesUom.name] : null;

    if ((purchasingUom?.name && !purchasingUomId) || (salesUom?.name && !salesUomId)) {
      return NextResponse.json({ 
        error: "Referenced operational Multi-tier calculation metric unit is not registered within system catalogs." 
      }, { status: 400 });
    }

    const slug = await genUniqueSlug(name, prisma.product);
    const computedInflowId = crypto.randomUUID().toLowerCase();

    // 3. Main Operational Database Transaction Chain Loop
    const outputTransaction = await prisma.$transaction(async (tx) => {
      
      // 🎯 ADDED: Core Matrix Safety Guardrail Check for creating new links
      if (productGroupId && variantSignature) {
        const existingBinding = await tx.productVariant.findUnique({
          where: {
            productGroupId_signature: {
              productGroupId,
              signature: variantSignature
            }
          },
          select: {
            productId: true,
            product: { select: { sku: true } }
          }
        });

        // Fail early if slot is occupied by another product node
        if (existingBinding && existingBinding.productId) {
          throw new Error(`The selected matrix variant option slot is already assigned to active SKU: ${existingBinding.product?.sku}`);
        }
      }

      // Fetch a primary default fallback configuration scheme if available
      const primaryScheme = await tx.pricingScheme.findFirst({ select: { inflowId: true } });
      const targetSchemeId = primaryScheme?.inflowId || crypto.randomUUID().toLowerCase();

      // A. Create root product document item node
      const newProduct = await tx.product.create({
        data: {
          inflowId: computedInflowId,
          sku: sku.trim(),
          name: name.trim(),
          slug: slug.trim(),
          description: description?.trim() || null,
          itemType,
          brandId: brandId || null,
          categoryId: categoryId || null,
          autoAssemble: !!autoAssemble,
          isActive: !!isActive,
          isManufacturable: !!isManufacturable,
          includeQuantityBuildable: !!includeQuantityBuildable,
          trackExpiry: !!trackExpiry,
          trackLots: !!trackLots,
          trackSerials: !!trackSerials,
          shelfLifeDays: Number(shelfLifeDays) || 0,
          sellBeforeExpiryDays: Number(sellBeforeExpiryDays) || 0,
          expiryNotificationDays: Number(expiryNotificationDays) || 0,
          weight: Number(weight) || 0, 
          width: Number(width) || 0, 
          height: Number(height) || 0, 
          length: Number(length) || 0,
          originCountry: originCountry?.trim() || null,
          hsTariffNumber: hsTariffNumber?.trim() || null,
          remarks: remarks?.trim() || null,
          standardUomName: standardUomName.trim().toUpperCase(), 

          purchasingUom: purchasingUomId ? {
            create: {
              uomId: purchasingUomId,
              standardQuantity: Number(purchasingUom.standardQuantity) || 1,
              uomQuantity: Number(purchasingUom.uomQuantity) || 1,
            }
          } : undefined,

          salesUom: salesUomId ? {
            create: {
              uomId: salesUomId,
              standardQuantity: Number(salesUom.standardQuantity) || 1,
              uomQuantity: Number(salesUom.uomQuantity) || 1,
            }
          } : undefined,

          // prices: {
          //   create: [{
          //     inflowId: crypto.randomUUID().toLowerCase(),
          //     pricingSchemeId: targetSchemeId,
          //     priceType: "Normal",
          //     unitPrice: new Prisma.Decimal(initialPrice)
          //   }]
          // },

          barcodes: barcodes.length > 0 ? {
            create: barcodes
              .filter((b: any) => b?.barcode?.trim())
              .map((b: any, index: number) => ({
                inflowId: crypto.randomUUID().toString(),
                barcode: b.barcode.trim(),
                lineNum: index + 1,
              }))
          } : undefined,

          images: images.length > 0 ? {
            create: images
              .filter((img: any) => img?.originalUrl?.trim())
              .map((img: any, positionIndex: number) => ({
                inflowId: crypto.randomUUID().toString(),
                position: positionIndex,
                originalUrl: img.originalUrl.trim(),
                largeUrl: img.originalUrl.trim(),
                mediumUrl: img.originalUrl.trim(),
                thumbUrl: img.originalUrl.trim(),
              }))
          } : undefined
        },
        include: {
          purchasingUom: true,
          salesUom: true,
          cost: true,
          prices: true,
          barcodes: true,
          images: true
        }
      });

      // 🎯 RECONCILED: Connect Variant Group Selection Bindings Matrix
      if (productGroupId && variantSignature) {
        // 1. Check if the matrix slot generated by the product group setup exists
        const preGeneratedSlot = await tx.productVariant.findUnique({
          where: {
            productGroupId_signature: {
              productGroupId,
              signature: variantSignature
            }
          }
        });

        if (preGeneratedSlot) {
          const oldPlaceholderProductId = preGeneratedSlot.productId;

          // 2. Safe transition: Wipe out the placeholder variant row first to avoid unique constraint collisions
          await tx.productVariant.delete({ where: { id: preGeneratedSlot.id } });

          // 3. Clear the abandoned auto-generated placeholder product from the database
          if (oldPlaceholderProductId) {
            await tx.product.deleteMany({
              where: { inflowId: oldPlaceholderProductId }
            });
          }
        }

        // 4. Create the clean variant row pointing to your newly configured product
        await tx.productVariant.create({
          data: {
            inflowId: crypto.randomUUID().toLowerCase(),
            productGroupId: productGroupId,
            productId: newProduct.inflowId,
            signature: variantSignature,
            defaultPrice: 0.00,
            variantCount: 1,
            isActive: true
          }
        });
      }

      return newProduct;
    });

    return NextResponse.json(outputTransaction, { status: 201 });
  } catch (error: any) {
    console.error("Critical failure adding product configuration tracking metadata:", error);
    return NextResponse.json(
      { error: error.message || "Internal Database insertion pipeline transaction aborted execution." }, 
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      inflowId, name, description, itemType, brandId, categoryId,
      autoAssemble, isActive, isManufacturable, includeQuantityBuildable,
      trackExpiry, trackLots, trackSerials, shelfLifeDays, sellBeforeExpiryDays,
      expiryNotificationDays, weight, width, height, length, originCountry,
      hsTariffNumber, remarks, standardUomName, purchasingUom, salesUom, 
      productGroupId,    
      variantSignature,
      barcodes = [], 
      images = []
    } = body;

    // 1. Core Validation Constraints Guard Layer
    if (!inflowId) {
      return NextResponse.json({ error: "Missing required core identifying target reference pointer." }, { status: 400 });
    }

    // 2. Pre-fetch corresponding operational UOM system IDs using Code mapping tokens
    const codeLookups = Array.from(new Set([
      purchasingUom?.name,
      salesUom?.name
    ].filter(Boolean)));

    const matchingUoms = await prisma.unitOfMeasure.findMany({
      where: {
        code: { in: codeLookups }
      },
      select: { id: true, code: true }
    });

    const uomMap = Object.fromEntries(matchingUoms.map(u => [u.code, u.id]));

    const purchasingUomId = purchasingUom?.name ? uomMap[purchasingUom.name] : null;
    const salesUomId = salesUom?.name ? uomMap[salesUom.name] : null;

    if ((purchasingUom?.name && !purchasingUomId) || (salesUom?.name && !salesUomId)) {
      return NextResponse.json({ 
        error: "Referenced operational Multi-tier calculation metric unit is not registered within system catalogs." 
      }, { status: 400 });
    }

    const slug = await genUniqueSlug(name, prisma.product);

    // 3. Database Transaction Modification Process Chain
    const updatedCatalogEntity = await prisma.$transaction(async (tx) => {

      // 🎯 ADDED: Core Matrix Safety Guardrail Check
      if (productGroupId && variantSignature) {
        const existingBinding = await tx.productVariant.findUnique({
          where: {
            productGroupId_signature: {
              productGroupId,
              signature: variantSignature
            }
          },
          select: {
            productId: true,
            product: { select: { sku: true } }
          }
        });

        // Block transaction if the option slot belongs to a different variant instance
        if (existingBinding && existingBinding.productId && existingBinding.productId !== inflowId) {
          throw new Error(`The selected matrix variant option slot is already assigned to active SKU: ${existingBinding.product?.sku}`);
        }
      }
      
      // A. Core modification operations on root product document item node
      await tx.product.update({
        where: { inflowId },
        data: {
          name: name.trim(),
          slug: slug.trim(),
          description: description?.trim() || null,
          itemType,
          brandId: brandId || null,
          categoryId: categoryId || null,
          autoAssemble: !!autoAssemble,
          isActive: !!isActive,
          isManufacturable: !!isManufacturable,
          includeQuantityBuildable: !!includeQuantityBuildable,
          trackExpiry: !!trackExpiry, 
          trackLots: !!trackLots, 
          trackSerials: !!trackSerials,
          shelfLifeDays: Number(shelfLifeDays) || 0, 
          sellBeforeExpiryDays: Number(sellBeforeExpiryDays) || 0, 
          expiryNotificationDays: Number(expiryNotificationDays) || 0,
          weight: Number(weight) || 0, 
          width: Number(width) || 0, 
          height: Number(height) || 0, 
          length: Number(length) || 0,
          originCountry: originCountry?.trim() || null,
          hsTariffNumber: hsTariffNumber?.trim() || null,
          remarks: remarks?.trim() || null,
          standardUomName: standardUomName.trim().toUpperCase(),
        }
      });

      // 🎯 ADDED: Reconcile Variant Group Selection Bindings Matrix
      if (productGroupId && variantSignature) {
        // 1. Find if this specific product already has a variant row elsewhere
        const currentVariantRecord = await tx.productVariant.findUnique({
          where: { productId: inflowId }
        });

        // 2. Look up the destination slot row that was pre-generated by the group matrix
        const targetSlotRecord = await tx.productVariant.findUnique({
          where: {
            productGroupId_signature: {
              productGroupId,
              signature: variantSignature
            }
          }
        });

        if (targetSlotRecord) {
          // If the target slot is currently assigned to a placeholder product or another product,
          // and our safety check above didn't trip, we can overwrite or safe-delete the placeholder item
          if (targetSlotRecord.productId && targetSlotRecord.productId !== inflowId) {
            const placeholderProductId = targetSlotRecord.productId;
            
            // Wipe out the target variant row so we don't break unique constraints when shifting
            await tx.productVariant.delete({ where: { id: targetSlotRecord.id } });
            
            // Clean up the orphaned placeholder product record from the DB completely
            await tx.product.deleteMany({ where: { inflowId: placeholderProductId } });
          }
        }

        // 3. Perform the safe transition
        if (currentVariantRecord) {
          // Update the product's existing row to point to the new group and signature location
          await tx.productVariant.update({
            where: { id: currentVariantRecord.id },
            data: {
              productGroupId: productGroupId,
              signature: variantSignature,
              isActive: true
            }
          });
        } else {
          // The product was standalone before, create a new variant record for it
          await tx.productVariant.create({
            data: {
              inflowId: crypto.randomUUID().toLowerCase(),
              productGroupId: productGroupId,
              productId: inflowId,
              signature: variantSignature,
              defaultPrice: 0.00,
              isActive: true
            }
          });
        }
      } else {
        // Unlink variant structure cleanly if group drop-down is set to standalone/empty
        const currentVariantRecord = await tx.productVariant.findUnique({
          where: { productId: inflowId }
        });

        if (currentVariantRecord) {
          await tx.productVariant.delete({ where: { id: currentVariantRecord.id } });
        }
      }

      // B. Reconcile Purchasing UOM Configuration (1:1 Relation mapping node)
      if (purchasingUomId) {
        await tx.productUom.upsert({
          where: { productId: inflowId },
          update: {
            uomId: purchasingUomId, // 🟢 FIXED: Points to uomId foreign key relation instead of .name string
            standardQuantity: Number(purchasingUom.standardQuantity) || 1,
            uomQuantity: Number(purchasingUom.uomQuantity) || 1,
          },
          create: {
            productId: inflowId,
            uomId: purchasingUomId, // 🟢 FIXED
            standardQuantity: Number(purchasingUom.standardQuantity) || 1,
            uomQuantity: Number(purchasingUom.uomQuantity) || 1,
          },
        });
      } else {
        // Safe fall-through drop protection if purchasing matrix is completely cleared out
        await tx.productUom.deleteMany({ where: { productId: inflowId } });
      }

      // C. Reconcile Sales Channels UOM Configuration (1:1 Relation mapping node)
      if (salesUomId) {
        await tx.productSalesUom.upsert({
          where: { productId: inflowId },
          update: {
            uomId: salesUomId, // 🟢 FIXED: Points to uomId foreign key relation instead of .name string
            standardQuantity: Number(salesUom.standardQuantity) || 1,
            uomQuantity: Number(salesUom.uomQuantity) || 1,
          },
          create: {
            productId: inflowId,
            uomId: salesUomId, // 🟢 FIXED
            standardQuantity: Number(salesUom.standardQuantity) || 1,
            uomQuantity: Number(salesUom.uomQuantity) || 1,
          },
        });
      } else {
        // Safe fall-through drop protection if sales channels matrix is completely cleared out
        await tx.productSalesUom.deleteMany({ where: { productId: inflowId } });
      }

      // D. Reconcile 1:Many nested barcode collections array
      await tx.productBarcode.deleteMany({ where: { productId: inflowId } });
      const validBarcodes = barcodes.filter((b: any) => b?.barcode?.trim());
      if (validBarcodes.length > 0) {
        await tx.productBarcode.createMany({
          data: validBarcodes.map((b: any, index: number) => ({
            inflowId: crypto.randomUUID().toString(),
            productId: inflowId,
            barcode: b.barcode.trim(),
            lineNum: index + 1,
          }))
        });
      }

      // E. Reconcile 1:Many nested image asset paths array
      await tx.productImage.deleteMany({ where: { productId: inflowId } });
      const validImages = images.filter((img: any) => img?.originalUrl?.trim());
      if (validImages.length > 0) {
        await tx.productImage.createMany({
          data: validImages.map((img: any, positionIndex: number) => ({
            inflowId: crypto.randomUUID().toString(),
            productId: inflowId,
            position: positionIndex,
            originalUrl: img.originalUrl.trim(),
            largeUrl: img.originalUrl.trim(),
            mediumUrl: img.originalUrl.trim(),
            thumbUrl: img.originalUrl.trim(),
          }))
        });
      }

      return tx.product.findUnique({ where: { inflowId } });
    });

    return NextResponse.json(updatedCatalogEntity, { status: 200 });
  } catch (error: any) {
    console.error("Product modification pipeline failure:", error);
    return NextResponse.json(
      { error: "Internal Database modification transaction process crashed.", details: error.message }, 
      { status: 500 }
    );
  }
}


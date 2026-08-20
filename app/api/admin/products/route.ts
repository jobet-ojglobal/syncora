// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genUniqueSlug } from "@/helpers/genUniqueSlug";
import { Prisma, ProductType } from "@/generated/prisma/client";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { WebhookService } from "@/services/webhook.service";
import { UI_TO_API_ITEM_TYPE } from "@/types/local-location.type";
import { BrandService } from "@/services/brand.service";
import { toJsonInput } from "@/lib/inflow/services/helpers";
import { InflowCustomFields } from "@/lib/inflow/types";

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

    const isCloudSyncedParam = searchParams.get("isCloudSynced");
    const isLocalSyncedParam = searchParams.get("isLocalSynced");

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

    // Cloud Sync Filter
    if (isCloudSyncedParam === "true") {
      whereClause.isCloudSynced = true;
    } else if (isCloudSyncedParam === "false") {
      whereClause.isCloudSynced = false;
    }

    // Local Sync Filter
    if (isLocalSyncedParam === "true") {
      whereClause.isLocalSynced = true;
    } else if (isLocalSyncedParam === "false") {
      whereClause.isLocalSynced = false;
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
    if (sortBy === "sku" || sortBy === "name" || sortBy === "createdAt") {
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
        isCloudSynced: prod.isCloudSynced,
        isLocalSynced: prod.isLocalSynced,
        itemType: prod.itemType || "Stock",
        isActive: prod.isActive,
        trackExpiry: prod.trackExpiry,
        trackLots: prod.trackLots,
        trackSerials: prod.trackSerials,
        brandName: prod.brand?.name || "Generic / White-label",
        categoryName: prod.category?.name || "Unassigned Dept",
        thumbnail: prod.images[0]?.originalUrl || prod.images[0]?.thumbUrl || null,
        barcodesCount: prod.barcodes.length,
        primaryBarcode: prod.barcodes[0]?.barcode || null,
        purchasingUomText: prod.purchasingUom && purchasingCode
          ? `${purchasingCode} (${Number(prod.purchasingUom.standardQuantity)}:${Number(prod.purchasingUom.uomQuantity)})`
          : "Not Set",
        salesUomText: prod.salesUom && salesCode
          ? `${salesCode} (${Number(prod.salesUom.standardQuantity)}:${Number(prod.salesUom.uomQuantity)})`
          : "Not Set",
        createdAt: prod.createdAt
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
      images = [],
      prices = [],
      customFields,
      tags = [], 
      features = [],
      initialCost
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

    // 🎯 Reconcile nested 1:Many pricing tier catalog matrix (Option B - Sync-Friendly)
    const validPrices = prices.filter((p: any) => p?.pricingSchemeId && p?.unitPrice !== undefined);
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

      // 1. Filter and clean the incoming barcodes list first
      const incomingBarcodes = (barcodes || [])
        .filter((b: any) => b?.barcode?.trim())
        .map((b: any) => b.barcode.trim());

      let barcodesToCreate: { inflowId: string; barcode: string; lineNum: number }[] = [];

      if (incomingBarcodes.length > 0) {
        // 2. Query the DB to check which of these barcodes already exist globally
        const existingBarcodes = await tx.productBarcode.findMany({
          where: {
            barcode: { in: incomingBarcodes }
          },
          select: { barcode: true }
        });

        const existingSet = new Set(existingBarcodes.map((eb) => eb.barcode));

        // 3. Keep only the ones that don't exist in the database
        barcodesToCreate = incomingBarcodes
          .filter((barcode: string) => !existingSet.has(barcode))
          .map((barcode: string, index: number) => ({
            inflowId: crypto.randomUUID().toString(),
            barcode,
            lineNum: index + 1, // Keep sequential indexing clean
          }));
      }

      

      // A. Create root product document item node
      const newProduct = await tx.product.create({
        data: {
          inflowId: computedInflowId,
          sku: sku.trim(),
          name: name.trim(),
          slug: slug.trim(),
          description: description?.trim() || null,
          itemType: itemType as ProductType || null,
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
          customFields: toJsonInput(customFields),

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

          // 🪐 Store incoming cost valuation directly
          cost: typeof initialCost === "number" ? {
            create: {
              inflowId: crypto.randomUUID().toLowerCase(),
              cost: new Prisma.Decimal(initialCost)
            }
          } : undefined,

          // 🪐 Iterating through incoming pricing configurations directly
          prices: {
            create: validPrices.map((p: any) => ({
              inflowId: crypto.randomUUID().toLowerCase(),
              pricingSchemeId: p.pricingSchemeId,
              priceType: p.priceType || "FixedPrice",
              unitPrice: new Prisma.Decimal(p.unitPrice || 0),
              fixedMarkup: new Prisma.Decimal(p.fixedMarkup || 0)
            }))
          },

          // 🪐 Use the filtered unique barcodes list
          barcodes: barcodesToCreate.length > 0 ? {
            create: barcodesToCreate
          } : undefined,

          images: images.length > 0 ? {
            create: images
              .filter((img: any) => img?.originalUrl?.trim())
              .map((img: any, positionIndex: number) => ({
                inflowId: crypto.randomUUID().toString(),
                position: positionIndex,
                originalUrl: img.originalUrl.trim(),
                largeUrl: img.largeUrl.trim(),
                mediumUrl: img.mediumUrl.trim(),
                thumbUrl: img.thumbUrl.trim(),
              }))
          } : undefined
        },
        include: {
          purchasingUom: { include: { uom: true }},
          salesUom: { include: { uom: true }},
          cost: true,
          prices: true,
          barcodes: true,
          images: true,
          brand: true
        }
      });

      // STEP B: Handle Features Mapping (Safe execution after product exists)
      for (const feat of features) {
        if (!feat?.key?.trim() || !feat?.value?.trim()) continue;
        
        const key = feat.key.trim();
        const value = feat.value.trim();

        const dbFeature = await tx.feature.upsert({
          where: { name: key },
          update: {},
          create: { name: key }
        });

        const dbFeatureValue = await tx.featureValue.upsert({
          where: { featureId_value: { featureId: dbFeature.id, value } },
          update: {},
          create: { featureId: dbFeature.id, value }
        });

        await tx.productFeature.create({
          data: {
            productId: newProduct.inflowId,
            featureId: dbFeature.id,
            featureValueId: dbFeatureValue.id
          }
        });
      }

      // STEP C: Handle Tags Mapping
      for (const tagStr of tags) {
        if (typeof tagStr !== "string" || !tagStr.trim()) continue;
        
        const cleanTag = tagStr.trim();

        const dbTag = await tx.tag.upsert({
          where: { name: cleanTag },
          update: {},
          create: { name: cleanTag }
        });

        await tx.productTag.create({
          data: {
            productId: newProduct.inflowId,
            tagId: dbTag.id
          }
        });
      }

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

      let setCategoryId: string | null = newProduct.categoryId;

      if(!newProduct.categoryId) {
        const defaultCategory = await tx.category.findFirst({
          where: { isDefault: true }
        });
        setCategoryId = defaultCategory?.inflowId || null;
      } 

      const newCustomFields: InflowCustomFields = {};
      const brandCustomName = "custom1";

      const brandName = newProduct.brand?.name;
      if (brandName) {
        if (brandCustomName) {
          newCustomFields[brandCustomName as keyof InflowCustomFields] = brandName;
        } else {
          newCustomFields.custom1 = brandName;
        }
      }

      const inflowPayload = {
        cloudId: newProduct.inflowId,
        sku: newProduct.sku,
        name: newProduct.name,
        slug: newProduct.slug,
        description: newProduct.description,
        itemType: newProduct.itemType,
        brandId: newProduct.brandId,
        categoryId: setCategoryId,
        autoAssemble: newProduct.autoAssemble,
        isActive: newProduct.isActive,
        isManufacturable: newProduct.isManufacturable,
        includeQuantityBuildable: newProduct.includeQuantityBuildable,
        standardUomName: newProduct.standardUomName,
        trackExpiry: newProduct.trackExpiry,
        trackLots: newProduct.trackLots,
        trackSerials: newProduct.trackSerials,
        shelfLifeDays: newProduct.shelfLifeDays,
        sellBeforeExpiryDays: newProduct.sellBeforeExpiryDays,
        expiryNotificationDays: newProduct.expiryNotificationDays,
        weight: newProduct.weight?.toString() || null,
        width: newProduct.width?.toString() || null,
        height: newProduct.height?.toString() || null,
        length: newProduct.length?.toString() || null,
        originCountry: newProduct.originCountry,
        hsTariffNumber: newProduct.hsTariffNumber,
        remarks: newProduct.remarks,
        customFields: newCustomFields,

        defaultImageId: null,
        
        lastModifiedById: null,
        lastModifiedDateTime: null,
        lastVendorId: null,

        totalQuantityOnHand: 20,

        salesUom: {
          name: newProduct.salesUom?.uom.name,
          conversion: {
            standardQuantity: newProduct.salesUom?.standardQuantity,
            uomQuantity: newProduct.salesUom?.uomQuantity
          }
        },
        
        purchasingUom: {
          name: newProduct.purchasingUom?.uom.name,
          conversion: {
            standardQuantity: newProduct.purchasingUom?.standardQuantity,
            uomQuantity: newProduct.purchasingUom?.uomQuantity
          }
        },

        // Subordinate Embedded Framework Elements
        cost: newProduct.cost ? {
          productCostId: newProduct.cost.inflowId,
          cost: newProduct.cost.cost.toString()
        } : null,

        prices: newProduct.prices.map(p => ({
          productPriceId: p.inflowId,
          pricingSchemeId: p.pricingSchemeId,
          priceType: p.priceType,
          unitPrice: p.unitPrice?.toString() || "0",
          fixedMarkup: p.fixedMarkup?.toString() || "0"
        })),

        productBarcodes: newProduct.barcodes.map(b => ({
          productBarcodeId: b.inflowId,
          barcode: b.barcode,
          lineNum: b.lineNum
        })),

        images: newProduct.images.map(img => ({
          imageId: img.inflowId,
          position: img.position,
          originalUrl: img.originalUrl,
          largeUrl: img.largeUrl,
          mediumUrl: img.mediumUrl,
          thumbUrl: img.thumbUrl
        })),
      };

      return { databaseRecord: newProduct, inflowPayload };
    });

    const { cloudId, ...cleanInflowPayload } = outputTransaction.inflowPayload;

    // ==========================================
    // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
    // ==========================================
    const validCloudWebhook = await WebhookService.getCloudWebhookURL("product.updated");
    if (validCloudWebhook) {
      await getMidSyncQueue().add(
        "product_cloudsync_job",
        {
          source: "PRODUCT_UPSERT_CLOUD",
          model: "Product",
          payload: cleanInflowPayload,
          timestamp: new Date().toISOString(),
        },
        { 
          attempts: 3, 
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true
        }
      );
    }

    // ==========================================
    // 📍 STEP 2: BROADCAST LOCAL SYNC JOBS
    // ==========================================
    const validWebhooks = await WebhookService.getLocationWebhookURLs("productLocal");

    const pricingSchemesInPayload = cleanInflowPayload.prices.map(p => p.pricingSchemeId);
      const pricesPayload = cleanInflowPayload.prices.map(p => p.productPriceId);
      const barcodesPayload = cleanInflowPayload.productBarcodes.map(p => p.productBarcodeId);
      
      const itemTypeNumber = UI_TO_API_ITEM_TYPE[cleanInflowPayload.itemType || "Stock"] ?? 0;

      const brand = await BrandService.getBasicBrand(cleanInflowPayload.brandId || "");
      
      const [
        existingCategoryMappings,
        existingProductCostMaps,
        existingPricesMaps,
        existingPricingMaps,
        existingBarcodeMaps,
        existingImagesMaps
      ] = await Promise.all([
        prisma.categoryLocationMap.findMany({ where: { categoryId: cloudId }, select: { locationId: true, localId: true } }),
        prisma.productCostLocationMap.findMany({ where: { productCostId: cleanInflowPayload.cost?.productCostId }, select: { productCostId: true, locationId: true, localId: true } }),
        prisma.productPriceLocationMap.findMany({
          where: { productPriceId: { in: pricesPayload } },
          select: { productPriceId: true, locationId: true, localId: true }
        }),
        prisma.pricingSchemeLocationMap.findMany({
          where: { pricingSchemeId: { in: pricingSchemesInPayload } },
          select: { pricingSchemeId: true, locationId: true, localId: true }
        }),
        prisma.productBarcodeLocationMap.findMany({
          where: { productBarcodeId: { in: barcodesPayload } },
          select: { productBarcodeId: true, locationId: true, localId: true }
        }),
        prisma.productImageLocationMap.findMany({
          // ⚠️ Fixed structural bug: originally queried against barcodesPayload instead of image ids
          where: { productImageId: { in: cleanInflowPayload.images.map(img => img.imageId) } },
          select: { productImageId: true, locationId: true, localId: true }
        }),
      ]);

    if (validWebhooks.length > 0) {
      // Gather relevant pricing scheme identity mappings concurrently to assign local references
      const pricingSchemesInPayload = cleanInflowPayload.prices.map(p => p.pricingSchemeId);
      const existingPricingMaps = await prisma.pricingSchemeLocationMap.findMany({
        where: { pricingSchemeId: { in: pricingSchemesInPayload } },
        select: { pricingSchemeId: true, locationId: true, localId: true }
      });

      const jobsToQueue = validWebhooks
        .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
        .map((webhook) => {
          const costMatch = existingProductCostMaps.find(m => m.locationId === webhook.locationId);
          const categoryMatch = existingCategoryMappings.find(m => m.locationId === webhook.locationId);

          // Extract the primary barcode string if one exists in the array
          const primaryBarcode = cleanInflowPayload.productBarcodes[0]?.barcode || "";
          delete (cleanInflowPayload as any).images;
          // const imageMatch = existingImagesMaps.find(m =>  m.productImageId === cleanInflowPayload.images[0].imageId && m.locationId === webhook.locationId);

          return {
            name: "product_localsync_job",
            
            data: {
              source: "PRODUCT_UPSERT_LOCAL",
              model: "Product",
              payload: {
                ...cleanInflowPayload,
                lastModifiedById: 100,
                productId: cloudId,
                localId: null, 

                barcode: primaryBarcode,
                categoryId: categoryMatch?.localId || null,

                uom: cleanInflowPayload.standardUomName || "",
                itemType: itemTypeNumber,

                dimensions: {
                  length: cleanInflowPayload.length,
                  width: cleanInflowPayload.width,
                  height: cleanInflowPayload.height,
                  weight: cleanInflowPayload.weight,
                },

                salesUom: {
                  name: cleanInflowPayload.salesUom.name || "",
                  ratioStd: cleanInflowPayload.salesUom.conversion.standardQuantity,
                  ratio: cleanInflowPayload.salesUom.conversion.uomQuantity
                },

                purchaseUom: {
                  name: cleanInflowPayload.purchasingUom.name || "",
                  ratioStd: cleanInflowPayload.purchasingUom.conversion.standardQuantity,
                  ratio: cleanInflowPayload.purchasingUom.conversion.uomQuantity
                },

                prices: cleanInflowPayload.prices.map(p => {
                  const match = existingPricingMaps.find(
                    m => m.pricingSchemeId === p.pricingSchemeId && m.locationId === webhook.locationId
                  );
                  return {
                    ...p,
                    pricingSchemeId: match ? match.localId : null, // Resolves to the specific native integer map ID
                    localId: null
                  };
                }),

                customFields: {
                  custom7: brand?.name
                }, 
              },
              timestamp: new Date().toISOString(),
              location: {
                inflowId: webhook.locationId,
                url: webhook.location.url,
                name: webhook.location.name
              }
            },
            opts: { 
              attempts: 3, 
              backoff: { type: "exponential", delay: 2000 },
              removeOnComplete: true
            }
          };
        });

      if (jobsToQueue.length > 0) {
        await getMidSyncQueue().addBulk(jobsToQueue);
      }
    }

    return NextResponse.json(outputTransaction.databaseRecord, { status: 201 });
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
      inflowId, name, sku, description, itemType, brandId, categoryId,
      autoAssemble, isActive, isManufacturable, includeQuantityBuildable,
      trackExpiry, trackLots, trackSerials, shelfLifeDays, sellBeforeExpiryDays,
      expiryNotificationDays, weight, width, height, length, originCountry,
      hsTariffNumber, remarks, standardUomName, purchasingUom, salesUom, 
      productGroupId,    
      variantSignature,
      barcodes = [], 
      images = [],
      prices = [],
      initialCost,
      customFields,
      tags = [], 
      features = [],
    } = body;

    const lastModifiedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

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
    const result = await prisma.$transaction(async (tx) => {

      // 🎯 Core Matrix Safety Guardrail Check
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
          sku,
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
          customFields: toJsonInput(customFields)
        }
      });

      // B. Reconcile Tags Mapping Matrix
      const activeTagIds: string[] = [];
      for (const tagStr of tags) {
        if (typeof tagStr !== "string" || !tagStr.trim()) continue;
        const cleanTag = tagStr.trim();

        const dbTag = await tx.tag.upsert({
          where: { name: cleanTag },
          update: {},
          create: { name: cleanTag }
        });
        activeTagIds.push(dbTag.id);
      }

      // Delete associations no longer present in payload
      await tx.productTag.deleteMany({
        where: {
          productId: inflowId,
          NOT: { tagId: { in: activeTagIds } }
        }
      });

      // Create new tag bindings missing on current product
      for (const tagId of activeTagIds) {
        await tx.productTag.upsert({
          where: {
            productId_tagId: { productId: inflowId, tagId }
          },
          update: {},
          create: { productId: inflowId, tagId }
        });
      }

      // C. Reconcile Features & Values Mapping Matrix
      const activeFeatureValuePairs: Array<{ featureId: string; featureValueId: string }> = [];
      for (const feat of features) {
        if (!feat?.key?.trim() || !feat?.value?.trim()) continue;
        const key = feat.key.trim();
        const value = feat.value.trim();

        const dbFeature = await tx.feature.upsert({
          where: { name: key },
          update: {},
          create: { name: key }
        });

        const dbFeatureValue = await tx.featureValue.upsert({
          where: { featureId_value: { featureId: dbFeature.id, value } },
          update: {},
          create: { featureId: dbFeature.id, value }
        });

        activeFeatureValuePairs.push({
          featureId: dbFeature.id,
          featureValueId: dbFeatureValue.id
        });
      }

      // Re-bind features: Wipe existing join links for product and re-insert fresh state
      await tx.productFeature.deleteMany({
        where: { productId: inflowId }
      });

      for (const pair of activeFeatureValuePairs) {
        await tx.productFeature.create({
          data: {
            productId: inflowId,
            featureId: pair.featureId,
            featureValueId: pair.featureValueId
          }
        });
      }

      // D. Reconcile Product Base Cost (1:1 Relation mapping node)
      if (typeof initialCost !== 'undefined' && initialCost !== null) {
        await tx.productCost.upsert({
          where: { productId: inflowId },
          update: {
            cost: Number(initialCost) || 0.00
          },
          create: {
            inflowId: crypto.randomUUID().toLowerCase(),
            productId: inflowId,
            cost: Number(initialCost) || 0.00
          }
        });
      }

      // E. Reconcile nested 1:Many pricing tier catalog matrix
      const validPrices = prices.filter((p: any) => p?.pricingSchemeId && p?.unitPrice !== undefined);
      const incomingPriceInflowIds = validPrices.map((p: any) => p.inflowId).filter(Boolean) as string[];

      await tx.productPrice.deleteMany({
        where: {
          productId: inflowId,
          NOT: { inflowId: { in: incomingPriceInflowIds } }
        }
      });

      if (validPrices.length > 0) {
        for (const p of validPrices) {
          const targetInflowId = p.inflowId || crypto.randomUUID().toString();

          await tx.productPrice.upsert({
            where: { inflowId: targetInflowId },
            create: {
              inflowId: targetInflowId,
              productId: inflowId,
              pricingSchemeId: p.pricingSchemeId,
              priceType: p.priceType || "FixedPrice",
              unitPrice: Number(p.unitPrice) || 0.00,
              fixedMarkup: Number(p.fixedMarkup) || 0.00,
            },
            update: {
              pricingSchemeId: p.pricingSchemeId,
              priceType: p.priceType || "FixedPrice",
              unitPrice: Number(p.unitPrice) || 0.00,
              fixedMarkup: Number(p.fixedMarkup) || 0.00,
            }
          });
        }
      }

      // F. Reconcile Variant Group Selection Bindings Matrix
      if (productGroupId && variantSignature) {
        const currentVariantRecord = await tx.productVariant.findUnique({
          where: { productId: inflowId }
        });

        const targetSlotRecord = await tx.productVariant.findUnique({
          where: {
            productGroupId_signature: { productGroupId, signature: variantSignature }
          }
        });

        if (targetSlotRecord && targetSlotRecord.productId && targetSlotRecord.productId !== inflowId) {
          const placeholderProductId = targetSlotRecord.productId;
          await tx.productVariant.delete({ where: { id: targetSlotRecord.id } });
          await tx.product.deleteMany({ where: { inflowId: placeholderProductId } });
        }

        if (currentVariantRecord) {
          await tx.productVariant.update({
            where: { id: currentVariantRecord.id },
            data: {
              productGroupId,
              signature: variantSignature,
              isActive: true
            }
          });
        } else {
          await tx.productVariant.create({
            data: {
              inflowId: crypto.randomUUID().toLowerCase(),
              productGroupId,
              productId: inflowId,
              signature: variantSignature,
              defaultPrice: 0.00,
              isActive: true
            }
          });
        }
      } else {
        const currentVariantRecord = await tx.productVariant.findUnique({
          where: { productId: inflowId }
        });

        if (currentVariantRecord) {
          await tx.productVariant.delete({ where: { id: currentVariantRecord.id } });
        }
      }

      // G. Reconcile Purchasing UOM Configuration
      if (purchasingUomId) {
        await tx.productUom.upsert({
          where: { productId: inflowId },
          update: {
            uomId: purchasingUomId,
            standardQuantity: Number(purchasingUom.standardQuantity) || 1,
            uomQuantity: Number(purchasingUom.uomQuantity) || 1,
          },
          create: {
            productId: inflowId,
            uomId: purchasingUomId,
            standardQuantity: Number(purchasingUom.standardQuantity) || 1,
            uomQuantity: Number(purchasingUom.uomQuantity) || 1,
          },
        });
      } else {
        await tx.productUom.deleteMany({ where: { productId: inflowId } });
      }

      // H. Reconcile Sales Channels UOM Configuration
      if (salesUomId) {
        await tx.productSalesUom.upsert({
          where: { productId: inflowId },
          update: {
            uomId: salesUomId,
            standardQuantity: Number(salesUom.standardQuantity) || 1,
            uomQuantity: Number(salesUom.uomQuantity) || 1,
          },
          create: {
            productId: inflowId,
            uomId: salesUomId,
            standardQuantity: Number(salesUom.standardQuantity) || 1,
            uomQuantity: Number(salesUom.uomQuantity) || 1,
          },
        });
      } else {
        await tx.productSalesUom.deleteMany({ where: { productId: inflowId } });
      }

      // I. Reconcile Barcodes Matrix
      const validBarcodes = barcodes.filter((b: any) => b?.barcode?.trim());
      const incomingBarcodes = validBarcodes.map((b: any) => b.barcode.trim());

      // 1. Delete barcodes no longer present in the payload
      await tx.productBarcode.deleteMany({
        where: {
          productId: inflowId,
          NOT: { barcode: { in: incomingBarcodes } }
        }
      });

      // 2. Insert missing barcodes
      if (validBarcodes.length > 0) {
        const existingProductBarcodes = await tx.productBarcode.findMany({
          where: {
            productId: inflowId,
            barcode: { in: incomingBarcodes }
          },
          select: { barcode: true }
        });

        const existingSet = new Set(existingProductBarcodes.map(eb => eb.barcode));
        const missingBarcodes = validBarcodes.filter((b: any) => !existingSet.has(b.barcode.trim()));

        if (missingBarcodes.length > 0) {
          const maxLineNumAggregate = await tx.productBarcode.aggregate({
            where: { productId: inflowId },
            _max: { lineNum: true }
          });
          const currentMaxLineNum = maxLineNumAggregate._max.lineNum ?? 0;

          await tx.productBarcode.createMany({
            data: missingBarcodes.map((b: any, index: number) => ({
              inflowId: b.inflowId || crypto.randomUUID().toString(),
              productId: inflowId,
              barcode: b.barcode.trim(),
              lineNum: currentMaxLineNum + index + 1,
            }))
          });
        }
      }

      // J. Reconcile Images Matrix
      const validImages = images.filter((img: any) => img?.originalUrl?.trim());
      const incomingImageIds = validImages.map((p: any) => p.id).filter(Boolean) as string[];

      await tx.productImage.deleteMany({
        where: {
          productId: inflowId,
          NOT: { id: { in: incomingImageIds } }
        }
      });

      if (validImages.length > 0) {
        let positionIndex = 0;
        for (const img of validImages) {
          const targetInflowId = img.id || crypto.randomUUID().toString();

          await tx.productImage.upsert({
            where: { id: targetInflowId },
            create: {
              inflowId: crypto.randomUUID().toString(),
              productId: inflowId,
              position: positionIndex,
              originalUrl: img.originalUrl.trim(),
              largeUrl: img.largeUrl ? img.largeUrl.trim() : undefined,
              mediumUrl: img.mediumUrl ? img.mediumUrl.trim() : undefined,
              thumbUrl: img.thumbUrl ? img.thumbUrl.trim() : undefined,
            },
            update: {
              productId: inflowId,
              position: positionIndex,
              originalUrl: img.originalUrl.trim(),
              largeUrl: img.largeUrl ? img.largeUrl.trim() : undefined,
              mediumUrl: img.mediumUrl ? img.mediumUrl.trim() : undefined,
              thumbUrl: img.thumbUrl ? img.thumbUrl.trim() : undefined,
            }
          });
          positionIndex++;
        }
      }

      const updatedProduct = await tx.product.findUnique({ 
        where: { inflowId },
        include: { 
          purchasingUom: { include: { uom: true }},
          salesUom: { include: { uom: true }},
          cost: true,
          prices: true,
          barcodes: true,
          images: true,
          brand: true
        } 
      });

      if(!updatedProduct) return { databaseRecord: null, inflowPayload: null }

      let setCategoryId: string | null = updatedProduct.categoryId;

      if(!updatedProduct.categoryId) {
        const defaultCategory = await tx.category.findFirst({
          where: { isDefault: true }
        });
        setCategoryId = defaultCategory?.inflowId || null;
      } 

      const newCustomFields: InflowCustomFields = {};
      const brandCustomName = "custom1";

      const brandName = updatedProduct.brand?.name;
      if (brandName) {
        if (brandCustomName) {
          newCustomFields[brandCustomName as keyof InflowCustomFields] = brandName;
        } else {
          newCustomFields.custom1 = brandName;
        }
      }

      // C. Extract structural object tree configuration to safely handle outbound pipeline tasks
      const inflowPayload = {
        cloudId: updatedProduct.inflowId,
        sku: updatedProduct.sku,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        description: updatedProduct.description,
        itemType: updatedProduct.itemType,
        brandId: updatedProduct.brandId,
        categoryId: setCategoryId,
        autoAssemble: updatedProduct.autoAssemble,
        isActive: updatedProduct.isActive,
        isManufacturable: updatedProduct.isManufacturable,
        includeQuantityBuildable: updatedProduct.includeQuantityBuildable,
        standardUomName: updatedProduct.standardUomName,
        trackExpiry: updatedProduct.trackExpiry,
        trackLots: updatedProduct.trackLots,
        trackSerials: updatedProduct.trackSerials,
        shelfLifeDays: null, // updatedProduct.shelfLifeDays,
        sellBeforeExpiryDays: null, // updatedProduct.sellBeforeExpiryDays,
        expiryNotificationDays: null, // updatedProduct.expiryNotificationDays,
        weight: updatedProduct.weight?.toString() || null,
        width: updatedProduct.width?.toString() || null,
        height: updatedProduct.height?.toString() || null,
        length: updatedProduct.length?.toString() || null,
        originCountry: updatedProduct.originCountry,
        hsTariffNumber: updatedProduct.hsTariffNumber,
        remarks: updatedProduct.remarks,
        customFields: newCustomFields,

        defaultImageId: null,
        
        lastModifiedById,
        lastModifiedDateTime: new Date().toISOString(),
        lastVendorId: null,

        totalQuantityOnHand: 20,

        salesUom: {
          name: updatedProduct.salesUom?.uom.name,
          conversion: {
            standardQuantity: updatedProduct.salesUom?.standardQuantity,
            uomQuantity: updatedProduct.salesUom?.uomQuantity
          }
        },
        purchasingUom: {
          name: updatedProduct.purchasingUom?.uom.name,
          conversion: {
            standardQuantity: updatedProduct.purchasingUom?.standardQuantity,
            uomQuantity: updatedProduct.purchasingUom?.uomQuantity
          }
        },

        // Subordinate Embedded Framework Elements
        cost: updatedProduct.cost ? {
          productCostId: updatedProduct.cost.inflowId,
          cost: updatedProduct.cost.cost.toString()
        } : null,

        prices: updatedProduct.prices.map(p => ({
          productPriceId: p.inflowId,
          pricingSchemeId: p.pricingSchemeId,
          priceType: p.priceType,
          unitPrice: p.unitPrice?.toString() || "0",
          fixedMarkup: p.fixedMarkup?.toString() || "0",
        })),

        productBarcodes: updatedProduct.barcodes.map(b => ({
          productBarcodeId: b.inflowId,
          barcode: b.barcode,
          lineNum: b.lineNum
        })),

        images: updatedProduct.images.map(img => ({
          imageId: img.inflowId,
          position: img.position,
          originalUrl: img.originalUrl,
          largeUrl: img.largeUrl,
          mediumUrl: img.mediumUrl,
          thumbUrl: img.thumbUrl
        })),
      };

      return { databaseRecord: updatedProduct, inflowPayload };

    });

    if (!result.databaseRecord || !result.inflowPayload) {
      return NextResponse.json({ error: "Failed to assemble customer components." }, { status: 500 });
    }

    const { cloudId, ...cleanInflowPayload } = result.inflowPayload;

    // ==========================================
    // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
    // ==========================================
    const validCloudWebhook = await WebhookService.getCloudWebhookURL("product.updated");
    if (validCloudWebhook) {
      await getMidSyncQueue().add(
        "product_cloudsync_job",
        {
          source: "PRODUCT_UPSERT_CLOUD",
          model: "Product",
          payload: {
            ...cleanInflowPayload,
            productId: cloudId,
          },
          timestamp: new Date().toISOString(),
        },
        { 
          attempts: 3, 
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true
        }
      );
    }

    // ==========================================
    // 📍 STEP 2: BROADCAST LOCAL SYNC JOBS
    // ==========================================
    const validWebhooks = await WebhookService.getLocationWebhookURLs("productLocal");

    // if (validWebhooks.length > 0) {
    //   // Gather relevant pricing scheme identity mappings concurrently to assign local references
    //   const pricingSchemesInPayload = cleanInflowPayload.prices.map(p => p.pricingSchemeId);
    //   const pricesPayload = cleanInflowPayload.prices.map(p => p.productPriceId);
    //   const barcodesPayload = cleanInflowPayload.productBarcodes.map(p => p.productBarcodeId);
     
    //   const [
    //     existingMappings,
    //     existingProductCostMaps,
    //     existingPricesMaps,
    //     existingPricingMaps,
    //     existingBarcodeMaps,
    //     existingImagesMaps
    //   ] = await Promise.all([
    //     prisma.productLocationMap.findMany({ where: { productId: cloudId }, select: { locationId: true, localId: true } }),
    //     prisma.productCostLocationMap.findMany({ where: { productCostId: cleanInflowPayload.cost?.productCostId }, select: { productCostId: true, locationId: true, localId: true } }),
    //     prisma.productPriceLocationMap.findMany({
    //       where: { productPriceId: { in: pricesPayload } },
    //       select: { productPriceId: true, locationId: true, localId: true }
    //     }),
    //     prisma.pricingSchemeLocationMap.findMany({
    //       where: { pricingSchemeId: { in: pricingSchemesInPayload } },
    //       select: { pricingSchemeId: true, locationId: true, localId: true }
    //     }),
    //     prisma.productBarcodeLocationMap.findMany({
    //       where: { productBarcodeId: { in: barcodesPayload } },
    //       select: { productBarcodeId: true, locationId: true, localId: true }
    //     }),
    //     prisma.productImageLocationMap.findMany({
    //       where: { productImageId: { in: barcodesPayload } },
    //       select: { productImageId: true, locationId: true, localId: true }
    //     }),
    //   ]);

    //   const jobsToQueue = validWebhooks
    //     .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
    //     .map((webhook) => {
    //       const match = existingMappings.find(m => m.locationId === webhook.locationId);
    //       const costMatch = existingProductCostMaps.find(m => m.locationId === webhook.locationId);

    //       return {
    //         name: "product_localsync_job",
    //         data: {
    //           source: "PRODUCT_UPSERT_LOCAL",
    //           model: "Product",
    //           payload: {
    //             ...cleanInflowPayload,
    //             productId: cloudId,
    //             localId: match?.localId || null, // Signals a clean native database record insert down at the edge

    //             cost: cleanInflowPayload.cost ? {
    //               ...cleanInflowPayload.cost,
    //               localId: costMatch?.localId || null,
    //             } : null,

    //             prices: cleanInflowPayload.prices.map(p => {
    //               const priceMatch = existingPricesMaps.find(m =>  m.productPriceId === p.productPriceId && m.locationId === webhook.locationId);
    //               const pricingMatch = existingPricingMaps.find(
    //                 m => m.pricingSchemeId === p.pricingSchemeId && m.locationId === webhook.locationId
    //               );
    //               return {
    //                 ...p,
    //                 pricingSchemeId: pricingMatch?.localId || null, // Resolves to the specific native integer map ID
    //                 localId: priceMatch?.localId || null
    //               };
    //             }),

    //             productBarcodes: cleanInflowPayload.productBarcodes.map(b => {
    //               const barcodeMatch = existingBarcodeMaps.find(m =>  m.productBarcodeId === b.productBarcodeId && m.locationId === webhook.locationId);
    //               return {
    //                 ...b,
    //                 localId: barcodeMatch?.localId || null
    //             }}),

    //             images: cleanInflowPayload.images.map(img => {
    //               const imageMatch = existingImagesMaps.find(m =>  m.productImageId === img.imageId && m.locationId === webhook.locationId);
    //               return {
    //               ...img,
    //               localId: imageMatch?.localId || null
    //             }})
    //           },
    //           timestamp: new Date().toISOString(),
    //           location: {
    //             inflowId: webhook.locationId,
    //             url: webhook.location.url,
    //             name: webhook.location.name
    //           }
    //         },
    //         opts: { 
    //           attempts: 3, 
    //           backoff: { type: "exponential", delay: 2000 },
    //           removeOnComplete: true
    //         }
    //       };
    //     });

    //   if (jobsToQueue.length > 0) {
    //     await getMidSyncQueue().addBulk(jobsToQueue);
    //   }
    // }

    if (validWebhooks.length > 0) {
      // Gather relevant pricing scheme identity mappings concurrently to assign local references
      const pricingSchemesInPayload = cleanInflowPayload.prices.map(p => p.pricingSchemeId);
      const pricesPayload = cleanInflowPayload.prices.map(p => p.productPriceId);
      const barcodesPayload = cleanInflowPayload.productBarcodes.map(p => p.productBarcodeId);
      
      const itemTypeNumber = UI_TO_API_ITEM_TYPE[cleanInflowPayload.itemType || "Stock"] ?? 0;

      const brand = await BrandService.getBasicBrand(cleanInflowPayload.brandId || "");
      
      const [
        existingMappings,
        existingCategoryMappings,
        existingProductCostMaps,
        existingPricesMaps,
        existingPricingMaps,
        existingBarcodeMaps,
        existingImagesMaps
      ] = await Promise.all([
        prisma.productLocationMap.findMany({ where: { productId: cloudId }, select: { locationId: true, localId: true } }),
        prisma.categoryLocationMap.findMany({ where: { categoryId: cloudId }, select: { locationId: true, localId: true } }),
        prisma.productCostLocationMap.findMany({ where: { productCostId: cleanInflowPayload.cost?.productCostId }, select: { productCostId: true, locationId: true, localId: true } }),
        prisma.productPriceLocationMap.findMany({
          where: { productPriceId: { in: pricesPayload } },
          select: { productPriceId: true, locationId: true, localId: true }
        }),
        prisma.pricingSchemeLocationMap.findMany({
          where: { pricingSchemeId: { in: pricingSchemesInPayload } },
          select: { pricingSchemeId: true, locationId: true, localId: true }
        }),
        prisma.productBarcodeLocationMap.findMany({
          where: { productBarcodeId: { in: barcodesPayload } },
          select: { productBarcodeId: true, locationId: true, localId: true }
        }),
        prisma.productImageLocationMap.findMany({
          // ⚠️ Fixed structural bug: originally queried against barcodesPayload instead of image ids
          where: { productImageId: { in: cleanInflowPayload.images.map(img => img.imageId) } },
          select: { productImageId: true, locationId: true, localId: true }
        }),
      ]);

      const jobsToQueue = validWebhooks
        .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
        .map((webhook) => {
          const match = existingMappings.find(m => m.locationId === webhook.locationId);
          const costMatch = existingProductCostMaps.find(m => m.locationId === webhook.locationId);
          const categoryMatch = existingCategoryMappings.find(m => m.locationId === webhook.locationId);

          // Extract the primary barcode string if one exists in the array
          const primaryBarcode = cleanInflowPayload.productBarcodes[0]?.barcode || "";

          // Construct the payload strictly formatted to the InflowProduct Interface
          // const inflowProductPayload = {
          //   productId: cloudId,
          //   localId: match?.localId || null,
          //   itemType: itemTypeNumber, // typeof cleanInflowPayload.itemType === "number" ? cleanInflowPayload.itemType :
          //   name: cleanInflowPayload.name || "",
          //   description: cleanInflowPayload.description || "",
          //   remarks: cleanInflowPayload.remarks || "",
          //   barcode: primaryBarcode,
          //   categoryId: categoryMatch?.localId || null,
          //   defaultLocationId: null,
          //   defaultSublocation: null,

          //   reorderPoint: 0,
          //   reorderQuantity: 0,

          //   uom: cleanInflowPayload.standardUomName || "",
          //   masterPackQty: 0,
          //   innerPackQty: 0,

          //   dimensions: {
          //     caseLength: 0,
          //     caseWidth: 0,
          //     caseHeight: 0,
          //     caseWeight: 0,
          //     productLength: cleanInflowPayload.length ? parseFloat(cleanInflowPayload.length) : 0,
          //     productWidth: cleanInflowPayload.width ? parseFloat(cleanInflowPayload.width) : 0,
          //     productHeight: cleanInflowPayload.height ? parseFloat(cleanInflowPayload.height) : 0,
          //     productWeight: cleanInflowPayload.weight ? parseFloat(cleanInflowPayload.weight) : 0
          //   },

          //   customFields: {
          //     custom7: brand?.name
          //   }, 
            
          //   isSellable: true, 
          //   isPurchaseable: true,
          //   isActive: cleanInflowPayload.isActive ?? true,
          //   trackSerials: cleanInflowPayload.trackSerials ?? false,

          //   dateIntroduced: new Date().toISOString(),
          //   dateUpdated: new Date().toISOString(),

          //   lastModifiedById: null,
          //   lastModifiedDttm: null,

          //   // Associates the primary image if exists
          //   pictureFileAttachmentId: null,

          //   salesUom: {
          //     name: cleanInflowPayload.standardUomName || "",
          //     ratioStd: 1,
          //     ratio: 1
          //   },

          //   purchaseUom: {
          //     name: cleanInflowPayload.standardUomName || "",
          //     ratioStd: 1,
          //     ratio: 1
          //   }
          // };

          const imageUrl = cleanInflowPayload.images[0].originalUrl || null;

          return {
            name: "product_localsync_job",
            data: {
              source: "PRODUCT_UPSERT_LOCAL",
              model: "Product",
              payload: {
                ...cleanInflowPayload,
                lastModifiedById: 100,
                productId: cloudId,
                localId: match?.localId || null, 

                barcode: primaryBarcode,
                categoryId: categoryMatch?.localId || null,

                uom: cleanInflowPayload.standardUomName || "",
                itemType: itemTypeNumber,

                dimensions: {
                  length: cleanInflowPayload.length,
                  width: cleanInflowPayload.width,
                  height: cleanInflowPayload.height,
                  weight: cleanInflowPayload.weight,
                },

                salesUom: {
                  name: cleanInflowPayload.salesUom.name || "",
                  ratioStd: cleanInflowPayload.salesUom.conversion.standardQuantity,
                  ratio: cleanInflowPayload.salesUom.conversion.uomQuantity
                },

                purchaseUom: {
                  name: cleanInflowPayload.purchasingUom.name || "",
                  ratioStd: cleanInflowPayload.purchasingUom.conversion.standardQuantity,
                  ratio: cleanInflowPayload.purchasingUom.conversion.uomQuantity
                },

                prices: cleanInflowPayload.prices.map(p => {
                  const match = existingPricingMaps.find(
                    m => m.pricingSchemeId === p.pricingSchemeId && m.locationId === webhook.locationId
                  );
                  return {
                    ...p,
                    pricingSchemeId: match ? match.localId : null, // Resolves to the specific native integer map ID
                    localId: null
                  };
                }),

                // images: cleanInflowPayload.images.map(img => {
                //   const imageMatch = existingImagesMaps.find(m =>  m.productImageId === img.imageId && m.locationId === webhook.locationId);
                //   return {
                //   ...img,
                //   localId: imageMatch?.localId || null
                // }}),

                // imageUrl: null,

                customFields: {
                  custom7: brand?.name
                }, 
              },
              timestamp: new Date().toISOString(),
              location: {
                inflowId: webhook.locationId,
                url: webhook.location.url,
                name: webhook.location.name
              }
            },
            opts: { 
              attempts: 3, 
              backoff: { type: "exponential", delay: 2000 },
              removeOnComplete: true
            }
          };
        });

      if (jobsToQueue.length > 0) {
        await getMidSyncQueue().addBulk(jobsToQueue);
      }
    }

    return NextResponse.json(result.databaseRecord, { status: 200 });
  } catch (error: any) {
    console.error("Product modification pipeline failure:", error);
    return NextResponse.json(
      { error: "Internal Database modification transaction process crashed.", details: error.message }, 
      { status: 500 }
    );
  }
}


 // Keep local sync relationship tracking inside metadata for execution use
              // meta: {
              //   localId: match?.localId || null,
              //   cost: cleanInflowPayload.cost ? {
              //     ...cleanInflowPayload.cost,
              //     localId: costMatch?.localId || null,
              //   } : null,
              //   prices: cleanInflowPayload.prices.map(p => {
              //     const priceMatch = existingPricesMaps.find(m => m.productPriceId === p.productPriceId && m.locationId === webhook.locationId);
              //     const pricingMatch = existingPricingMaps.find(
              //       m => m.pricingSchemeId === p.pricingSchemeId && m.locationId === webhook.locationId
              //     );
              //     return {
              //       ...p,
              //       pricingSchemeId: pricingMatch?.localId || null,
              //       localId: priceMatch?.localId || null
              //     };
              //   }),
              //   productBarcodes: cleanInflowPayload.productBarcodes.map(b => {
              //     const barcodeMatch = existingBarcodeMaps.find(m => m.productBarcodeId === b.productBarcodeId && m.locationId === webhook.locationId);
              //     return {
              //       ...b,
              //       localId: barcodeMatch?.localId || null
              //     };
              //   }),
              //   images: cleanInflowPayload.images.map(img => {
              //     const imageMatch = existingImagesMaps.find(m => m.productImageId === img.imageId && m.locationId === webhook.locationId);
              //     return {
              //       ...img,
              //       localId: imageMatch?.localId || null
              //     };
              //   })
              // },

  // cost: cleanInflowPayload.cost ? {
                //   ...cleanInflowPayload.cost,
                //   localId: costMatch?.localId || null,
                // } : null,

                // prices: cleanInflowPayload.prices.map(p => {
                //   const priceMatch = existingPricesMaps.find(m =>  m.productPriceId === p.productPriceId && m.locationId === webhook.locationId);
                //   const pricingMatch = existingPricingMaps.find(
                //     m => m.pricingSchemeId === p.pricingSchemeId && m.locationId === webhook.locationId
                //   );
                //   return {
                //     ...p,
                //     pricingSchemeId: pricingMatch?.localId || null, // Resolves to the specific native integer map ID
                //     localId: priceMatch?.localId || null
                //   };
                // }),

                // productBarcodes: cleanInflowPayload.productBarcodes.map(b => {
                //   const barcodeMatch = existingBarcodeMaps.find(m =>  m.productBarcodeId === b.productBarcodeId && m.locationId === webhook.locationId);
                //   return {
                //     ...b,
                //     localId: barcodeMatch?.localId || null
                // }}),

// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const {
//       inflowId, name, description, itemType, brandId, categoryId,
//       autoAssemble, isActive, isManufacturable, includeQuantityBuildable,
//       trackExpiry, trackLots, trackSerials, shelfLifeDays, sellBeforeExpiryDays,
//       expiryNotificationDays, weight, width, height, length, originCountry,
//       hsTariffNumber, remarks, standardUomName, purchasingUom, salesUom, 
//       productGroupId,    
//       variantSignature,
//       barcodes = [], 
//       images = []
//     } = body;

//     // 1. Core Validation Constraints Guard Layer
//     if (!inflowId) {
//       return NextResponse.json({ error: "Missing required core identifying target reference pointer." }, { status: 400 });
//     }

//     // 2. Pre-fetch corresponding operational UOM system IDs using Code mapping tokens
//     const codeLookups = Array.from(new Set([
//       purchasingUom?.name,
//       salesUom?.name
//     ].filter(Boolean)));

//     const matchingUoms = await prisma.unitOfMeasure.findMany({
//       where: {
//         code: { in: codeLookups }
//       },
//       select: { id: true, code: true }
//     });

//     const uomMap = Object.fromEntries(matchingUoms.map(u => [u.code, u.id]));

//     const purchasingUomId = purchasingUom?.name ? uomMap[purchasingUom.name] : null;
//     const salesUomId = salesUom?.name ? uomMap[salesUom.name] : null;

//     if ((purchasingUom?.name && !purchasingUomId) || (salesUom?.name && !salesUomId)) {
//       return NextResponse.json({ 
//         error: "Referenced operational Multi-tier calculation metric unit is not registered within system catalogs." 
//       }, { status: 400 });
//     }

//     const slug = await genUniqueSlug(name, prisma.product);

//     // 3. Database Transaction Modification Process Chain
//     const updatedCatalogEntity = await prisma.$transaction(async (tx) => {

//       // 🎯 ADDED: Core Matrix Safety Guardrail Check
//       if (productGroupId && variantSignature) {
//         const existingBinding = await tx.productVariant.findUnique({
//           where: {
//             productGroupId_signature: {
//               productGroupId,
//               signature: variantSignature
//             }
//           },
//           select: {
//             productId: true,
//             product: { select: { sku: true } }
//           }
//         });

//         // Block transaction if the option slot belongs to a different variant instance
//         if (existingBinding && existingBinding.productId && existingBinding.productId !== inflowId) {
//           throw new Error(`The selected matrix variant option slot is already assigned to active SKU: ${existingBinding.product?.sku}`);
//         }
//       }
      
//       // A. Core modification operations on root product document item node
//       await tx.product.update({
//         where: { inflowId },
//         data: {
//           name: name.trim(),
//           slug: slug.trim(),
//           description: description?.trim() || null,
//           itemType,
//           brandId: brandId || null,
//           categoryId: categoryId || null,
//           autoAssemble: !!autoAssemble,
//           isActive: !!isActive,
//           isManufacturable: !!isManufacturable,
//           includeQuantityBuildable: !!includeQuantityBuildable,
//           trackExpiry: !!trackExpiry, 
//           trackLots: !!trackLots, 
//           trackSerials: !!trackSerials,
//           shelfLifeDays: Number(shelfLifeDays) || 0, 
//           sellBeforeExpiryDays: Number(sellBeforeExpiryDays) || 0, 
//           expiryNotificationDays: Number(expiryNotificationDays) || 0,
//           weight: Number(weight) || 0, 
//           width: Number(width) || 0, 
//           height: Number(height) || 0, 
//           length: Number(length) || 0,
//           originCountry: originCountry?.trim() || null,
//           hsTariffNumber: hsTariffNumber?.trim() || null,
//           remarks: remarks?.trim() || null,
//           standardUomName: standardUomName.trim().toUpperCase(),
//         }
//       });

//       // 🎯 ADDED: Reconcile Variant Group Selection Bindings Matrix
//       if (productGroupId && variantSignature) {
//         // 1. Find if this specific product already has a variant row elsewhere
//         const currentVariantRecord = await tx.productVariant.findUnique({
//           where: { productId: inflowId }
//         });

//         // 2. Look up the destination slot row that was pre-generated by the group matrix
//         const targetSlotRecord = await tx.productVariant.findUnique({
//           where: {
//             productGroupId_signature: {
//               productGroupId,
//               signature: variantSignature
//             }
//           }
//         });

//         if (targetSlotRecord) {
//           // If the target slot is currently assigned to a placeholder product or another product,
//           // and our safety check above didn't trip, we can overwrite or safe-delete the placeholder item
//           if (targetSlotRecord.productId && targetSlotRecord.productId !== inflowId) {
//             const placeholderProductId = targetSlotRecord.productId;
            
//             // Wipe out the target variant row so we don't break unique constraints when shifting
//             await tx.productVariant.delete({ where: { id: targetSlotRecord.id } });
            
//             // Clean up the orphaned placeholder product record from the DB completely
//             await tx.product.deleteMany({ where: { inflowId: placeholderProductId } });
//           }
//         }

//         // 3. Perform the safe transition
//         if (currentVariantRecord) {
//           // Update the product's existing row to point to the new group and signature location
//           await tx.productVariant.update({
//             where: { id: currentVariantRecord.id },
//             data: {
//               productGroupId: productGroupId,
//               signature: variantSignature,
//               isActive: true
//             }
//           });
//         } else {
//           // The product was standalone before, create a new variant record for it
//           await tx.productVariant.create({
//             data: {
//               inflowId: crypto.randomUUID().toLowerCase(),
//               productGroupId: productGroupId,
//               productId: inflowId,
//               signature: variantSignature,
//               defaultPrice: 0.00,
//               isActive: true
//             }
//           });
//         }
//       } else {
//         // Unlink variant structure cleanly if group drop-down is set to standalone/empty
//         const currentVariantRecord = await tx.productVariant.findUnique({
//           where: { productId: inflowId }
//         });

//         if (currentVariantRecord) {
//           await tx.productVariant.delete({ where: { id: currentVariantRecord.id } });
//         }
//       }

//       // B. Reconcile Purchasing UOM Configuration (1:1 Relation mapping node)
//       if (purchasingUomId) {
//         await tx.productUom.upsert({
//           where: { productId: inflowId },
//           update: {
//             uomId: purchasingUomId, // 🟢 FIXED: Points to uomId foreign key relation instead of .name string
//             standardQuantity: Number(purchasingUom.standardQuantity) || 1,
//             uomQuantity: Number(purchasingUom.uomQuantity) || 1,
//           },
//           create: {
//             productId: inflowId,
//             uomId: purchasingUomId, // 🟢 FIXED
//             standardQuantity: Number(purchasingUom.standardQuantity) || 1,
//             uomQuantity: Number(purchasingUom.uomQuantity) || 1,
//           },
//         });
//       } else {
//         // Safe fall-through drop protection if purchasing matrix is completely cleared out
//         await tx.productUom.deleteMany({ where: { productId: inflowId } });
//       }

//       // C. Reconcile Sales Channels UOM Configuration (1:1 Relation mapping node)
//       if (salesUomId) {
//         await tx.productSalesUom.upsert({
//           where: { productId: inflowId },
//           update: {
//             uomId: salesUomId, // 🟢 FIXED: Points to uomId foreign key relation instead of .name string
//             standardQuantity: Number(salesUom.standardQuantity) || 1,
//             uomQuantity: Number(salesUom.uomQuantity) || 1,
//           },
//           create: {
//             productId: inflowId,
//             uomId: salesUomId, // 🟢 FIXED
//             standardQuantity: Number(salesUom.standardQuantity) || 1,
//             uomQuantity: Number(salesUom.uomQuantity) || 1,
//           },
//         });
//       } else {
//         // Safe fall-through drop protection if sales channels matrix is completely cleared out
//         await tx.productSalesUom.deleteMany({ where: { productId: inflowId } });
//       }

//       // D. Reconcile 1:Many nested barcode collections array
//       await tx.productBarcode.deleteMany({ where: { productId: inflowId } });
//       const validBarcodes = barcodes.filter((b: any) => b?.barcode?.trim());
//       if (validBarcodes.length > 0) {
//         await tx.productBarcode.createMany({
//           data: validBarcodes.map((b: any, index: number) => ({
//             inflowId: crypto.randomUUID().toString(),
//             productId: inflowId,
//             barcode: b.barcode.trim(),
//             lineNum: index + 1,
//           }))
//         });
//       }

//       // E. Reconcile 1:Many nested image asset paths array
//       await tx.productImage.deleteMany({ where: { productId: inflowId } });
//       const validImages = images.filter((img: any) => img?.originalUrl?.trim());
//       if (validImages.length > 0) {
//         await tx.productImage.createMany({
//           data: validImages.map((img: any, positionIndex: number) => ({
//             inflowId: crypto.randomUUID().toString(),
//             productId: inflowId,
//             position: positionIndex,
//             originalUrl: img.originalUrl.trim(),
//             largeUrl: img.originalUrl.trim(),
//             mediumUrl: img.originalUrl.trim(),
//             thumbUrl: img.originalUrl.trim(),
//           }))
//         });
//       }

//       return tx.product.findUnique({ where: { inflowId } });
//     });

//     return NextResponse.json(updatedCatalogEntity, { status: 200 });
//   } catch (error: any) {
//     console.error("Product modification pipeline failure:", error);
//     return NextResponse.json(
//       { error: "Internal Database modification transaction process crashed.", details: error.message }, 
//       { status: 500 }
//     );
//   }
// }


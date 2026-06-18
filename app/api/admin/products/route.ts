// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genUniqueSlug } from "@/helpers/genUniqueSlug";

export async function GET() {
  try {
    const catalogItems = await prisma.product.findMany({
      where: { deletedAt: null }, // Global soft-delete filtering
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        purchasingUom: true,
        salesUom: true,
        barcodes: { select: { barcode: true } },
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { thumbUrl: true, originalUrl: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const parsedProducts = catalogItems.map((prod) => ({
      id: prod.id,
      inflowId: prod.inflowId,
      sku: prod.sku || "N/A",
      name: prod.name,
      slug: prod.slug,
      itemType: prod.itemType || "Stock",
      isActive: prod.isActive,
      trackExpiry: prod.trackExpiry,
      trackLots: prod.trackLots,
      trackSerials: prod.trackSerials,
      brandName: prod.brand?.name || "Generic / White-label",
      categoryName: prod.category?.name || "",
      thumbnail: prod.images[0]?.thumbUrl || prod.images[0]?.originalUrl || null,
      barcodesCount: prod.barcodes.length,
      primaryBarcode: prod.barcodes[0]?.barcode || null,
      purchasingUomText: prod.purchasingUom 
        ? `${prod.purchasingUom.name} (${Number(prod.purchasingUom.standardQuantity)}:${Number(prod.purchasingUom.uomQuantity)})`
        : "Not Set",
      salesUomText: prod.salesUom 
        ? `${prod.salesUom.name} (${Number(prod.salesUom.standardQuantity)}:${Number(prod.salesUom.uomQuantity)})`
        : "Not Set",
    }));

    return NextResponse.json(parsedProducts, { status: 200 });
  } catch (error) {
    console.error("Master product catalog pipeline failure:", error);
    return NextResponse.json({ error: "Internal product database query execution failure." }, { status: 500 });
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
      hsTariffNumber, remarks, standardUomName, purchasingUom, salesUom, barcodes, images
    } = body;

    if (!sku?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "Missing required core SKU identity attributes entries." }, { status: 400 });
    }

    const slug = await genUniqueSlug(name, prisma.product);

    const computedInflowId = crypto.randomUUID().toString();

    const outputTransaction = await prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          inflowId: computedInflowId,
          sku: sku.trim(),
          name: name.trim(),
          slug: slug.trim(),
          description: description?.trim() || null,
          itemType,
          brandId: brandId || null,
          categoryId: categoryId || null,
          autoAssemble,
          isActive,
          isManufacturable,
          includeQuantityBuildable,
          trackExpiry,
          trackLots,
          trackSerials,
          shelfLifeDays,
          sellBeforeExpiryDays,
          expiryNotificationDays,
          weight, width, height, length,
          originCountry: originCountry?.trim() || null,
          hsTariffNumber: hsTariffNumber?.trim() || null,
          remarks: remarks?.trim() || null,
          standardUomName,
          purchasingUom: {
            create: {
              name: purchasingUom.name.trim(),
              standardQuantity: purchasingUom.standardQuantity,
              uomQuantity: purchasingUom.uomQuantity,
            }
          },
          salesUom: {
            create: {
              name: salesUom.name.trim(),
              standardQuantity: salesUom.standardQuantity,
              uomQuantity: salesUom.uomQuantity,
            }
          },
          barcodes: {
            create: barcodes.map((b: any, index: number) => ({
              inflowId: crypto.randomUUID().toString(),
              barcode: b.barcode.trim(),
              lineNum: index + 1,
            }))
          },
          images: {
            create: images.map((img: any, positionIndex: number) => ({
              inflowId: crypto.randomUUID().toString(),
              position: positionIndex,
              originalUrl: img.originalUrl.trim(),
              largeUrl: img.originalUrl.trim(),
              mediumUrl: img.originalUrl.trim(),
              thumbUrl: img.originalUrl.trim(),
            }))
          }
        }
      });
    });

    return NextResponse.json(outputTransaction, { status: 201 });
  } catch (error: any) {
    console.error("Critical failure adding product mapping variant:", error);
    return NextResponse.json({ error: "Internal Database insertion pipeline transaction aborted execution." }, { status: 500 });
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
      hsTariffNumber, remarks, standardUomName, purchasingUom, salesUom, barcodes, images
    } = body;

    if (!inflowId) {
      return NextResponse.json({ error: "Missing required core identifying target reference pointer." }, { status: 400 });
    }

    const slug = await genUniqueSlug(name, prisma.product);

    const updatedCatalogEntity = await prisma.$transaction(async (tx) => {
      // 1. Core update operations onto root node
      await tx.product.update({
        where: { inflowId },
        data: {
          name: name.trim(),
          slug: slug.trim(),
          description: description?.trim() || null,
          itemType,
          brandId: brandId || null,
          categoryId: categoryId || null,
          autoAssemble,
          isActive,
          isManufacturable,
          includeQuantityBuildable,
          trackExpiry, trackLots, trackSerials,
          shelfLifeDays, sellBeforeExpiryDays, expiryNotificationDays,
          weight, width, height, length,
          originCountry: originCountry?.trim() || null,
          hsTariffNumber: hsTariffNumber?.trim() || null,
          remarks: remarks?.trim() || null,
          standardUomName,
        }
      });

      // 2. Perform updates on 1:1 Purchasing/Sales UOM configurations
      await tx.productUom.upsert({
        where: {
          productId: inflowId,
        },
        update: {
          name: purchasingUom.name.trim(),
          standardQuantity: purchasingUom.standardQuantity,
          uomQuantity: purchasingUom.uomQuantity,
        },
        create: {
          productId: inflowId,
          name: purchasingUom.name.trim(),
          standardQuantity: purchasingUom.standardQuantity,
          uomQuantity: purchasingUom.uomQuantity,
        },
      });

      await tx.productSalesUom.upsert({
        where: {
          productId: inflowId,
        },
        update: {
          name: salesUom.name.trim(),
          standardQuantity: salesUom.standardQuantity,
          uomQuantity: salesUom.uomQuantity,
        },
        create: {
          productId: inflowId,
          name: salesUom.name.trim(),
          standardQuantity: salesUom.standardQuantity,
          uomQuantity: salesUom.uomQuantity,
        },
      });

      // await tx.productUom.update({
      //   where: { productId: inflowId },
      //   data: {
      //     name: purchasingUom.name.trim(),
      //     standardQuantity: purchasingUom.standardQuantity,
      //     uomQuantity: purchasingUom.uomQuantity,
      //   }
      // });

      // await tx.productSalesUom.update({
      //   where: { productId: inflowId },
      //   data: {
      //     name: salesUom.name.trim(),
      //     standardQuantity: salesUom.standardQuantity,
      //     uomQuantity: salesUom.uomQuantity,
      //   }
      // });

      // 3. Reconcile nested barcode row collections
      await tx.productBarcode.deleteMany({ where: { productId: inflowId } });
      if (barcodes && barcodes.length > 0) {
        await tx.productBarcode.createMany({
          data: barcodes.map((b: any, index: number) => ({
            inflowId: crypto.randomUUID().toString(),
            productId: inflowId,
            barcode: b.barcode.trim(),
            lineNum: index + 1,
          }))
        });
      }

      // 4. Reconcile nested CDN Image URL links array assets mapping
      await tx.productImage.deleteMany({ where: { productId: inflowId } });
      if (images && images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((img: any, positionIndex: number) => ({
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
    return NextResponse.json({ error: "Internal Database modification transaction process crashed." }, { status: 500 });
  }
}


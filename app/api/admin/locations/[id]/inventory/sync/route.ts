import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WebhookService } from "@/services/webhook.service";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(
  request: NextRequest, { params }: Props
) {
  try {
    const { id: locationId} = await params;

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Fetch all inventory items for this location with complete product metadata
    const inventoryItems = await prisma.inventory.findMany({
      where: { locationId: location.inflowId },
      include: {
        product: {
          include: {
            cost: true,
            prices: true,
            barcodes: true,
            images: { orderBy: { position: "asc" } },
            salesUom: { include: { uom: true } },
            purchasingUom: { include: { uom: true } },
            category: true
          },
        },
        bins: {
          include: {
            sublocation: true,
            inventoryBinItems: true,
          },
        },
      },
    });

    if (inventoryItems.length === 0) {
      return NextResponse.json(
        { message: "No inventory records found for this location to sync." },
        { status: 200 }
      );
    }

    // Check webhook availability
    const validCloudWebhook = await WebhookService.getCloudWebhookURL("product.updated");
    if (!validCloudWebhook) {
      return NextResponse.json(
        { error: "Cloud sync webhook URL is not configured or invalid." },
        { status: 500 }
      );
    }

    const midSyncQueue = getMidSyncQueue();
    let queuedCount = 0;

    // Process and queue each product's sync payload
    for (const inv of inventoryItems) {
      const product = inv.product;
      if (!product) continue;

      // Map Inventory Lines across all bins and serial items
      const inventoryLines: Array<{
        inventoryLineId: string;
        locationId: string;
        productId: string;
        quantityOnHand: string;
        serial: string | null;
        sublocation: string | null;
      }> = [];

      if (inv.bins && inv.bins.length > 0) {
        for (const bin of inv.bins) {
          const sublocationName = bin.sublocation?.name || null;

          if (bin.inventoryBinItems && bin.inventoryBinItems.length > 0) {
            // Serialized items mapping
            for (const item of bin.inventoryBinItems) {
              inventoryLines.push({
                inventoryLineId: inv.id,
                locationId: inv.locationId,
                productId: inv.productId,
                quantityOnHand: "1",
                serial: item.serialNumber,
                sublocation: sublocationName,
              });
            }
          } else {
            // Non-serialized bin balance mapping
            inventoryLines.push({
              inventoryLineId: inv.id,
              locationId: inv.locationId,
              productId: inv.productId,
              quantityOnHand: bin.quantity.toString(),
              serial: null,
              sublocation: sublocationName,
            });
          }
        }
      } else {
        // Fallback for unbinned inventory
        inventoryLines.push({
          inventoryLineId: inv.id,
          locationId: inv.locationId,
          productId: inv.productId,
          quantityOnHand: inv.quantityOnHand.toString(),
          serial: null,
          sublocation: null,
        });
      }

      // Construct cloud-sync product payload
      const cleanInflowPayload = {
        cloudId: product.inflowId,
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        description: product.description,
        itemType: product.itemType,
        brandId: product.brandId,
        categoryId: product.categoryId,
        autoAssemble: product.autoAssemble,
        isActive: product.isActive,
        isManufacturable: product.isManufacturable,
        includeQuantityBuildable: product.includeQuantityBuildable,
        standardUomName: product.standardUomName,
        trackExpiry: product.trackExpiry,
        trackLots: product.trackLots,
        trackSerials: product.trackSerials,
        shelfLifeDays: product.shelfLifeDays,
        sellBeforeExpiryDays: product.sellBeforeExpiryDays,
        expiryNotificationDays: product.expiryNotificationDays,
        weight: product.weight?.toString() || null,
        width: product.width?.toString() || null,
        height: product.height?.toString() || null,
        length: product.length?.toString() || null,
        originCountry: product.originCountry,
        hsTariffNumber: product.hsTariffNumber,
        remarks: product.remarks,

        // category: 

        defaultImageId: null,
        lastModifiedById: null,
        lastModifiedDateTime: null,
        lastVendorId: null,

        totalQuantityOnHand: Number(inv.quantityOnHand),

        salesUom: product.salesUom
          ? {
              name: product.salesUom.uom.name,
              conversion: {
                standardQuantity: product.salesUom.standardQuantity,
                uomQuantity: product.salesUom.uomQuantity,
              },
            }
          : null,

        purchasingUom: product.purchasingUom
          ? {
              name: product.purchasingUom.uom.name,
              conversion: {
                standardQuantity: product.purchasingUom.standardQuantity,
                uomQuantity: product.purchasingUom.uomQuantity,
              },
            }
          : null,

        cost: product.cost
          ? {
              productCostId: product.cost.inflowId,
              cost: product.cost.cost.toString(),
            }
          : null,

        prices: product.prices.map((p) => ({
          productPriceId: p.inflowId,
          pricingSchemeId: p.pricingSchemeId,
          priceType: p.priceType,
          unitPrice: p.unitPrice?.toString() || "0",
          fixedMarkup: p.fixedMarkup?.toString() || "0",
        })),

        productBarcodes: product.barcodes.map((b) => ({
          productBarcodeId: b.inflowId,
          barcode: b.barcode,
          lineNum: b.lineNum,
        })),

        images: product.images.map((img) => ({
          imageId: img.inflowId,
          position: img.position,
          originalUrl: img.originalUrl,
          largeUrl: img.largeUrl,
          mediumUrl: img.mediumUrl,
          thumbUrl: img.thumbUrl,
        })),

        inventoryLines,
      };

      // Add to BullMQ queue
      await midSyncQueue.add(
        "product_cloudsync_job",
        {
          source: "PRODUCT_UPSERT_CLOUD",
          model: "Product",
          payload: cleanInflowPayload,
          timestamp: new Date().toISOString(),
        },
        {
          attempts: 0,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true,
        }
      );

      queuedCount++;

      await sleep(300);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully queued ${queuedCount} product sync jobs to cloud.`,
      count: queuedCount,
    });
  } catch (error: any) {
    console.error("[CLOUD_SYNC_INVENTORY_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during sync dispatch" },
      { status: 500 }
    );
  }
}
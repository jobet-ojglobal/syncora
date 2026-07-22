// services/sync/products/product-reorder-setting-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductsInclude } from "../data/products";
import { Prisma } from "@/generated/prisma/client";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

type Tx = Prisma.TransactionClient;

/**
 * Ensures a minimal Location record exists to satisfy FK constraints.
 */
async function ensureLocationShell(tx: Tx, locationId?: string | null) {
  if (!locationId) return null;

  const existing = await tx.location.findUnique({
    where: { inflowId: locationId },
    select: { inflowId: true },
  });

  if (!existing) {
    await tx.location.create({
      data: {
        inflowId: locationId,
        name: `Placeholder Location (${locationId.slice(0, 8)})`,
      },
    });
  }

  return locationId;
}

/**
 * Ensures a minimal Vendor/BusinessPartner record exists to satisfy FK constraints.
 */
async function ensureVendorShell(tx: Tx, vendorId?: string | null) {
  if (!vendorId) return null;

  const existing = await tx.vendor.findUnique({
    where: { inflowId: vendorId },
    select: { inflowId: true },
  });

  if (!existing) {
    const partner = await tx.businessPartner.create({
      data: {
        name: `Placeholder Vendor (${vendorId.slice(0, 8)})`,
      },
    });

    await tx.vendor.create({
      data: {
        inflowId: vendorId,
        businessPartnerId: partner.id,
      },
    });
  }

  return vendorId;
}

export class ProductReorderSettingSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    // Local caches to prevent redundant shell creation queries within execution
    const caches = {
      verifiedLocationIds: new Set<string>(),
      verifiedVendorIds: new Set<string>(),
    };

    console.log("Starting targeted Product Reorder Settings data sync with FK safety guards...");

    while (true) {
      // 1. Fetch products batch from inFlow
      const products = await getProductsInclude(BATCH_SIZE, after, [
        "reorderSettings.formLocation,reorderSettings.location,reorderSettings.vendor",
      ]);

      if (!products || products.length === 0) {
        break;
      }

      // 2. Filter products that exist locally
      const inflowProductIds = products.map((p) => p.productId);
      const existingProducts = await prisma.product.findMany({
        where: {
          inflowId: { in: inflowProductIds },
        },
        select: {
          inflowId: true,
        },
      });

      const existingProductIdsSet = new Set(existingProducts.map((p) => p.inflowId));
      const productsToSync = products.filter((p) => existingProductIdsSet.has(p.productId));

      // 3. Process inside transaction
      if (productsToSync.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (const product of productsToSync) {
              // Clear previous reorder rule items for this explicit product context
              await tx.reorderSetting.deleteMany({
                where: { productId: product.productId },
              });

              if (product.reorderSettings?.length) {
                for (const rs of product.reorderSettings) {
                  // 🛡️ Ensure FK Integrity: locationId
                  if (rs.locationId && !caches.verifiedLocationIds.has(rs.locationId)) {
                    await ensureLocationShell(tx, rs.locationId);
                    caches.verifiedLocationIds.add(rs.locationId);
                  }

                  // 🛡️ Ensure FK Integrity: fromLocationId
                  if (rs.fromLocationId && !caches.verifiedLocationIds.has(rs.fromLocationId)) {
                    await ensureLocationShell(tx, rs.fromLocationId);
                    caches.verifiedLocationIds.add(rs.fromLocationId);
                  }

                  // 🛡️ Ensure FK Integrity: vendorId
                  if (rs.vendorId && !caches.verifiedVendorIds.has(rs.vendorId)) {
                    await ensureVendorShell(tx, rs.vendorId);
                    caches.verifiedVendorIds.add(rs.vendorId);
                  }

                  // Upsert/Create Reorder Setting Record Safely
                  await tx.reorderSetting.upsert({
                    where: { inflowId: rs.reorderSettingsId },
                    create: {
                      inflowId: rs.reorderSettingsId,
                      productId: product.productId,
                      locationId: rs.locationId,
                      fromLocationId: rs.fromLocationId || null,
                      vendorId: rs.vendorId || null,
                      defaultSublocation: rs.defaultSublocation || null,
                      enableReordering: rs.enableReordering ?? true,
                      reorderMethod: rs.reorderMethod || "PurchaseOrder",
                      reorderPoint: new Prisma.Decimal(rs.reorderPoint || 0),
                      reorderQuantity: new Prisma.Decimal(rs.reorderQuantity || 0),
                    },
                    update: {
                      locationId: rs.locationId ,
                      fromLocationId: rs.fromLocationId || null,
                      vendorId: rs.vendorId || null,
                      defaultSublocation: rs.defaultSublocation || null,
                      enableReordering: rs.enableReordering ?? true,
                      reorderMethod: rs.reorderMethod || "PurchaseOrder",
                      reorderPoint: new Prisma.Decimal(rs.reorderPoint || 0),
                      reorderQuantity: new Prisma.Decimal(rs.reorderQuantity || 0),
                    },
                  });
                }
              }
            }
          },
          { timeout: 60000 }
        );
      }

      totalProcessed += products.length;
      after = products[products.length - 1].productId;

      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }

      if (products.length < BATCH_SIZE) {
        break;
      }
    }

    return {
      totalProductsScanned: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}
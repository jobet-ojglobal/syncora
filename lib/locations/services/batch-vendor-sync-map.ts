// lib/vendors/services/vendor-sync.service.ts
import { prisma } from "@/lib/prisma";
import { VendorPayload } from "../types";
import { parseBooleanFlag } from "@/helpers";
import { AddressType } from "@/generated/prisma/enums";
import { getLocalBatchVendors } from "../data/vendors";
import { syncVendor } from "./vendor-sync";
import { SyncOptions } from "@/lib/workers/types";

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type VendorSyncCaches = {
  verifiedPaymentTermsIds: Set<string>;
  verifiedCurrencyIds: Set<string>;
  verifiedTaxingSchemeIds: Set<string>;
  verifiedTeamMemberIds?: Set<string>;
  verifiedCategoryIds?: Set<string>;
  verifiedVendorIds?: Set<string>;
  verifiedProductIds: Set<string>;
};

export class VendorSyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Process a single batch within an isolated Prisma transaction
   */
  async syncBatch(
    tx: DbClient,
    records: VendorPayload[],
    locationInflowId: string,
    checkSignal?: () => Promise<void>,
    caches?: VendorSyncCaches,
    isUpdateData: boolean = false
  ) {
    const activeCaches: VendorSyncCaches = caches ?? {
      verifiedPaymentTermsIds: new Set<string>(),
      verifiedCurrencyIds: new Set<string>(),
      verifiedTaxingSchemeIds: new Set<string>(),
      verifiedProductIds: new Set<string>(),
    };

    const syncResults: Array<{
      vendorInflowId: string;
      localVendorId?: number;
      status: "synced" | "skipped_not_found" | "skipped_inactive" | "skipped_exists";
    }> = [];

    // Filter out inactive records at start, recording skipped status
    const activeRecords: VendorPayload[] = [];
    for (const incoming of records) {
      if (!parseBooleanFlag(incoming.isActive)) {
        syncResults.push({
          vendorInflowId: String(incoming.vendorId),
          status: "skipped_inactive",
        });
      } else {
        activeRecords.push(incoming);
      }
    }

    if (activeRecords.length === 0) {
      return { processedCount: 0, results: syncResults };
    }

    // Step 1: Resolve identity and structural mapping dependencies for active records
    const resolvedEntries = await Promise.all(
      activeRecords.map(async (incoming) => {
        if (checkSignal) await checkSignal();

        // Check existing mapping within this specific location
        const existingMappedVendor = incoming.vendorId
          ? await tx.vendorLocationMap.findFirst({
              where: {
                locationId: locationInflowId,
                localId: Number(incoming.vendorId),
              },
              select: {
                localId: true,
                vendorId: true,
                vendor: { select: { inflowId: true, businessPartnerId: true } },
              },
            })
          : null;

        // Skip record if already mapped and update flag is false
        if (existingMappedVendor && !isUpdateData) {
          syncResults.push({
            vendorInflowId: String(incoming.vendorId),
            localVendorId: existingMappedVendor.localId,
            status: "skipped_exists",
          });
          return null;
        }

        // 1. Resolve identity by matching global partner details or unique inflow links
        const match =
          existingMappedVendor?.vendor ||
          (await tx.vendor.findFirst({
            where: {
              OR: [
                { inflowId: String(incoming.vendorId) },
                { businessPartner: { name: incoming.name.trim() } },
              ],
            },
            select: { inflowId: true, businessPartnerId: true },
          }));

        // 2. Map structural dependencies using identity tables
        const [taxingScheme, paymentTerm, currency, teamMember] = await Promise.all([
          incoming.taxingSchemeId
            ? tx.taxingSchemeLocationMap.findFirst({
                where: {
                  locationId: locationInflowId,
                  localId: Number(incoming.taxingSchemeId),
                },
                select: { taxingSchemeId: true },
              })
            : null,
          incoming.defaultPaymentTermsId
            ? tx.paymentTermLocationMap.findFirst({
                where: {
                  locationId: locationInflowId,
                  localId: Number(incoming.defaultPaymentTermsId),
                },
                select: { paymentTermId: true },
              })
            : null,
          incoming.currencyId
            ? tx.currencyLocationMap.findFirst({
                where: {
                  locationId: locationInflowId,
                  localId: Number(incoming.currencyId),
                },
                select: { currencyId: true },
              })
            : null,
          incoming.lastModUserId
            ? tx.teamMemberLocationMapExtended.findFirst({
                where: {
                  locationId: locationInflowId,
                  localId: Number(incoming.lastModUserId),
                },
                select: { teamMemberId: true },
              })
            : null,
        ]);

        // Resolve vendor item product identity mappings via location map
        const mappedVendorItems = incoming.vendorItems?.length
          ? await Promise.all(
              incoming.vendorItems.map(async (item) => {
                if (!item.productId) return item;

                const productMap = await tx.productLocationMap.findFirst({
                  where: {
                    locationId: locationInflowId,
                    localId: Number(item.productId),
                  },
                  select: { productId: true },
                });

                return {
                  ...item,
                  productId: productMap?.productId || item.productId,
                };
              })
            )
          : [];

        const resolvedParentId =
          match?.businessPartnerId || crypto.randomUUID().toLowerCase();
        const resolvedVendorInflowId =
          match?.inflowId || crypto.randomUUID().toLowerCase();

        const cleanEmail = incoming.email?.trim().toLowerCase();

        // 3. Process primary BusinessPartner context
        const businessPartner = await tx.businessPartner.upsert({
          where: { id: resolvedParentId },
          create: {
            id: resolvedParentId,
            name: incoming.name.trim(),
            contactName: incoming.contactName || null,
            email: cleanEmail || null,
            phone: incoming.phone || null,
            fax: incoming.fax || null,
            website: incoming.website || null,
            remarks: incoming.remarks || null,
            isActive: parseBooleanFlag(incoming.isActive),
          },
          update: {
            name: incoming.name.trim(),
            contactName: incoming.contactName || null,
            email: cleanEmail || null,
            phone: incoming.phone || null,
            fax: incoming.fax || null,
            website: incoming.website || null,
            remarks: incoming.remarks || null,
            isActive: parseBooleanFlag(incoming.isActive),
          },
        });

        await tx.businessPartnerAddress.deleteMany({
          where: { businessPartnerId: businessPartner.id },
        });

        // 4. Resolve vendor address
        let defaultAddressId: string | null = null;
        if (incoming.address1) {
          const address = await tx.businessPartnerAddress.create({
            data: {
              inflowId: crypto.randomUUID().toLowerCase(),
              businessPartnerId: businessPartner.id,
              name: "Primary Address",
              address1: incoming.address1 || null,
              address2: incoming.address2 || null,
              city: incoming.city || null,
              state: incoming.state || null,
              country: incoming.country || null,
              postalCode: incoming.postalCode || null,
              addressType: String(incoming.addressType || "Commercial") as AddressType,
            },
          });
          defaultAddressId = address.inflowId;
        }

        // 5. Structure payload matching vendor schema parameters
        const payload = {
          inflowId: resolvedVendorInflowId,
          businessPartnerId: businessPartner.id,
          defaultCarrier: incoming.defaultCarrier || null,
          defaultPaymentMethod: incoming.defaultPaymentMethod || null,
          discount: incoming.discount || null,
          isTaxInclusivePricing: parseBooleanFlag(incoming.isTaxInclusivePricing),
          taxingSchemeId: taxingScheme?.taxingSchemeId || null,
          defaultPaymentTermsId: paymentTerm?.paymentTermId || null,
          currencyId: currency?.currencyId || null,
          defaultAddressId,
          lastModifiedById: teamMember?.teamMemberId || null,
          leadTimeDays: null,
          dues:
            incoming.dues?.map((d: any) => ({
              inflowId: d.vendorDueId || d.inflowId || crypto.randomUUID().toLowerCase(),
              currencyId: d.currencyId,
              amountCurrent: d.amountCurrent,
              amount1To30: d.amount1To30,
              amount31To60: d.amount31To60,
              amount61Plus: d.amount61Plus,
            })) || [],
          balances:
            incoming.balances?.map((b: any) => ({
              inflowId: b.vendorBalanceId || b.inflowId || crypto.randomUUID().toLowerCase(),
              currencyId: b.currencyId,
              balance: b.balance,
            })) || [],
          credits:
            incoming.credits?.map((c: any) => ({
              inflowId: c.vendorCreditId || c.inflowId || crypto.randomUUID().toLowerCase(),
              currencyId: c.currencyId,
              credit: c.credit,
            })) || [],
          vendorItems: mappedVendorItems,
          attachments: incoming.attachments || [],
        };

        const savedVendor = await syncVendor(tx, payload, activeCaches);

        return {
          incoming,
          existing: savedVendor,
          metaPayload: payload,
        };
      })
    );

    // Filter out any entries skipped due to early returns
    const validEntries = resolvedEntries.filter(
      (r): r is NonNullable<typeof r> => r !== null && r.existing !== null
    );

    // Step 2: Bridge connection inside Local Identity Mapping Indexes
    for (const { incoming, existing } of validEntries) {
      if (checkSignal) await checkSignal();

      let vendorMap = await tx.vendorLocationMap.findUnique({
        where: {
          vendorId_locationId: {
            vendorId: existing.inflowId,
            locationId: locationInflowId,
          },
        },
        select: { localId: true },
      });

      if (!vendorMap) {
        vendorMap = await tx.vendorLocationMap.create({
          data: {
            vendorId: existing.inflowId,
            locationId: locationInflowId,
            localId: Number(incoming.vendorId),
          },
          select: { localId: true },
        });
      }

      syncResults.push({
        vendorInflowId: String(incoming.vendorId),
        localVendorId: vendorMap?.localId,
        status: "synced",
      });
    }

    return { processedCount: validEntries.length, results: syncResults };
  }

  /**
   * Main Driver Method for Paged/Iterative Vendor syncs.
   */
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean,
    after: string | undefined = undefined
  ) {
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 500;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;

    let totalProcessed = 0;
    let hasMore = true;

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(
            selectedRecords.map((item: any) =>
              typeof item === "object" && item !== null
                ? String(item.id)
                : String(item)
            )
          )
        : null;

    const syncResults: Array<{
      vendorInflowId: string;
      localVendorId?: number;
      status: "synced" | "skipped_not_found" | "skipped_inactive" | "skipped_exists";
    }> = [];

    const caches: VendorSyncCaches = {
      verifiedPaymentTermsIds: new Set<string>(),
      verifiedCurrencyIds: new Set<string>(),
      verifiedTaxingSchemeIds: new Set<string>(),
      verifiedProductIds: new Set<string>(),
    };

    console.log(
      `Starting vendor sync (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`
    );
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: VendorPayload[] = await getLocalBatchVendors(
        location.url,
        BATCH_SIZE,
        after,
        ["dues", "credits", "balances", "vendorItems", "attachments"]
      );

      if (!rawBatch || rawBatch.length === 0) break;

      const lastRecord = rawBatch[rawBatch.length - 1];
      after = String(lastRecord.vendorId);

      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) =>
          allowedIds.has(String(item.vendorId))
        );
      }

      if (batch.length === 0) continue;

      if (checkSignal) await checkSignal();

      // Execute transaction scoped strictly to the active batch
      const { processedCount = 0, results = [] } = await prisma.$transaction(
        async (tx) => {
          return await this.syncBatch(
            tx,
            batch,
            location.inflowId,
            checkSignal,
            caches,
            false
          );
        },
        { timeout: 60000 }
      );

      totalProcessed += processedCount;
      syncResults.push(...results);
      batchNo++;

      console.log(
        `Batch #${batchNo} completed. Processed ${totalProcessed} vendors.`
      );

      if (onProgress) await onProgress(totalProcessed);

      if (checkSignal) await checkSignal();

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      vendorsProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}

const vendorService = new VendorSyncService();
export const localVendorServiceSyncMap = vendorService.sync.bind(vendorService);
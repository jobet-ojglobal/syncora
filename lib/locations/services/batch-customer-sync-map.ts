// lib/customers/services/customer-sync.service.ts
import { prisma } from "@/lib/prisma";
import { upsertCustomer } from "./customer.sync";
import { getLocalBatchCustomers } from "../data/customer";
import { CustomerPayload } from "../types";
import { SyncOptions } from "@/lib/workers/types";
import { parseBooleanFlag } from "@/helpers";
import { AddressType } from "@/generated/prisma/enums";

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class CustomerSyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Process a single batch within an isolated Prisma transaction
   */
  async syncBatch(
    tx: DbClient,
    records: CustomerPayload[],
    locationInflowId: string,
    checkSignal?: () => Promise<void>,
    isUpdateData: boolean = false
  ) {
    const syncResults: Array<{
      customerInflowId: string;
      localCustomerId?: number;
      status: "synced" | "skipped_not_found" | "skipped_inactive" | "skipped_exists";
    }> = [];

    // Filter out inactive records at start, recording skipped status
    const activeRecords: CustomerPayload[] = [];
    for (const incoming of records) {
      if (!parseBooleanFlag(incoming.isActive)) {
        syncResults.push({
          customerInflowId: String(incoming.customerId),
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
        const existingMappedCustomer = incoming.customerId
          ? await tx.customerLocationMap.findFirst({
              where: {
                locationId: locationInflowId,
                localId: Number(incoming.customerId),
              },
              select: {
                localId: true,
                customerId: true,
                customer: { select: { inflowId: true, businessPartnerId: true } },
              },
            })
          : null;

        // Skip record if already mapped and update flag is false
        if (existingMappedCustomer && !isUpdateData) {
          syncResults.push({
            customerInflowId: String(incoming.customerId),
            localCustomerId: existingMappedCustomer.localId,
            status: "skipped_exists",
          });
          return null;
        }

        // 1. Resolve identity by matching global partner details or unique inflow links
        const match = await tx.customer.findFirst({
          where: {
            OR: [
              { inflowId: String(incoming.customerId) },
              { businessPartner: { name: incoming.name.trim() } },
            ],
          },
          select: { inflowId: true, businessPartnerId: true },
        });

        // 2. Map structural dependencies using identity tables
        const [taxingScheme, paymentTerm, pricingScheme, teamMember] = await Promise.all([
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
          incoming.defaultPricingSchemeId
            ? tx.pricingSchemeLocationMap.findFirst({
                where: {
                  locationId: locationInflowId,
                  localId: Number(incoming.defaultPricingSchemeId),
                },
                select: { pricingSchemeId: true },
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

        const resolvedParentId =
          match?.businessPartnerId || crypto.randomUUID().toLowerCase();
        const resolvedCustomerInflowId =
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

        // 4. Resolve billing/shipping addresses using flat payload attributes
        let defaultBillingAddressId: string | null = null;
        let defaultShippingAddressId: string | null = null;

        const isBillingEnabled = parseBooleanFlag(incoming.usingBillingAddress);
        const billingAddressStr = isBillingEnabled
          ? incoming.billingAddress1
          : incoming.address1;

        if (billingAddressStr) {
          const bAddr = await tx.businessPartnerAddress.create({
          
            data: {
              inflowId: crypto.randomUUID().toLowerCase(),
              businessPartnerId: businessPartner.id,
              name: "Billing Address",
              address1: billingAddressStr || null,
              address2: isBillingEnabled
                ? incoming.billingAddress2 || null
                : incoming.address2 || null,
              city: isBillingEnabled
                ? incoming.billingCity || null
                : incoming.city || null,
              state: isBillingEnabled
                ? incoming.billingState || null
                : incoming.state || null,
              country: isBillingEnabled
                ? incoming.billingCountry || null
                : incoming.country || null,
              postalCode: isBillingEnabled
                ? incoming.billingPostalCode || null
                : incoming.postalCode || null,
              addressType: String(incoming.billingAddressType || "Commercial") as AddressType,
            }
          });
          defaultBillingAddressId = bAddr.inflowId;
        }

        const isShippingEnabled = parseBooleanFlag(incoming.usingShippingAddress);
        const shippingAddressStr = isShippingEnabled
          ? incoming.shippingAddress1
          : incoming.address1;

        if (shippingAddressStr) {
          const sAddr = await tx.businessPartnerAddress.create({
            data: {
              inflowId: crypto.randomUUID().toLowerCase(),
              businessPartnerId: businessPartner.id,
              name: "Shipping Address",
              address1: shippingAddressStr || null,
              address2: isShippingEnabled
                ? incoming.shippingAddress2 || null
                : incoming.address2 || null,
              city: isShippingEnabled
                ? incoming.shippingCity || null
                : incoming.city || null,
              state: isShippingEnabled
                ? incoming.shippingState || null
                : incoming.state || null,
              country: isShippingEnabled
                ? incoming.shippingCountry || null
                : incoming.country || null,
              postalCode: isShippingEnabled
                ? incoming.shippingPostalCode || null
                : incoming.postalCode || null,
              addressType: String(incoming.shippingAddressType || "Residential") as AddressType,
            }
          });
          defaultShippingAddressId = sAddr.inflowId;
        }

        // 5. Structure payload matching customer schema parameters
        const payload = {
          inflowId: resolvedCustomerInflowId,
          businessPartnerId: businessPartner.id,
          vendorPermitNumber: incoming.vendorPermitNumber || null,
          defaultCarrier: incoming.defaultCarrier || null,
          taxExemptNumber: incoming.taxExemptNumber || null,
          defaultPaymentMethod: incoming.defaultPaymentMethod || null,
          discount: incoming.discount || null,
          taxingSchemeId: taxingScheme?.taxingSchemeId || null,
          defaultPaymentTermsId: paymentTerm?.paymentTermId || null,
          pricingSchemeId: pricingScheme?.pricingSchemeId || null,
          defaultBillingAddressId,
          defaultShippingAddressId,
          lastModifiedById: teamMember?.teamMemberId || null,
          dues:
            incoming.dues?.map((d: any) => ({
              inflowId: d.inflowId || crypto.randomUUID().toLowerCase(),
              currencyId: d.currencyId,
              amountCurrent: d.amountCurrent,
              amount1To30: d.amount1To30,
              amount31To60: d.amount31To60,
              amount61Plus: d.amount61Plus,
              _localId: Number(d.localId),
            })) || [],
          balances:
            incoming.balances?.map((b: any) => ({
              inflowId: b.inflowId || crypto.randomUUID().toLowerCase(),
              currencyId: b.currencyId,
              balance: b.balance,
              _localId: Number(b.localId),
            })) || [],
          credits:
            incoming.credits?.map((c: any) => ({
              inflowId: c.inflowId || crypto.randomUUID().toLowerCase(),
              currencyId: c.currencyId,
              credit: c.credit,
              _localId: Number(c.localId),
            })) || [],
        };

        const savedCustomer = await upsertCustomer(tx, payload);

        return {
          incoming,
          existing: savedCustomer,
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

      let customerMap = await tx.customerLocationMap.findUnique({
        where: {
          customerId_locationId: {
            customerId: existing.inflowId,
            locationId: locationInflowId,
          },
        },
        select: { localId: true },
      });

      if (!customerMap) {
        customerMap = await tx.customerLocationMap.create({
          data: {
            customerId: existing.inflowId,
            locationId: locationInflowId,
            localId: Number(incoming.customerId),
          },
          select: { localId: true },
        });
      }

      syncResults.push({
        customerInflowId: String(incoming.customerId),
        localCustomerId: customerMap?.localId,
        status: "synced",
      });
    }

    return { processedCount: validEntries.length, results: syncResults };

    // const validEntries = resolvedEntries.filter((r) => r.existing !== null);

    // // Step 2: Bridge connection inside Local Identity Mapping Indexes
    // for (const { incoming, existing } of validEntries) {
    //   if (checkSignal) await checkSignal();

    //   // Map Primary Customer Profile Location Registry
    //   let customerMap = await tx.customerLocationMap.findUnique({
    //     where: {
    //       customerId_locationId: {
    //         customerId: existing!.inflowId,
    //         locationId: locationInflowId,
    //       },
    //     },
    //     select: { localId: true },
    //   });

    //   if (!customerMap) {
    //     customerMap = await tx.customerLocationMap.create({
    //       data: {
    //         customerId: existing!.inflowId,
    //         locationId: locationInflowId,
    //         localId: Number(incoming.customerId),
    //       },
    //       select: { localId: true },
    //     });
    //   }

    //   syncResults.push({
    //     customerInflowId: String(incoming.customerId),
    //     localCustomerId: customerMap?.localId,
    //     status: "synced",
    //   });
    // }

    // return { processedCount: validEntries.length, results: syncResults };
  }

  /**
   * Main Driver Method for Paged/Iterative Customer syncs.
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
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 10;

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
      customerInflowId: string;
      localCustomerId?: number;
      status: "synced" | "skipped_not_found" | "skipped_inactive" | "skipped_exists";
    }> = [];

    console.log(
      `Starting customer sync (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`
    );
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: CustomerPayload[] = await getLocalBatchCustomers(
        location.url,
        BATCH_SIZE,
        after,
        ['dues', 'credits', 'balances']
      );

      if (!rawBatch || rawBatch.length === 0) break;

      const lastRecord = rawBatch[rawBatch.length - 1];
      after = String(lastRecord.customerId);

      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) =>
          allowedIds.has(String(item.customerId))
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
            checkSignal
          );
        },
        { timeout: 60000 }
      );

      totalProcessed += processedCount;
      syncResults.push(...results);
      batchNo++;

      console.log(
        `Batch #${batchNo} completed. Processed ${totalProcessed} customers.`
      );

      if (onProgress) await onProgress(totalProcessed);

      if (checkSignal) await checkSignal();

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      customersProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}

const customerService = new CustomerSyncService();
export const localCustomerServiceSyncMap = customerService.sync.bind(customerService);


// async syncBatch(
  //   tx: DbClient,
  //   records: CustomerPayload[],
  //   locationInflowId: string,
  //   checkSignal?: () => Promise<void>
  // ) {
  //   const syncResults: Array<{
  //     customerInflowId: string;
  //     localCustomerId?: number;
  //     status: "synced" | "skipped_not_found" | "skipped_inactive";
  //   }> = [];

  //   // Filter out inactive records at start, recording skipped status
  //   const activeRecords: CustomerPayload[] = [];
  //   for (const incoming of records) {
  //     if (!parseBooleanFlag(incoming.isActive)) {
  //       syncResults.push({
  //         customerInflowId: String(incoming.customerId),
  //         status: "skipped_inactive",
  //       });
  //     } else {
  //       activeRecords.push(incoming);
  //     }
  //   }

  //   if (activeRecords.length === 0) {
  //     return { processedCount: 0, results: syncResults };
  //   }

  //   // Step 1: Resolve identity and structural mapping dependencies for active records
  //   const resolvedEntries = await Promise.all(
  //     activeRecords.map(async (incoming) => {
  //       if (checkSignal) await checkSignal();

  //       // 1. Resolve identity by matching global partner details or unique inflow links
  //       const match = await tx.customer.findFirst({
  //         where: {
  //           OR: [
  //             { inflowId: String(incoming.customerId) },
  //             { businessPartner: { name: incoming.name.trim() } },
  //           ],
  //         },
  //         select: { inflowId: true, businessPartnerId: true },
  //       });

  //       // 2. Map structural dependencies using identity tables
  //       const [taxingScheme, paymentTerm, pricingScheme] = await Promise.all([
  //         incoming.taxingSchemeId
  //           ? tx.taxingSchemeLocationMap.findFirst({
  //               where: {
  //                 locationId: locationInflowId,
  //                 localId: Number(incoming.taxingSchemeId),
  //               },
  //               select: { taxingSchemeId: true },
  //             })
  //           : null,
  //         incoming.defaultPaymentTermsId
  //           ? tx.paymentTermLocationMap.findFirst({
  //               where: {
  //                 locationId: locationInflowId,
  //                 localId: Number(incoming.defaultPaymentTermsId),
  //               },
  //               select: { paymentTermId: true },
  //             })
  //           : null,
  //         incoming.pricingSchemeId
  //           ? tx.pricingSchemeLocationMap.findFirst({
  //               where: {
  //                 locationId: locationInflowId,
  //                 localId: Number(incoming.pricingSchemeId),
  //               },
  //               select: { pricingSchemeId: true },
  //             })
  //           : null,
  //       ]);

  //       const resolvedParentId =
  //         match?.businessPartnerId || crypto.randomUUID().toLowerCase();
  //       const resolvedCustomerInflowId =
  //         match?.inflowId || crypto.randomUUID().toLowerCase();

  //       // 3. Process primary BusinessPartner context
  //       const businessPartner = await tx.businessPartner.upsert({
  //         where: { id: resolvedParentId },
  //         create: {
  //           id: resolvedParentId,
  //           name: incoming.name.trim(),
  //           contactName: incoming.contactName || null,
  //           email: incoming.email || null,
  //           phone: incoming.phone || null,
  //           fax: incoming.fax || null,
  //           website: incoming.website || null,
  //           remarks: incoming.remarks || null,
  //           isActive: parseBooleanFlag(incoming.isActive),
  //         },
  //         update: {
  //           name: incoming.name.trim(),
  //           contactName: incoming.contactName || null,
  //           email: incoming.email || null,
  //           phone: incoming.phone || null,
  //           fax: incoming.fax || null,
  //           website: incoming.website || null,
  //           remarks: incoming.remarks || null,
  //           isActive: parseBooleanFlag(incoming.isActive),
  //         },
  //       });

  //       // 4. Resolve billing/shipping addresses if supplied
  //       let defaultBillingAddressId: string | null = null;
  //       let defaultShippingAddressId: string | null = null;

  //       if (incoming.defaultBillingAddress) {
  //         const bAddr = await tx.businessPartnerAddress.upsert({
  //           where: {
  //             inflowId:
  //               incoming.defaultBillingAddress.customerAddressId ||
  //               "NEW_BILLING",
  //           },
  //           create: {
  //             inflowId:
  //               incoming.defaultBillingAddress.customerAddressId ||
  //               crypto.randomUUID().toLowerCase(),
  //             businessPartnerId: businessPartner.id,
  //             name: incoming.defaultBillingAddress.name || null,
  //             address1:
  //               incoming.defaultBillingAddress.address?.address1 || null,
  //             address2:
  //               incoming.defaultBillingAddress.address?.address2 || null,
  //             city: incoming.defaultBillingAddress.address?.city || null,
  //             state: incoming.defaultBillingAddress.address?.state || null,
  //             country: incoming.defaultBillingAddress.address?.country || null,
  //             postalCode:
  //               incoming.defaultBillingAddress.address?.postalCode || null,
  //             addressType: "Commercial",
  //           },
  //           update: {
  //             name: incoming.defaultBillingAddress.name || null,
  //             address1:
  //               incoming.defaultBillingAddress.address?.address1 || null,
  //             address2:
  //               incoming.defaultBillingAddress.address?.address2 || null,
  //             city: incoming.defaultBillingAddress.address?.city || null,
  //             state: incoming.defaultBillingAddress.address?.state || null,
  //             country: incoming.defaultBillingAddress.address?.country || null,
  //             postalCode:
  //               incoming.defaultBillingAddress.address?.postalCode || null,
  //           },
  //         });
  //         defaultBillingAddressId = bAddr.inflowId;
  //       }

  //       if (incoming.defaultShippingAddress) {
  //         const sAddr = await tx.businessPartnerAddress.upsert({
  //           where: {
  //             inflowId:
  //               incoming.defaultShippingAddress.customerAddressId ||
  //               "NEW_SHIPPING",
  //           },
  //           create: {
  //             inflowId:
  //               incoming.defaultShippingAddress.customerAddressId ||
  //               crypto.randomUUID().toLowerCase(),
  //             businessPartnerId: businessPartner.id,
  //             name: incoming.defaultShippingAddress.name || null,
  //             address1:
  //               incoming.defaultShippingAddress.address?.address1 || null,
  //             address2:
  //               incoming.defaultShippingAddress.address?.address2 || null,
  //             city: incoming.defaultShippingAddress.address?.city || null,
  //             state: incoming.defaultShippingAddress.address?.state || null,
  //             country:
  //               incoming.defaultShippingAddress.address?.country || null,
  //             postalCode:
  //               incoming.defaultShippingAddress.address?.postalCode || null,
  //             addressType: "Residential",
  //           },
  //           update: {
  //             name: incoming.defaultShippingAddress.name || null,
  //             address1:
  //               incoming.defaultShippingAddress.address?.address1 || null,
  //             address2:
  //               incoming.defaultShippingAddress.address?.address2 || null,
  //             city: incoming.defaultShippingAddress.address?.city || null,
  //             state: incoming.defaultShippingAddress.address?.state || null,
  //             country:
  //               incoming.defaultShippingAddress.address?.country || null,
  //             postalCode:
  //               incoming.defaultShippingAddress.address?.postalCode || null,
  //           },
  //         });
  //         defaultShippingAddressId = sAddr.inflowId;
  //       }

  //       // 5. Structure payload matching customer schema parameters
  //       const payload = {
  //         inflowId: resolvedCustomerInflowId,
  //         businessPartnerId: businessPartner.id,
  //         taxExemptNumber: incoming.taxExemptNumber || null,
  //         defaultCarrier: incoming.defaultCarrier || null,
  //         defaultPaymentMethod: incoming.defaultPaymentMethod || null,
  //         discount: incoming.discount || null,
  //         taxingSchemeId: taxingScheme?.taxingSchemeId || null,
  //         defaultPaymentTermsId: paymentTerm?.paymentTermId || null,
  //         pricingSchemeId: pricingScheme?.pricingSchemeId || null,
  //         defaultBillingAddressId,
  //         defaultShippingAddressId,
          // dues:
          //   incoming.dues?.map((d: any) => ({
          //     inflowId: d.inflowId || crypto.randomUUID().toLowerCase(),
          //     currencyId: d.currencyId,
          //     amountCurrent: d.amountCurrent,
          //     amount1To30: d.amount1To30,
          //     amount31To60: d.amount31To60,
          //     amount61Plus: d.amount61Plus,
          //     _localId: Number(d.localId),
          //   })) || [],
          // balances:
          //   incoming.balances?.map((b: any) => ({
          //     inflowId: b.inflowId || crypto.randomUUID().toLowerCase(),
          //     currencyId: b.currencyId,
          //     balance: b.balance,
          //     _localId: Number(b.localId),
          //   })) || [],
          // credits:
          //   incoming.credits?.map((c: any) => ({
          //     inflowId: c.inflowId || crypto.randomUUID().toLowerCase(),
          //     currencyId: c.currencyId,
          //     credit: c.credit,
          //     _localId: Number(c.localId),
          //   })) || [],
  //       };

  //       const savedCustomer = await upsertCustomer(tx, payload);

  //       return {
  //         incoming,
  //         existing: savedCustomer,
  //         metaPayload: payload,
  //       };
  //     })
  //   );

  //   const validEntries = resolvedEntries.filter((r) => r.existing !== null);

  //   // Step 2: Bridge connection inside Local Identity Mapping Indexes
  //   for (const { incoming, existing, metaPayload } of validEntries) {
  //     if (checkSignal) await checkSignal();

  //     // A. Map Primary Customer Profile Location Registry
  //     let customerMap = await tx.customerLocationMap.findUnique({
  //       where: {
  //         customerId_locationId: {
  //           customerId: existing!.inflowId,
  //           locationId: locationInflowId,
  //         },
  //       },
  //       select: { localId: true },
  //     });

  //     if (!customerMap) {
  //       customerMap = await tx.customerLocationMap.create({
  //         data: {
  //           customerId: existing!.inflowId,
  //           locationId: locationInflowId,
  //           localId: Number(incoming.customerId),
  //         },
  //         select: { localId: true },
  //       });
  //     }

  //     // B. Map Dues Registry
  //     for (const due of metaPayload.dues) {
  //       const dueMap = await tx.customerDueLocationMap.findUnique({
  //         where: {
  //           customerDueId_locationId: {
  //             customerDueId: due.inflowId,
  //             locationId: locationInflowId,
  //           },
  //         },
  //         select: { localId: true },
  //       });
  //       if (!dueMap && due._localId) {
  //         await tx.customerDueLocationMap.create({
  //           data: {
  //             customerDueId: due.inflowId,
  //             locationId: locationInflowId,
  //             localId: due._localId,
  //           },
  //         });
  //       }
  //     }

  //     // C. Map Balances Registry
  //     for (const bal of metaPayload.balances) {
  //       const balMap = await tx.customerBalanceLocationMap.findUnique({
  //         where: {
  //           customerBalanceId_locationId: {
  //             customerBalanceId: bal.inflowId,
  //             locationId: locationInflowId,
  //           },
  //         },
  //         select: { localId: true },
  //       });
  //       if (!balMap && bal._localId) {
  //         await tx.customerBalanceLocationMap.create({
  //           data: {
  //             customerBalanceId: bal.inflowId,
  //             locationId: locationInflowId,
  //             localId: bal._localId,
  //           },
  //         });
  //       }
  //     }

  //     // D. Map Credits Registry
  //     for (const cred of metaPayload.credits) {
  //       const credMap = await tx.customerCreditLocationMap.findUnique({
  //         where: {
  //           customerCreditId_locationId: {
  //             customerCreditId: cred.inflowId,
  //             locationId: locationInflowId,
  //           },
  //         },
  //         select: { localId: true },
  //       });
  //       if (!credMap && cred._localId) {
  //         await tx.customerCreditLocationMap.create({
  //           data: {
  //             customerCreditId: cred.inflowId,
  //             locationId: locationInflowId,
  //             localId: cred._localId,
  //           },
  //         });
  //       }
  //     }

  //     syncResults.push({
  //       customerInflowId: String(incoming.customerId),
  //       localCustomerId: customerMap?.localId,
  //       status: "synced",
  //     });
  //   }

  //   return { processedCount: validEntries.length, results: syncResults };
  // }
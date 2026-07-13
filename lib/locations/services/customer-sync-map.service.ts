// lib/locations/services/customer-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getCustomers } from "../data/customer"; // Assuming your data access hook
import { upsertCustomer } from "./customer.sync";
import crypto from "crypto";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class CustomerSyncMapService {
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[]
  ) {
    const { onProgress } = options;
    let incomingCustomers = await getCustomers(location.url);

    if (selectedRecords && selectedRecords.length > 0) {
      const allowedIds = selectedRecords.map(item => String(item.id));
      incomingCustomers = incomingCustomers.filter((scheme: any) => 
        allowedIds.includes(String(scheme.customerId))
      );
    }

    let processed = 0;

    const syncResults: Array<{
      customerInflowId: string;
      localCustomerId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        const existingRecords = await Promise.all(
          incomingCustomers.map(async (incoming) => {
            // 1. Resolve identity by matching global partner details or unique inflow links
            const match = await tx.customer.findFirst({
              where: {
                OR: [
                  { inflowId: incoming.customerId },
                  { businessPartner: { name: incoming.name.trim() } }
                ]
              },
              select: { inflowId: true, businessPartnerId: true }
            });

            // 2. Map structural dependencies using identity tables
            const [taxingScheme, paymentTerm, pricingScheme] = await Promise.all([
              incoming.taxingSchemeId
                ? tx.taxingSchemeLocationMap.findFirst({
                    where: { locationId: location.inflowId, localId: Number(incoming.taxingSchemeId) },
                    select: { taxingSchemeId: true }
                  })
                : null,
              incoming.defaultPaymentTermsId
                ? tx.paymentTermLocationMap.findFirst({
                    where: { locationId: location.inflowId, localId: Number(incoming.defaultPaymentTermsId) },
                    select: { paymentTermId: true }
                  })
                : null,
              incoming.pricingSchemeId
                ? tx.pricingSchemeLocationMap.findFirst({
                    where: { locationId: location.inflowId, localId: Number(incoming.pricingSchemeId) },
                    select: { pricingSchemeId: true }
                  })
                : null,
            ]);

            const resolvedParentId = match?.businessPartnerId || crypto.randomUUID().toLowerCase();
            const resolvedCustomerInflowId = match?.inflowId || crypto.randomUUID().toLowerCase();

            // 3. Process primary BusinessPartner context
            const businessPartner = await tx.businessPartner.upsert({
              where: { id: resolvedParentId },
              create: {
                id: resolvedParentId,
                name: incoming.name.trim(),
                contactName: incoming.contactName || null,
                email: incoming.email || null,
                phone: incoming.phone || null,
                fax: incoming.fax || null,
                website: incoming.website || null,
                remarks: incoming.remarks || null,
                isActive: incoming.isActive ?? true,
              },
              update: {
                name: incoming.name.trim(),
                contactName: incoming.contactName || null,
                email: incoming.email || null,
                phone: incoming.phone || null,
                fax: incoming.fax || null,
                website: incoming.website || null,
                remarks: incoming.remarks || null,
                isActive: incoming.isActive ?? true,
              }
            });

            // 4. Resolve billing/shipping addresses if supplied
            let defaultBillingAddressId: string | null = null;
            let defaultShippingAddressId: string | null = null;

            if (incoming.defaultBillingAddress) {
              const bAddr = await tx.businessPartnerAddress.upsert({
                where: { inflowId: incoming.defaultBillingAddress.customerAddressId || "NEW_BILLING" },
                create: {
                  inflowId: incoming.defaultBillingAddress.customerAddressId || crypto.randomUUID().toLowerCase(),
                  businessPartnerId: businessPartner.id,
                  name: incoming.defaultBillingAddress.name || null,
                  address1: incoming.defaultBillingAddress.address.address1 || null,
                  address2: incoming.defaultBillingAddress.address.address2 || null,
                  city: incoming.defaultBillingAddress.address.city || null,
                  state: incoming.defaultBillingAddress.address.state || null,
                  country: incoming.defaultBillingAddress.address.country || null,
                  postalCode: incoming.defaultBillingAddress.address.postalCode || null,
                  addressType: "Commercial"
                },
                update: {
                  name: incoming.defaultBillingAddress.name || null,
                  address1: incoming.defaultBillingAddress.address.address1 || null,
                  address2: incoming.defaultBillingAddress.address.address2 || null,
                  city: incoming.defaultBillingAddress.address.city || null,
                  state: incoming.defaultBillingAddress.address.state || null,
                  country: incoming.defaultBillingAddress.address.country || null,
                  postalCode: incoming.defaultBillingAddress.address.postalCode || null,
                }
              });
              defaultBillingAddressId = bAddr.inflowId;
            }

            if (incoming.defaultShippingAddress) {
              const sAddr = await tx.businessPartnerAddress.upsert({
                where: { inflowId: incoming.defaultShippingAddress.customerAddressId || "NEW_SHIPPING" },
                create: {
                  inflowId: incoming.defaultShippingAddress.customerAddressId|| crypto.randomUUID().toLowerCase(),
                  businessPartnerId: businessPartner.id,
                  name: incoming.defaultShippingAddress.name || null,
                  address1: incoming.defaultShippingAddress.address.address1 || null,
                  address2: incoming.defaultShippingAddress.address.address2 || null,
                  city: incoming.defaultShippingAddress.address.city || null,
                  state: incoming.defaultShippingAddress.address.state || null,
                  country: incoming.defaultShippingAddress.address.country || null,
                  postalCode: incoming.defaultShippingAddress.address.postalCode || null,
                  addressType: "Residential"
                },
                update: {
                  name: incoming.defaultShippingAddress.name || null,
                  address1: incoming.defaultShippingAddress.address.address1 || null,
                  address2: incoming.defaultShippingAddress.address.address2 || null,
                  city: incoming.defaultShippingAddress.address.city || null,
                  state: incoming.defaultShippingAddress.address.country || null,
                  country: incoming.defaultShippingAddress.address.country || null,
                  postalCode: incoming.defaultShippingAddress.address.postalCode || null,
                }
              });
              defaultShippingAddressId = sAddr.inflowId;
            }

            // 5. Structure payload payload matching transaction schema parameters
            const payload = {
              inflowId: resolvedCustomerInflowId,
              businessPartnerId: businessPartner.id,
              taxExemptNumber: incoming.taxExemptNumber || null,
              defaultCarrier: incoming.defaultCarrier || null,
              defaultPaymentMethod: incoming.defaultPaymentMethod || null,
              discount: incoming.discount || null,
              taxingSchemeId: taxingScheme?.taxingSchemeId || null,
              defaultPaymentTermsId: paymentTerm?.paymentTermId || null,
              pricingSchemeId: pricingScheme?.pricingSchemeId || null,
              defaultBillingAddressId,
              defaultShippingAddressId,
              // Nested dimension metric nodes transformed safely inline
              dues: incoming.dues?.map((d: any) => ({
                inflowId: d.inflowId || crypto.randomUUID().toLowerCase(),
                currencyId: d.currencyId, // Verified global target identity
                amountCurrent: d.amountCurrent,
                amount1To30: d.amount1To30,
                amount31To60: d.amount31To60,
                amount61Plus: d.amount61Plus,
                _localId: Number(d.localId)
              })) || [],
              balances: incoming.balances?.map((b: any) => ({
                inflowId: b.inflowId || crypto.randomUUID().toLowerCase(),
                currencyId: b.currencyId,
                balance: b.balance,
                _localId: Number(b.localId)
              })) || [],
              credits: incoming.credits?.map((c: any) => ({
                inflowId: c.inflowId || crypto.randomUUID().toLowerCase(),
                currencyId: c.currencyId,
                credit: c.credit,
                _localId: Number(c.localId)
              })) || [],
            };

            const savedCustomer = await upsertCustomer(tx, payload);

            return { incoming, existing: savedCustomer, metaPayload: payload };
          })
        );

        const validEntries = existingRecords.filter(r => r.existing !== null);

        /**
         * Step 2: Bridge connection inside Local Identity Mapping Indexes
         */
        for (const { incoming, existing, metaPayload } of validEntries) {
          // A. Map Primary Customer Profile Location Registry
          let customerMap = await tx.customerLocationMap.findUnique({
            where: {
              customerId_locationId: {
                customerId: existing!.inflowId,
                locationId: location.inflowId,
              }
            },
            select: { localId: true }
          });

          if (!customerMap) {
            customerMap = await tx.customerLocationMap.create({
              data: {
                customerId: existing!.inflowId,
                locationId: location.inflowId,
                localId: Number(incoming.customerId),
              },
              select: { localId: true }
            });
          }

          // B. Map Dues Registry
          for (const due of metaPayload.dues) {
            const dueMap = await tx.customerDueLocationMap.findUnique({
              where: { customerDueId_locationId: { customerDueId: due.inflowId, locationId: location.inflowId } },
              select: { localId: true }
            });
            if (!dueMap && due._localId) {
              await tx.customerDueLocationMap.create({
                data: { customerDueId: due.inflowId, locationId: location.inflowId, localId: due._localId }
              });
            }
          }

          // C. Map Balances Registry
          for (const bal of metaPayload.balances) {
            const balMap = await tx.customerBalanceLocationMap.findUnique({
              where: { customerBalanceId_locationId: { customerBalanceId: bal.inflowId, locationId: location.inflowId } },
              select: { localId: true }
            });
            if (!balMap && bal._localId) {
              await tx.customerBalanceLocationMap.create({
                data: { customerBalanceId: bal.inflowId, locationId: location.inflowId, localId: bal._localId }
              });
            }
          }

          // D. Map Credits Registry
          for (const cred of metaPayload.credits) {
            const credMap = await tx.customerCreditLocationMap.findUnique({
              where: { customerCreditId_locationId: { customerCreditId: cred.inflowId, locationId: location.inflowId } },
              select: { localId: true }
            });
            if (!credMap && cred._localId) {
              await tx.customerCreditLocationMap.create({
                data: { customerCreditId: cred.inflowId, locationId: location.inflowId, localId: cred._localId }
              });
            }
          }

          syncResults.push({
            customerInflowId: incoming.customerId,
            localCustomerId: customerMap?.localId,
            status: "synced"
          });
        }

        processed = validEntries.length;
      },
      { timeout: 60000 } // Extended timeout window to accommodate multiple child metrics writes
    );

    if (onProgress) {
      await onProgress(processed);
    }

    return {
      customersProcessed: processed,
      syncedAt: new Date().toISOString(),
      results: syncResults
    };
  }
}
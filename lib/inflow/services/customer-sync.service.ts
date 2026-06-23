// services/sync/products/customer-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getCustomers } from "../data/customers";
import { Prisma } from "@/generated/prisma/client";
import { ensureLocationShell, ensurePaymentTermsShell } from "./helpers";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class CustomerSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    // Cross-batch tracking cache to minimize redundant database roundtrips
    const verifiedLocationIds = new Set<string>();
    const verifiedPaymentTermsIds = new Set<string>();

    console.log("Starting batched customer sync with self-healing structural location cascading stubs...");

    while (true) {
      const customers = await getCustomers(BATCH_SIZE, after);

      if (!customers || customers.length === 0) {
        break;
      }

      await prisma.$transaction(
        async (tx) => {
          for (const customer of customers) {
            const cleanEmail = customer.email?.trim().toLowerCase();

            /**
             * STEP 0A: Foreign Key Safety Check for defaultLocationId
             */
            if (customer.defaultLocationId && !verifiedLocationIds.has(customer.defaultLocationId)) {
              await ensureLocationShell(tx, {
                inflowId: customer.defaultLocationId,
                name: `Placeholder Location (${customer.defaultLocationId.slice(0, 5)})`,
              });
              verifiedLocationIds.add(customer.defaultLocationId);
            }

            /**
             * STEP 0B: Foreign Key Safety Check for defaultPaymentTermsId
             */
            if (customer.defaultPaymentTermsId && !verifiedPaymentTermsIds.has(customer.defaultPaymentTermsId)) {
              const termsId = customer.defaultPaymentTermsId;
              await ensurePaymentTermsShell(tx, {
                inflowId: termsId,
                name: `Terms Placeholder (${termsId.slice(0, 5)})`,
              });
              verifiedPaymentTermsIds.add(termsId);
            }

            /**
             * 1. Parent Customer Upsert
             */
            const syncedCustomer = await tx.customer.upsert({
              where: {
                inflowId: customer.customerId,
              },
              create: {
                inflowId: customer.customerId,
                name: customer.name,
                contactName: customer.contactName,
                email: cleanEmail,
                phone: customer.phone,
                fax: customer.fax,
                website: customer.website,
                remarks: customer.remarks,
                taxExemptNumber: customer.taxExemptNumber,
                defaultCarrier: customer.defaultCarrier,
                defaultPaymentMethod: customer.defaultPaymentMethod,
                discount: customer.discount ? new Prisma.Decimal(customer.discount) : null,
                isActive: customer.isActive,
                defaultLocationId: customer.defaultLocationId, // 100% Safe across downstream schemas
                defaultPaymentTermsId: customer.defaultPaymentTermsId,
                pricingSchemeId: customer.pricingSchemeId,
                taxingSchemeId: customer.taxingSchemeId,
                defaultSalesRepTeamMemberId: customer.defaultSalesRepTeamMemberId,
                lastModifiedById: customer.lastModifiedById,
                lastModifiedDttm: customer.lastModifiedDttm ? new Date(customer.lastModifiedDttm) : null,
                defaultBillingAddressId: customer.defaultBillingAddressId,
                defaultShippingAddressId: customer.defaultShippingAddressId,
                timestamp: customer.timestamp,
              },
              update: {
                name: customer.name,
                contactName: customer.contactName,
                email: cleanEmail,
                phone: customer.phone,
                fax: customer.fax,
                website: customer.website,
                remarks: customer.remarks,
                taxExemptNumber: customer.taxExemptNumber,
                defaultCarrier: customer.defaultCarrier,
                defaultPaymentMethod: customer.defaultPaymentMethod,
                discount: customer.discount ? new Prisma.Decimal(customer.discount) : null,
                isActive: customer.isActive,
                defaultLocationId: customer.defaultLocationId,
                defaultPaymentTermsId: customer.defaultPaymentTermsId,
                pricingSchemeId: customer.pricingSchemeId,
                taxingSchemeId: customer.taxingSchemeId,
                defaultSalesRepTeamMemberId: customer.defaultSalesRepTeamMemberId,
                lastModifiedById: customer.lastModifiedById,
                lastModifiedDttm: customer.lastModifiedDttm ? new Date(customer.lastModifiedDttm) : null,
                defaultBillingAddressId: customer.defaultBillingAddressId,
                defaultShippingAddressId: customer.defaultShippingAddressId,
                timestamp: customer.timestamp,
              },
            });

            /**
             * 2. SELF-HEALING LINK: Auto-bridge to Auth User profile via email match
             */
            if (cleanEmail) {
              const existingUser = await tx.user.findUnique({
                where: { email: cleanEmail },
                select: { id: true, inflowCustomerId: true }
              });

              if (existingUser && existingUser.inflowCustomerId !== syncedCustomer.id) {
                await tx.user.update({
                  where: { id: existingUser.id },
                  data: {
                    inflowCustomerId: syncedCustomer.id
                  }
                });
              }
            }

            /**
             * 3. Customer Addresses Sync
             */
            await tx.customerAddress.deleteMany({
              where: {
                customerId: syncedCustomer.inflowId,
              },
            });

            if (customer.addresses?.length) {
              await tx.customerAddress.createMany({
                data: customer.addresses.map((address) => ({
                  inflowId: address.customerAddressId,
                  customerId: customer.customerId,
                  name: address.name,
                  address1: address.address?.address1,
                  address2: address.address?.address2,
                  city: address.address?.city,
                  state: address.address?.state,
                  country: address.address?.country,
                  postalCode: address.address?.postalCode,
                  remarks: address.address?.remarks,
                  addressType: address.address?.addressType,
                  timestamp: address.timestamp,
                })),
              });
            }

            /**
             * 4. Customer Dues Sync
             */
            await tx.customerDue.deleteMany({
              where: {
                customerId: syncedCustomer.inflowId,
              },
            });

            if (customer.dues?.length) {
              await tx.customerDue.createMany({
                data: customer.dues
                  .filter((due) => due.currencyId)
                  .map((due) => ({
                    inflowId: due.customerDueId,
                    customerId: customer.customerId,
                    currencyId: due.currencyId!,
                    amountCurrent: new Prisma.Decimal(due.amountCurrent),
                    amount1To30: new Prisma.Decimal(due.amount1To30),
                    amount31To60: new Prisma.Decimal(due.amount31To60),
                    amount61Plus: new Prisma.Decimal(due.amount61Plus),
                  })),
              });
            }

            /**
             * 5. Customer Balances Sync
             */
            await tx.customerBalance.deleteMany({
              where: {
                customerId: syncedCustomer.inflowId,
              },
            });

            if (customer.balances?.length) {
              await tx.customerBalance.createMany({
                data: customer.balances.map((balance) => ({
                  inflowId: balance.customerBalanceId,
                  customerId: customer.customerId,
                  currencyId: balance.currencyId,
                  balance: new Prisma.Decimal(balance.balance),
                })),
              });
            }

            /**
             * 6. Customer Credits Sync
             */
            await tx.customerCredit.deleteMany({
              where: {
                customerId: syncedCustomer.inflowId,
              },
            });

            if (customer.credits?.length) {
              await tx.customerCredit.createMany({
                data: customer.credits.map((credit) => ({
                  inflowId: credit.customerCreditId,
                  customerId: customer.customerId,
                  currencyId: credit.currencyId,
                  credit: new Prisma.Decimal(credit.credit),
                })),
              });
            }

            totalProcessed++;
          }
        },
        {
          timeout: 60000,
        }
      );

      after = customers[customers.length - 1].customerId;

      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }

      if (customers.length < BATCH_SIZE) {
        break;
      }
    }

    return {
      customersProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}
// lib/inflow/services/customer.sync.ts
import { Prisma } from "@/generated/prisma/client";
import type { ExtendedPrismaTransaction } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";

export type InflowCustomerInput = {
  inflowId: string;
  businessPartnerId: string;
  taxExemptNumber: string | null;
  defaultCarrier: string | null;
  defaultPaymentMethod: string | null;
  discount: number | string | Prisma.Decimal | null;
  taxingSchemeId: string | null;
  defaultPaymentTermsId: string | null;
  pricingSchemeId: string | null;
  defaultBillingAddressId: string | null;
  defaultShippingAddressId: string | null;
  dues: Array<{
    inflowId: string;
    currencyId: string;
    amountCurrent: number | string | Prisma.Decimal;
    amount1To30: number | string | Prisma.Decimal;
    amount31To60: number | string | Prisma.Decimal;
    amount61Plus: number | string | Prisma.Decimal;
  }>;
  balances: Array<{
    inflowId: string;
    currencyId: string;
    balance: number | string | Prisma.Decimal;
  }>;
  credits: Array<{
    inflowId: string;
    currencyId: string;
    credit: number | string | Prisma.Decimal;
  }>;
};

/**
 * Handles transactional record synchronization for primary Customer data blocks 
 * without dropping identity-map records through targeted differential sub-upserts.
 */
export async function upsertCustomer(
  txOrPrisma: ExtendedPrismaTransaction | typeof prisma,
  input: InflowCustomerInput
) {
  const payload = {
    businessPartnerId: input.businessPartnerId,
    taxExemptNumber: input.taxExemptNumber,
    defaultCarrier: input.defaultCarrier,
    defaultPaymentMethod: input.defaultPaymentMethod,
    discount: input.discount ? new Prisma.Decimal(input.discount.toString()) : null,
    taxingSchemeId: input.taxingSchemeId,
    defaultPaymentTermsId: input.defaultPaymentTermsId,
    pricingSchemeId: input.pricingSchemeId,
    defaultBillingAddressId: input.defaultBillingAddressId,
    defaultShippingAddressId: input.defaultShippingAddressId,
  };

  // 1. Core Profile Sync
  const customer = await txOrPrisma.customer.upsert({
    where: { inflowId: input.inflowId },
    create: {
      ...payload,
      inflowId: input.inflowId,
    },
    update: payload,
    select: { inflowId: true }
  });

  // 2. Differential Dues Upsert Orchestration
  if (input.dues.length > 0) {
    for (const d of input.dues) {
      const dPayload = {
        customerId: customer.inflowId,
        currencyId: d.currencyId,
        amountCurrent: new Prisma.Decimal(d.amountCurrent.toString()),
        amount1To30: new Prisma.Decimal(d.amount1To30.toString()),
        amount31To60: new Prisma.Decimal(d.amount31To60.toString()),
        amount61Plus: new Prisma.Decimal(d.amount61Plus.toString()),
      };
      await txOrPrisma.customerDue.upsert({
        where: { inflowId: d.inflowId },
        create: { ...dPayload, inflowId: d.inflowId },
        update: dPayload
      });
    }
  }

  // 3. Differential Balances Upsert Orchestration
  if (input.balances.length > 0) {
    for (const b of input.balances) {
      const bPayload = {
        customerId: customer.inflowId,
        currencyId: b.currencyId,
        balance: new Prisma.Decimal(b.balance.toString()),
      };
      await txOrPrisma.customerBalance.upsert({
        where: { inflowId: b.inflowId },
        create: { ...bPayload, inflowId: b.inflowId },
        update: bPayload
      });
    }
  }

  // 4. Differential Credits Upsert Orchestration
  if (input.credits.length > 0) {
    for (const c of input.credits) {
      const cPayload = {
        customerId: customer.inflowId,
        currencyId: c.currencyId,
        credit: new Prisma.Decimal(c.credit.toString()),
      };
      await txOrPrisma.customerCredit.upsert({
        where: { inflowId: c.inflowId },
        create: { ...cPayload, inflowId: c.inflowId },
        update: cPayload
      });
    }
  }

  return customer;
}
import { prisma } from "@/lib/prisma";


export async function softDeleteBusinessPartner(businessPartnerId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch the business partner and resolve exact relational dependency arrays
    const partner = await tx.businessPartner.findUnique({
      where: { id: businessPartnerId },
      include: {
        customer: {
          include: {
            dues: true,
            balances: true,
            credits: true,
            salesOrders: {
              where: {
                isCompleted: false,
                isCancelled: false,
                isQuote: false,
              },
              select: { orderNumber: true },
            },
          },
        },
        vendor: {
          include: {
            dues: true,
            balances: true,
            credits: true,
            purchaseOrders: {
              where: {
                isCompleted: false,
                isCancelled: false,
                isQuote: false,
              },
              select: { orderNumber: true },
            },
          },
        },
      },
    });

    if (!partner) {
      throw new Error('Business partner record not found.');
    }

    if (partner.deletedAt) {
      throw new Error('Business partner profile is already soft-deleted.');
    }

    // 2. Evaluate Customer Profile Dependencies
    if (partner.customer) {
      const customer = partner.customer;

      // Validate financial balances against numerical zeroes
      const hasDues = customer.dues.some(
        (d) =>
          Number(d.amountCurrent) !== 0 ||
          Number(d.amount1To30) !== 0 ||
          Number(d.amount31To60) !== 0 ||
          Number(d.amount61Plus) !== 0
      );
      if (hasDues) {
        throw new Error('Action blocked: Customer ledger contains outstanding aged dues.');
      }

      if (customer.balances.some((b) => Number(b.balance) !== 0)) {
        throw new Error('Action blocked: Customer ledger has an active non-zero account balance.');
      }

      if (customer.credits.some((c) => Number(c.credit) !== 0)) {
        throw new Error('Action blocked: Customer ledger has unapplied or remaining available credits.');
      }

      // Block on active transaction pipelines
      if (customer.salesOrders.length > 0) {
        const activeNums = customer.salesOrders.map((o) => o.orderNumber).join(', ');
        throw new Error(`Action blocked: Customer profile is attached to active sales pipelines (${activeNums}).`);
      }
    }

    // 3. Evaluate Vendor Profile Dependencies
    if (partner.vendor) {
      const vendor = partner.vendor;

      // Validate financial balances against numerical zeroes
      const hasDues = vendor.dues.some(
        (d) =>
          Number(d.amountCurrent) !== 0 ||
          Number(d.amount1To30) !== 0 ||
          Number(d.amount31To60) !== 0 ||
          Number(d.amount61Plus) !== 0
      );
      if (hasDues) {
        throw new Error('Action blocked: Vendor ledger contains outstanding aged dues.');
      }

      if (vendor.balances.some((b) => Number(b.balance) !== 0)) {
        throw new Error('Action blocked: Vendor ledger has an active non-zero account balance.');
      }

      if (vendor.credits.some((c) => Number(c.credit) !== 0)) {
        throw new Error('Action blocked: Vendor ledger has outstanding unapplied open credits.');
      }

      // Block on active transaction pipelines
      if (vendor.purchaseOrders.length > 0) {
        const activeNums = vendor.purchaseOrders.map((o) => o.orderNumber).join(', ');
        throw new Error(`Action blocked: Vendor profile is attached to active purchase pipelines (${activeNums}).`);
      }
    }

    // 4. Execute cascading updates down the data cluster
    const now = new Date();

    // Soft delete base entity
    await tx.businessPartner.update({
      where: { id: businessPartnerId },
      data: {
        isActive: false,
        deletedAt: now,
      },
    });

    // Cascade soft delete timestamp to customer subtype profile
    if (partner.customer) {
      await tx.customer.update({
        where: { id: partner.customer.id },
        data: { deletedAt: now },
      });
    }

    // Cascade soft delete timestamp to vendor subtype profile
    if (partner.vendor) {
      await tx.vendor.update({
        where: { id: partner.vendor.id },
        data: { deletedAt: now },
      });
    }

    // Cascade soft delete timestamp to associated profile addresses
    await tx.businessPartnerAddress.updateMany({
      where: { businessPartnerId: businessPartnerId },
      data: { deletedAt: now },
    });

    return {
      success: true,
      message: 'Business partner and associated sub-profiles soft-deleted successfully.',
    };
  });
}
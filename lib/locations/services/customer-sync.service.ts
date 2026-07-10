// lib/inflow/services/customer.sync.ts

import { Prisma } from "@/generated/prisma/client";
import { ensureLocationShell, ensurePaymentTermsShell } from "@/lib/inflow/services/helpers";
import { InflowCustomer } from "@/lib/inflow/types";
import { getTaxingScheme } from "@/lib/inflow/data/taxing-schemes";
import { syncTaxingScheme } from "@/lib/inflow/services/taxing-scheme.sync";
import { getPricingScheme } from "@/lib/inflow/data/pricing-schemes";
import { syncPricingScheme } from "@/lib/inflow/services/pricing-scheme.sync";

/**
 * Syncs a single customer payload into the local database using an ongoing Prisma transaction.
 */
export async function syncCustomer(
  tx: any,
  customer: InflowCustomer,
  caches: { verifiedLocationIds: Set<string>; verifiedPaymentTermsIds: Set<string> }
) {
  const cleanEmail = customer.email?.trim().toLowerCase();

  /**
   * STEP 1: Rich Foreign Key Healing (Locations & Terms)
   */
  if (customer.defaultLocation?.locationId && !caches.verifiedLocationIds.has(customer.defaultLocation.locationId)) {
    await ensureLocationShell(tx, {
      inflowId: customer.defaultLocation.locationId,
      name: customer.defaultLocation.name || "Default Warehouse",
      isActive: customer.defaultLocation.isActive,
      isDefault: customer.defaultLocation.isDefault,
      address: customer.defaultLocation.address,
    });
    caches.verifiedLocationIds.add(customer.defaultLocation.locationId);
  }

  if (customer.defaultPaymentTerms?.paymentTermsId && !caches.verifiedPaymentTermsIds.has(customer.defaultPaymentTerms.paymentTermsId)) {
    await ensurePaymentTermsShell(tx, {
      inflowId: customer.defaultPaymentTerms.paymentTermsId,
      name: customer.defaultPaymentTerms.name || "Standard Terms",
    });
    caches.verifiedPaymentTermsIds.add(customer.defaultPaymentTerms.paymentTermsId);
  }

  /**
   * STEP 1.5: SELF-HEALING FOREIGN KEY GUARDS (Team Members)
   */
  let validLastModifiedById: string | null = null;
  if (customer.lastModifiedById) {
    const localMember = await tx.teamMember.findUnique({
      where: { inflowId: customer.lastModifiedById },
      select: { inflowId: true }
    });
    
    if (localMember) {
      validLastModifiedById = localMember.inflowId;
    } else {
      console.warn(
        `[Sync Notification] TeamMember with inflowId "${customer.lastModifiedById}" not synced yet. Setting customer.lastModifiedById to null.`
      );
    }
  }

  let validSalesRepId: string | null = null;
  if (customer.defaultSalesRepTeamMemberId) { // Fixed: Checked against the correct source property
    const localMember = await tx.teamMember.findUnique({
      where: { inflowId: customer.defaultSalesRepTeamMemberId },
      select: { inflowId: true }
    });
    
    if (localMember) {
      validSalesRepId = localMember.inflowId;
    } else {
      console.warn(
        `[Sync Notification] Sales Rep member with inflowId "${customer.defaultSalesRepTeamMemberId}" not synced yet.`
      );
    }
  }

  // JIT Self-Healing Layer for missing pricing scheme
  let validPricingSchemeId: string | null = null;
  if (customer.pricingSchemeId) {
    const localPricingScheme = await tx.pricingScheme.findUnique({
      where: { inflowId: customer.pricingSchemeId },
      select: { inflowId: true }
    });
    
    if (!localPricingScheme) {
      try {
        console.log(`[JIT Sync] PricingScheme "${customer.pricingSchemeId}" missing locally. Fetching...`);
        const pricingScheme = await getPricingScheme(customer.pricingSchemeId);
        if (pricingScheme) {
          await syncPricingScheme(tx, pricingScheme);
          validPricingSchemeId = customer.pricingSchemeId;
        }
      } catch (err) {
        console.error(`[JIT Sync Error] Could not recover Pricing Scheme:`, err);
        validPricingSchemeId = null;
      }
    } else {
      validPricingSchemeId = localPricingScheme.inflowId;
    }
  }

  // JIT Self-Healing Layer for missing taxing scheme
  let validTaxingSchemeId: string | null = null;
  if (customer.taxingSchemeId) {
    const localTaxingScheme = await tx.taxingScheme.findUnique({
      where: { inflowId: customer.taxingSchemeId },
      select: { inflowId: true }
    });
    
    if (!localTaxingScheme) {
      try {
        console.log(`[JIT Sync] TaxingScheme "${customer.taxingSchemeId}" missing locally. Fetching...`);
        const taxingScheme = await getTaxingScheme(customer.taxingSchemeId);
        if (taxingScheme) {
          await syncTaxingScheme(tx, taxingScheme);
          validTaxingSchemeId = customer.taxingSchemeId;
        }
      } catch (err) {
        console.error(`[JIT Sync Error] Could not recover Taxing Scheme:`, err);
        validTaxingSchemeId = null;
      }
    } else {
      validTaxingSchemeId = localTaxingScheme.inflowId;
    }
  }

  /**
   * STEP 2: Handle BusinessPartner Row Identity Linkages
   */
  const existingCustomerWithPartner = await tx.customer.findUnique({
    where: { inflowId: customer.customerId },
    select: { businessPartnerId: true },
  });

  const partner = await tx.businessPartner.upsert({
    where: {
      id: existingCustomerWithPartner?.businessPartnerId ?? "NEVER_MATCH_GUID",
    },
    create: {
      name: customer.name,
      contactName: customer.contactName,
      email: cleanEmail,
      phone: customer.phone,
      fax: customer.fax,
      website: customer.website,
      remarks: customer.remarks,
      isActive: customer.isActive ?? true,
    },
    update: {
      name: customer.name,
      contactName: customer.contactName,
      email: cleanEmail,
      phone: customer.phone,
      fax: customer.fax,
      website: customer.website,
      remarks: customer.remarks,
      isActive: customer.isActive ?? true,
    },
  });

  /**
   * STEP 3: Process Addresses Collection
   */
  const addressesToProcess = [...(customer.addresses || [])];
  if (customer.defaultBillingAddress && !addressesToProcess.some(a => a.customerAddressId === customer.defaultBillingAddress?.customerAddressId)) {
    addressesToProcess.push(customer.defaultBillingAddress);
  }
  if (customer.defaultShippingAddress && !addressesToProcess.some(a => a.customerAddressId === customer.defaultShippingAddress?.customerAddressId)) {
    addressesToProcess.push(customer.defaultShippingAddress);
  }

  for (const addr of addressesToProcess) {
    if (!addr.customerAddressId) continue;
    await tx.businessPartnerAddress.upsert({
      where: { inflowId: addr.customerAddressId },
      create: {
        inflowId: addr.customerAddressId,
        businessPartnerId: partner.id,
        name: addr.name || "Main Address",
        address1: addr.address?.address1,
        address2: addr.address?.address2,
        city: addr.address?.city,
        state: addr.address?.state,
        country: addr.address?.country,
        postalCode: addr.address?.postalCode,
        remarks: addr.address?.remarks,
        addressType: addr.address?.addressType ? addr.address.addressType.charAt(0).toUpperCase() + addr.address.addressType.slice(1) : null,
      },
      update: {
        name: addr.name,
        address1: addr.address?.address1,
        address2: addr.address?.address2,
        city: addr.address?.city,
        state: addr.address?.state,
        country: addr.address?.country,
        postalCode: addr.address?.postalCode,
        remarks: addr.address?.remarks,
        addressType: addr.address?.addressType ? addr.address.addressType.charAt(0).toUpperCase() + addr.address.addressType.slice(1) : null,
      },
    });
  }

  /**
   * STEP 4: Upsert Core Customer Record WITH Relations Included
   */
  const syncedCustomer = await tx.customer.upsert({
    where: { inflowId: customer.customerId },
    create: {
      inflowId: customer.customerId,
      businessPartnerId: partner.id,
      taxExemptNumber: customer.taxExemptNumber,
      defaultCarrier: customer.defaultCarrier,
      defaultPaymentMethod: customer.defaultPaymentMethod,
      discount: customer.discount ? new Prisma.Decimal(customer.discount) : null,
      defaultLocationId: customer.defaultLocation?.locationId || customer.defaultLocationId,
      defaultPaymentTermsId: customer.defaultPaymentTerms?.paymentTermsId || customer.defaultPaymentTermsId,
      pricingSchemeId: validPricingSchemeId,
      taxingSchemeId: validTaxingSchemeId,
      defaultSalesRepTeamMemberId: validSalesRepId,
      lastModifiedById: validLastModifiedById,
      lastModifiedDttm: customer.lastModifiedDttm ? new Date(customer.lastModifiedDttm) : null,
      defaultBillingAddressId: customer.defaultBillingAddress?.customerAddressId,
      defaultShippingAddressId: customer.defaultShippingAddress?.customerAddressId,
    },
    update: {
      taxExemptNumber: customer.taxExemptNumber,
      defaultCarrier: customer.defaultCarrier,
      defaultPaymentMethod: customer.defaultPaymentMethod,
      discount: customer.discount ? new Prisma.Decimal(customer.discount) : null,
      defaultLocationId: customer.defaultLocation?.locationId || customer.defaultLocationId,
      defaultPaymentTermsId: customer.defaultPaymentTerms?.paymentTermsId || customer.defaultPaymentTermsId,
      pricingSchemeId: validPricingSchemeId,
      taxingSchemeId: validTaxingSchemeId,
      defaultSalesRepTeamMemberId: validSalesRepId,
      lastModifiedById: validLastModifiedById,
      lastModifiedDttm: customer.lastModifiedDttm ? new Date(customer.lastModifiedDttm) : null,
      defaultBillingAddressId: customer.defaultBillingAddress?.customerAddressId,
      defaultShippingAddressId: customer.defaultShippingAddress?.customerAddressId,
    },
    // CRITICAL FIX: Tell prisma to return the freshly saved nested data fields
    include: {
      businessPartner: {
        include: {
          addresses: true
        }
      }
    }
  });

  /**
   * STEP 5: Storefront Web Account Coupling
   */
  if (cleanEmail) {
    const existingUser = await tx.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, inflowCustomerId: true }
    });
    if (existingUser && existingUser.inflowCustomerId !== syncedCustomer.id) {
      await tx.user.update({
        where: { id: existingUser.id },
        data: { inflowCustomerId: syncedCustomer.id }
      });
    }
  }

  /**
   * STEP 6: Ledger Data Collections (Dues, Balances, Credits)
   */
  await tx.customerDue.deleteMany({ where: { customerId: syncedCustomer.inflowId } });
  if (customer.dues?.length) {
    await tx.customerDue.createMany({
      data: customer.dues.filter((due) => due.currencyId).map((due) => ({
        inflowId: due.customerDueId,
        customerId: customer.customerId,
        currencyId: due.currencyId!,
        amountCurrent: new Prisma.Decimal(due.amountCurrent || 0),
        amount1To30: new Prisma.Decimal(due.amount1To30 || 0),
        amount31To60: new Prisma.Decimal(due.amount31To60 || 0),
        amount61Plus: new Prisma.Decimal(due.amount61Plus || 0),
      })),
    });
  }

  await tx.customerBalance.deleteMany({ where: { customerId: syncedCustomer.inflowId } });
  if (customer.balances?.length) {
    await tx.customerBalance.createMany({
      data: customer.balances.map((balance) => ({
        inflowId: balance.customerBalanceId,
        customerId: customer.customerId,
        currencyId: balance.currencyId,
        balance: new Prisma.Decimal(balance.balance || 0),
      })),
    });
  }

  await tx.customerCredit.deleteMany({ where: { customerId: syncedCustomer.inflowId } });
  if (customer.credits?.length) {
    await tx.customerCredit.createMany({
      data: customer.credits.map((credit) => ({
        inflowId: credit.customerCreditId,
        customerId: customer.customerId,
        currencyId: credit.currencyId,
        credit: new Prisma.Decimal(credit.credit || 0),
      })),
    });
  }

  /**
   * STEP 7: Construct Outbound Representation
   */
  const inflowPayload = {
    id: syncedCustomer.id,
    customerId: syncedCustomer.inflowId,
    name: syncedCustomer.businessPartner.name,
    contactName: syncedCustomer.businessPartner.contactName,
    email: syncedCustomer.businessPartner.email,
    phone: syncedCustomer.businessPartner.phone,
    fax: syncedCustomer.businessPartner.fax,
    website: syncedCustomer.businessPartner.website,
    remarks: syncedCustomer.businessPartner.remarks,
    discount: syncedCustomer.discount ? syncedCustomer.discount.toString() : null,
    isActive: syncedCustomer.businessPartner.isActive,
    taxExemptNumber: syncedCustomer.taxExemptNumber,
    defaultLocationId: syncedCustomer.defaultLocationId,
    defaultCarrier: syncedCustomer.defaultCarrier,
    defaultPaymentMethod: syncedCustomer.defaultPaymentMethod,
    defaultPaymentTermsId: syncedCustomer.defaultPaymentTermsId,
    pricingSchemeId: syncedCustomer.pricingSchemeId,
    taxingSchemeId: syncedCustomer.taxingSchemeId,
    defaultSalesRepTeamMemberId: syncedCustomer.defaultSalesRepTeamMemberId,
    defaultBillingAddressId: syncedCustomer.defaultBillingAddressId,
    defaultShippingAddressId: syncedCustomer.defaultShippingAddressId,
    addresses: syncedCustomer.businessPartner.addresses.map((addr: any) => ({
      customerAddressId: addr.inflowId,
      customerId: syncedCustomer.inflowId,
      name: addr.name,
      address: {
        addressType: addr.addressType,
        address1: addr.address1,
        address2: addr.address2,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country,
        remarks: addr.remarks
      }
    })),
    // Fixed: Read custom fields directly from the incoming webhook object since they aren't stored via database models
    customFields: {
      custom1: customer.customFields?.custom1 || "",
      custom2: customer.customFields?.custom2 || "",
      custom3: customer.customFields?.custom3 || "",
      custom4: customer.customFields?.custom4 || "",
      custom5: customer.customFields?.custom5 || "",
      custom6: customer.customFields?.custom6 || "",
      custom7: customer.customFields?.custom7 || "",
      custom8: customer.customFields?.custom8 || "",
      custom9: customer.customFields?.custom9 || "",
      custom10: customer.customFields?.custom10 || "",
    }
  };

  return inflowPayload;
}
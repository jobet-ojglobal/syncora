// lib/inflow/services/customer.sync.ts

import { Prisma } from "@/generated/prisma/client";
import { ensureLocationShell, ensurePaymentTermsShell, ensurePricingSchemeShell, ensureTaxingSchemeShell } from "./ensure.service";
import { InflowCustomer } from "../types";
import { getTaxingScheme } from "../data/taxing-schemes";
import { syncTaxingScheme } from "./taxing-scheme.sync";
import { getPricingScheme } from "../data/pricing-schemes";
import { syncPricingScheme } from "./pricing-scheme.sync";
import { syncTeamMember } from "./team-member.sync";


type SyncCache = {
  verifiedTeamMemberIds?: Set<string>;
  verifiedCategoryIds?: Set<string>;
  verifiedVendorIds?: Set<string>;
  verifiedLocationIds?: Set<string>;
  verifiedTaxingSchemes?: Set<string>;
  verifiedTaxCodes?: Set<string>;
  verifiedOperationTypes?: Set<string>;
  verifiedPricingSchemeIds?: Set<string>;
  verifiedProductIds?: Set<string>;
  verifiedPaymentTermsIds?: Set<string>;
};

/**
 * Syncs a single customer payload into the local database using an ongoing Prisma transaction.
 */
export async function syncCustomer(
  tx: any,
  customer: InflowCustomer,
  caches: SyncCache
) {
  const cleanEmail = customer.email?.trim().toLowerCase();

  const verifiedLocations = caches?.verifiedLocationIds ?? new Set<string>();
  const verifiedPaymentTerms = caches?.verifiedPaymentTermsIds ?? new Set<string>();
  const verifiedTeamMembers = caches?.verifiedTeamMemberIds ?? new Set<string>();
  const verifiedPricingSchemes = caches?.verifiedPricingSchemeIds ?? new Set<string>();
  const verifiedTaxingSchemes = caches?.verifiedTaxingSchemes ?? new Set<string>();

  /**
   * STEP 1: Rich Foreign Key Healing (Locations & Terms)
   */
  // if (customer.defaultLocation?.locationId && !caches.verifiedLocationIds.has(customer.defaultLocation.locationId)) {
  //   await ensureLocationShell(tx, {
  //     inflowId: customer.defaultLocation.locationId,
  //     name: customer.defaultLocation.name || "Default Warehouse",
  //     isActive: customer.defaultLocation.isActive,
  //     isDefault: customer.defaultLocation.isDefault,
  //     address: customer.defaultLocation.address,
  //   });
  //   caches.verifiedLocationIds.add(customer.defaultLocation.locationId);
  // }

  let validDefaultLocationId: string | null = null;
  if (customer.defaultLocation?.locationId) {
    if (verifiedLocations.has(customer.defaultLocation?.locationId)) {
      validDefaultLocationId = customer.defaultLocation?.locationId;
    } else {
      const localLoc = await tx.location.findUnique({
        where: { inflowId: customer.defaultLocation?.locationId },
        select: { inflowId: true },
      });

      if (localLoc) {
        validDefaultLocationId = localLoc.inflowId;
        verifiedLocations.add(localLoc.inflowId);
      } else if (customer.defaultLocation) {
        console.warn(
          `[Sync Notification] Target Location "${customer.defaultLocation?.locationId}" missing locally. Creating Location Shell JIT...`
        );
        const syncedLoc = await ensureLocationShell(tx, customer.defaultLocation);
        if (syncedLoc?.inflowId) {
          validDefaultLocationId = syncedLoc.inflowId;
          verifiedLocations.add(syncedLoc.inflowId);
        }
      }
    }
  }

  // if (customer.defaultPaymentTerms?.paymentTermsId && !caches.verifiedPaymentTermsIds.has(customer.defaultPaymentTerms.paymentTermsId)) {
  //   await ensurePaymentTermsShell(tx, {
  //     inflowId: customer.defaultPaymentTerms.paymentTermsId,
  //     name: customer.defaultPaymentTerms.name || "Standard Terms",
  //   });
  //   caches.verifiedPaymentTermsIds.add(customer.defaultPaymentTerms.paymentTermsId);
  // }

  let validPaymentTermId: string | null = null;
    if (customer.defaultPaymentTermsId) {
      if (verifiedPaymentTerms.has(customer.defaultPaymentTermsId)) {
        validPaymentTermId = customer.defaultPaymentTermsId;
      } else {
        const localPaymentTerm = await tx.paymentTerm.findUnique({
          where: { inflowId: customer.defaultPaymentTermsId },
          select: { inflowId: true }
        });
        
        if (localPaymentTerm) {
          validPaymentTermId = localPaymentTerm.inflowId;
          verifiedPaymentTerms.add(localPaymentTerm.inflowId);
        } else if (customer.defaultPaymentTerms) {
          console.warn(
            `[Sync Notification] Payment Terms "${customer.defaultPaymentTermsId}" missing locally. Syncing JIT...`
          );
          const newPayment = await ensurePaymentTermsShell(tx, customer.defaultPaymentTerms);
          if (newPayment?.inflowId) {
            validPaymentTermId = newPayment.inflowId;
            verifiedPaymentTerms.add(newPayment.inflowId);
          }
        }
      }
    }

  /**
   * STEP 1.5: SELF-HEALING FOREIGN KEY GUARDS (Team Members)
   */
  // let validLastModifiedById: string | null = null;
  // if (customer.lastModifiedById) {
  //   const localMember = await tx.teamMember.findUnique({
  //     where: { inflowId: customer.lastModifiedById },
  //     select: { inflowId: true }
  //   });
    
  //   if (localMember) {
  //     validLastModifiedById = localMember.inflowId;
  //   } else {
  //     console.warn(
  //       `[Sync Notification] TeamMember with inflowId "${customer.lastModifiedById}" not synced yet. Setting customer.lastModifiedById to null.`
  //     );
  //   }
  // }

  let validLastModifiedById: string | null = null;
  if (customer.lastModifiedById) {
    if (verifiedTeamMembers.has(customer.lastModifiedById)) {
      validLastModifiedById = customer.lastModifiedById;
    } else {
      const localMember = await tx.teamMember.findUnique({
        where: { inflowId: customer.lastModifiedById },
        select: { inflowId: true },
      });

      if (localMember) {
        validLastModifiedById = localMember.inflowId;
        verifiedTeamMembers.add(localMember.inflowId);
      } else if (customer.lastModifiedBy) {
        console.warn(
          `[Sync Notification] TeamMember with inflowId "${customer.lastModifiedById}" missing locally. Syncing JIT...`
        );
        const syncMember = await syncTeamMember(tx, customer.lastModifiedBy);
        if (syncMember?.inflowId) {
          validLastModifiedById = syncMember.inflowId;
          verifiedTeamMembers.add(syncMember.inflowId);
        }
      }
    }
  }

  let validSalesRepId: string | null = null;
  if (customer.defaultSalesRepTeamMemberId) {
    if (verifiedTeamMembers.has(customer.defaultSalesRepTeamMemberId)) {
      validSalesRepId = customer.defaultSalesRepTeamMemberId;
    } else {
      const localMember = await tx.teamMember.findUnique({
        where: { inflowId: customer.defaultSalesRepTeamMemberId },
        select: { inflowId: true },
      });

      if (localMember) {
        validSalesRepId = localMember.inflowId;
        verifiedTeamMembers.add(localMember.inflowId);
      } else if (customer.defaultSalesRepTeamMember) {
        console.warn(
          `[Sync Notification] Sales Rep member with inflowId "${customer.defaultSalesRepTeamMemberId}" missing locally. Syncing JIT...`
        );
        const syncMember = await syncTeamMember(tx, customer.defaultSalesRepTeamMember);
        if (syncMember?.inflowId) {
          validSalesRepId = syncMember.inflowId;
          verifiedTeamMembers.add(syncMember.inflowId);
        }
      }
    }
  }

  // let validSalesRepId: string | null = null;
  // if (customer.defaultSalesRepTeamMemberId) { // Fixed: Checked against the correct source property
  //   const localMember = await tx.teamMember.findUnique({
  //     where: { inflowId: customer.defaultSalesRepTeamMemberId },
  //     select: { inflowId: true }
  //   });
    
  //   if (localMember) {
  //     validSalesRepId = localMember.inflowId;
  //   } else {
  //     console.warn(
  //       `[Sync Notification] Sales Rep member with inflowId "${customer.defaultSalesRepTeamMemberId}" not synced yet.`
  //     );
  //   }
  // }

  // JIT Self-Healing Layer for missing pricing scheme
  // let validPricingSchemeId: string | null = null;
  // if (customer.pricingSchemeId) {
  //   const localPricingScheme = await tx.pricingScheme.findUnique({
  //     where: { inflowId: customer.pricingSchemeId },
  //     select: { inflowId: true }
  //   });
    
  //   if (!localPricingScheme) {
  //     try {
  //       console.log(`[JIT Sync] PricingScheme "${customer.pricingSchemeId}" missing locally. Fetching...`);
  //       const pricingScheme = await getPricingScheme(customer.pricingSchemeId);
  //       if (pricingScheme) {
  //         await syncPricingScheme(tx, pricingScheme);
  //         validPricingSchemeId = customer.pricingSchemeId;
  //       }
  //     } catch (err) {
  //       console.error(`[JIT Sync Error] Could not recover Pricing Scheme:`, err);
  //       validPricingSchemeId = null;
  //     }
  //   } else {
  //     validPricingSchemeId = localPricingScheme.inflowId;
  //   }
  // }

  let validPricingSchemeId: string | null = null;
  
  if (customer.pricingSchemeId) {
    // 1. Check in-memory cache first
    if (verifiedPricingSchemes?.has(customer.pricingSchemeId)) {
      validPricingSchemeId = customer.pricingSchemeId;
    } else {
      // 2. Query database for local existence
      const localScheme = await tx.pricingScheme.findUnique({
        where: { inflowId: customer.pricingSchemeId },
        select: { inflowId: true },
      });

      if (localScheme) {
        validPricingSchemeId = localScheme.inflowId;
        verifiedPricingSchemes?.add(localScheme.inflowId);
      } else if (customer.pricingScheme) {
        // 3. JIT Shell Creation / Fallback Sync
        console.warn(
          `[Sync Notification] PricingScheme "${customer.pricingSchemeId}" missing locally. Syncing JIT...`
        );
        const syncedScheme = await ensurePricingSchemeShell(tx, customer.pricingScheme);
        if (syncedScheme?.inflowId) {
          validPricingSchemeId = syncedScheme.inflowId;
          verifiedPricingSchemes?.add(syncedScheme.inflowId);
        }
      }
    }
  }

  // JIT Self-Healing Layer for missing taxing scheme
  // let validTaxingSchemeId: string | null = null;
  // if (customer.taxingSchemeId) {
  //   const localTaxingScheme = await tx.taxingScheme.findUnique({
  //     where: { inflowId: customer.taxingSchemeId },
  //     select: { inflowId: true }
  //   });
    
  //   if (!localTaxingScheme) {
  //     try {
  //       console.log(`[JIT Sync] TaxingScheme "${customer.taxingSchemeId}" missing locally. Fetching...`);
  //       const taxingScheme = await getTaxingScheme(customer.taxingSchemeId);
  //       if (taxingScheme) {
  //         await syncTaxingScheme(tx, taxingScheme);
  //         validTaxingSchemeId = customer.taxingSchemeId;
  //       }
  //     } catch (err) {
  //       console.error(`[JIT Sync Error] Could not recover Taxing Scheme:`, err);
  //       validTaxingSchemeId = null;
  //     }
  //   } else {
  //     validTaxingSchemeId = localTaxingScheme.inflowId;
  //   }
  // }

  let validTaxingSchemeId: string | null = null;
    if (customer.taxingSchemeId) {
      if (verifiedTaxingSchemes.has(customer.taxingSchemeId)) {
        validTaxingSchemeId = customer.taxingSchemeId;
      } else {
        const localTaxingScheme = await tx.taxingScheme.findUnique({
          where: { inflowId: customer.taxingSchemeId },
          select: { inflowId: true }
        });
        
        if (localTaxingScheme) {
          validTaxingSchemeId = localTaxingScheme.inflowId;
          verifiedTaxingSchemes.add(localTaxingScheme.inflowId);
        } else if (customer.taxingScheme) {
          console.warn(
            `[Sync Notification] Taxing Scheme "${customer.taxingSchemeId}" missing locally. Syncing JIT...`
          );
          const newTaxingScheme = await ensureTaxingSchemeShell(tx, customer.taxingScheme);
          if (newTaxingScheme?.inflowId) {
            validTaxingSchemeId = newTaxingScheme.inflowId;
            verifiedTaxingSchemes.add(newTaxingScheme.inflowId);
          }
        }
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
      defaultLocationId: validDefaultLocationId,
      defaultPaymentTermsId: validPaymentTermId,
      pricingSchemeId: validPricingSchemeId,
      taxingSchemeId: validTaxingSchemeId,
      defaultSalesRepTeamMemberId: validSalesRepId,
      lastModifiedById: validLastModifiedById,
      defaultBillingAddressId: customer.defaultBillingAddress?.customerAddressId,
      defaultShippingAddressId: customer.defaultShippingAddress?.customerAddressId,
    },
    update: {
      taxExemptNumber: customer.taxExemptNumber,
      defaultCarrier: customer.defaultCarrier,
      defaultPaymentMethod: customer.defaultPaymentMethod,
      discount: customer.discount ? new Prisma.Decimal(customer.discount) : null,
      defaultLocationId: validDefaultLocationId,
      defaultPaymentTermsId: validPaymentTermId,
      pricingSchemeId: validPricingSchemeId,
      taxingSchemeId: validTaxingSchemeId,
      defaultSalesRepTeamMemberId: validSalesRepId,
      lastModifiedById: validLastModifiedById,
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

// // lib/inflow/services/customer.sync.ts

// import { Prisma } from "@/generated/prisma/client";
// import { ensureLocationShell, ensurePaymentTermsShell } from "./helpers";
// import { InflowCustomer } from "../types";
// import { getTaxingScheme } from "../data/taxing-schemes";
// import { syncTaxingScheme } from "./taxing-scheme.sync";
// import { getPricingScheme } from "../data/pricing-schemes";
// import { syncPricingScheme } from "./pricing-scheme.sync";

// /**
//  * Syncs a single customer payload into the local database using an ongoing Prisma transaction.
//  */
// export async function syncCustomer(
//   tx: any,
//   customer: InflowCustomer,
//   caches: { verifiedLocationIds: Set<string>; verifiedPaymentTermsIds: Set<string> }
// ) {
//   const cleanEmail = customer.email?.trim().toLowerCase();

//   /**
//    * STEP 1: Rich Foreign Key Healing (Locations & Terms)
//    */
//   if (customer.defaultLocation?.locationId && !caches.verifiedLocationIds.has(customer.defaultLocation.locationId)) {
//     await ensureLocationShell(tx, {
//       inflowId: customer.defaultLocation.locationId,
//       name: customer.defaultLocation.name || "Default Warehouse",
//       isActive: customer.defaultLocation.isActive,
//       isDefault: customer.defaultLocation.isDefault,
//       address: customer.defaultLocation.address,
//     });
//     caches.verifiedLocationIds.add(customer.defaultLocation.locationId);
//   }

//   if (customer.defaultPaymentTerms?.paymentTermsId && !caches.verifiedPaymentTermsIds.has(customer.defaultPaymentTerms.paymentTermsId)) {
//     await ensurePaymentTermsShell(tx, {
//       inflowId: customer.defaultPaymentTerms.paymentTermsId,
//       name: customer.defaultPaymentTerms.name || "Standard Terms",
//     });
//     caches.verifiedPaymentTermsIds.add(customer.defaultPaymentTerms.paymentTermsId);
//   }

//   /**
//    * STEP 1.5: 🛡️ SELF-HEALING FOREIGN KEY GUARDS (Team Members)
//    */
//   // 3. 🛡️ FOREIGN KEY GUARD: Check if the TeamMember exists before assigning lastModifiedById
//   let validLastModifiedById: string | null = null;
//   if (customer.lastModifiedById) {
//     const localMember = await tx.teamMember.findUnique({
//       where: { inflowId: customer.lastModifiedById },
//       select: { inflowId: true }
//     });
    
//     if (localMember) {
//       validLastModifiedById = localMember.inflowId;
//     } else {
//       console.warn(
//         `[Sync Notification] TeamMember with inflowId "${customer.lastModifiedById}" not synced yet. Setting customer.lastModifiedById to null to avoid constraint errors.`
//       );
//     }
//   }

//   let validSalesRepId: string | null = null;
//   if (customer.lastModifiedById) {
//     const localMember = await tx.teamMember.findUnique({
//       where: { inflowId: customer.lastModifiedById },
//       select: { inflowId: true }
//     });
    
//     if (localMember) {
//       validSalesRepId = localMember.inflowId;
//     } else {
//       console.warn(
//         `[Sync Notification] Sales Rep member with inflowId "${customer.lastModifiedById}" not synced yet. Setting customer.lastModifiedById to null to avoid constraint errors.`
//       );
//     }
//   }

//   // JIT Self-Healing Layer for missing pricing scheme
//   let validPricingSchemeId: string | null = null;

//   if (customer.pricingSchemeId) {
//     const localPricingScheme = await tx.pricingScheme.findUnique({
//       where: { inflowId: customer.pricingSchemeId },
//       select: { inflowId: true }
//     });
    
//     if (!localPricingScheme) {
//       try {
//         console.log(`[JIT Sync] PricingScheme "${customer.pricingSchemeId}" missing locally. Fetching from cloud...`);
//         const pricingScheme = await getPricingScheme(customer.pricingSchemeId);
        
//         if (pricingScheme) {
//           // Execute the decoupled sync function we extracted earlier
//           await syncPricingScheme(tx, pricingScheme);
//           // Use the ID directly from the cloud payload since it was just inserted
//           validPricingSchemeId = customer.pricingSchemeId;
//         }
//       } catch (err) {
//         console.error(`[JIT Sync Error] Could not recover Pricing Scheme "${customer.pricingSchemeId}":`, err);
//         // Fallback safely to null to preserve primary customer sync process stability
//         validPricingSchemeId = null;
//       }
//     } else {
//       // Record exists locally! Map it safely.
//       validPricingSchemeId = localPricingScheme.inflowId;
//     }
//   }

//   // JIT Self-Healing Layer for missing taxing scheme
//   let validTaxingSchemeId: string | null = null;

//   if (customer.taxingSchemeId) {
//     const localTaxingScheme = await tx.taxingScheme.findUnique({
//       where: { inflowId: customer.taxingSchemeId },
//       select: { inflowId: true }
//     });
    
//     if (!localTaxingScheme) {
//       try {
//         console.log(`[JIT Sync] TaxingScheme "${customer.taxingSchemeId}" missing locally. Fetching from cloud...`);
//         const taxingScheme = await getTaxingScheme(customer.taxingSchemeId);
        
//         if (taxingScheme) {
//           // Execute the decoupled sync function we extracted earlier
//           await syncTaxingScheme(tx, taxingScheme);
//           // Use the ID directly from the cloud payload since it was just inserted
//           validTaxingSchemeId = customer.taxingSchemeId;
//         }
//       } catch (err) {
//         console.error(`[JIT Sync Error] Could not recover Taxing Scheme "${customer.taxingSchemeId}":`, err);
//         // Fallback safely to null to preserve primary customer sync process stability
//         validTaxingSchemeId = null;
//       }
//     } else {
//       // Record exists locally! Map it safely.
//       validTaxingSchemeId = localTaxingScheme.inflowId;
//     }
//   }
  

//   /**
//    * STEP 2: Handle BusinessPartner Row Identity Linkages
//    */
//   const existingCustomerWithPartner = await tx.customer.findUnique({
//     where: { inflowId: customer.customerId },
//     select: { businessPartnerId: true },
//   });

//   const partner = await tx.businessPartner.upsert({
//     where: {
//       id: existingCustomerWithPartner?.businessPartnerId ?? "NEVER_MATCH_GUID",
//     },
//     create: {
//       name: customer.name,
//       contactName: customer.contactName,
//       email: cleanEmail,
//       phone: customer.phone,
//       fax: customer.fax,
//       website: customer.website,
//       remarks: customer.remarks,
//       isActive: customer.isActive ?? true,
//     },
//     update: {
//       name: customer.name,
//       contactName: customer.contactName,
//       email: cleanEmail,
//       phone: customer.phone,
//       fax: customer.fax,
//       website: customer.website,
//       remarks: customer.remarks,
//       isActive: customer.isActive ?? true,
//     },
//   });

//   /**
//    * STEP 3: Process Addresses Collection
//    */
//   const addressesToProcess = [...(customer.addresses || [])];
//   if (customer.defaultBillingAddress && !addressesToProcess.some(a => a.customerAddressId === customer.defaultBillingAddress?.customerAddressId)) {
//     addressesToProcess.push(customer.defaultBillingAddress);
//   }
//   if (customer.defaultShippingAddress && !addressesToProcess.some(a => a.customerAddressId === customer.defaultShippingAddress?.customerAddressId)) {
//     addressesToProcess.push(customer.defaultShippingAddress);
//   }

//   for (const addr of addressesToProcess) {
//     if (!addr.customerAddressId) continue;
//     await tx.businessPartnerAddress.upsert({
//       where: { inflowId: addr.customerAddressId },
//       create: {
//         inflowId: addr.customerAddressId,
//         businessPartnerId: partner.id,
//         name: addr.name || "Main Address",
//         address1: addr.address?.address1,
//         address2: addr.address?.address2,
//         city: addr.address?.city,
//         state: addr.address?.state,
//         country: addr.address?.country,
//         postalCode: addr.address?.postalCode,
//         remarks: addr.address?.remarks,
//         // to uppercase the first letter of the address type for consistency with the enum
//         addressType: addr.address?.addressType && addr.address?.addressType !== null ? addr.address?.addressType?.charAt(0).toUpperCase() + addr.address?.addressType?.slice(1) : null,
//       },
//       update: {
//         name: addr.name,
//         address1: addr.address?.address1,
//         address2: addr.address?.address2,
//         city: addr.address?.city,
//         state: addr.address?.state,
//         country: addr.address?.country,
//         postalCode: addr.address?.postalCode,
//         remarks: addr.address?.remarks,
//         // to uppercase the first letter of the address type for consistency with the enum
//         addressType: addr.address?.addressType && addr.address?.addressType !== null ? addr.address?.addressType?.charAt(0).toUpperCase() + addr.address?.addressType?.slice(1) : null,
//       },
//     });
//   }

//   /**
//    * STEP 4: Upsert Core Customer Record
//    */
//   const syncedCustomer = await tx.customer.upsert({
//     where: { inflowId: customer.customerId },
//     create: {
//       inflowId: customer.customerId,
//       businessPartnerId: partner.id,
//       taxExemptNumber: customer.taxExemptNumber,
//       defaultCarrier: customer.defaultCarrier,
//       defaultPaymentMethod: customer.defaultPaymentMethod,
//       discount: customer.discount ? new Prisma.Decimal(customer.discount) : null,
//       defaultLocationId: customer.defaultLocation?.locationId || customer.defaultLocationId,
//       defaultPaymentTermsId: customer.defaultPaymentTerms?.paymentTermsId || customer.defaultPaymentTermsId,
//       pricingSchemeId: customer.pricingSchemeId,
//       taxingSchemeId: customer.taxingSchemeId,
//       defaultSalesRepTeamMemberId: validSalesRepId,
//       lastModifiedById: validLastModifiedById,
//       lastModifiedDttm: customer.lastModifiedDttm ? new Date(customer.lastModifiedDttm) : null,
//       defaultBillingAddressId: customer.defaultBillingAddress?.customerAddressId,
//       defaultShippingAddressId: customer.defaultShippingAddress?.customerAddressId,
//     },
//     update: {
//       taxExemptNumber: customer.taxExemptNumber,
//       defaultCarrier: customer.defaultCarrier,
//       defaultPaymentMethod: customer.defaultPaymentMethod,
//       discount: customer.discount ? new Prisma.Decimal(customer.discount) : null,
//       defaultLocationId: customer.defaultLocation?.locationId || customer.defaultLocationId,
//       defaultPaymentTermsId: customer.defaultPaymentTerms?.paymentTermsId || customer.defaultPaymentTermsId,
//       pricingSchemeId: customer.pricingSchemeId,
//       taxingSchemeId: customer.taxingSchemeId,
//       defaultSalesRepTeamMemberId: validSalesRepId,
//       lastModifiedById: validLastModifiedById,
//       lastModifiedDttm: customer.lastModifiedDttm ? new Date(customer.lastModifiedDttm) : null,
//       defaultBillingAddressId: customer.defaultBillingAddress?.customerAddressId,
//       defaultShippingAddressId: customer.defaultShippingAddress?.customerAddressId,
//     },
//   });

//   /**
//    * STEP 5: Storefront Web Account Coupling (Self-Healing Auth Bridge)
//    */
//   if (cleanEmail) {
//     const existingUser = await tx.user.findUnique({
//       where: { email: cleanEmail },
//       select: { id: true, inflowCustomerId: true }
//     });
//     if (existingUser && existingUser.inflowCustomerId !== syncedCustomer.id) {
//       await tx.user.update({
//         where: { id: existingUser.id },
//         data: { inflowCustomerId: syncedCustomer.id }
//       });
//     }
//   }

//   /**
//    * STEP 6: Ledger Data Collections (Dues, Balances, Credits)
//    */
//   await tx.customerDue.deleteMany({ where: { customerId: syncedCustomer.inflowId } });
//   if (customer.dues?.length) {
//     await tx.customerDue.createMany({
//       data: customer.dues.filter((due) => due.currencyId).map((due) => ({
//         inflowId: due.customerDueId,
//         customerId: customer.customerId,
//         currencyId: due.currencyId!,
//         amountCurrent: new Prisma.Decimal(due.amountCurrent || 0),
//         amount1To30: new Prisma.Decimal(due.amount1To30 || 0),
//         amount31To60: new Prisma.Decimal(due.amount31To60 || 0),
//         amount61Plus: new Prisma.Decimal(due.amount61Plus || 0),
//       })),
//     });
//   }

//   await tx.customerBalance.deleteMany({ where: { customerId: syncedCustomer.inflowId } });
//   if (customer.balances?.length) {
//     await tx.customerBalance.createMany({
//       data: customer.balances.map((balance) => ({
//         inflowId: balance.customerBalanceId,
//         customerId: customer.customerId,
//         currencyId: balance.currencyId,
//         balance: new Prisma.Decimal(balance.balance || 0),
//       })),
//     });
//   }

//   await tx.customerCredit.deleteMany({ where: { customerId: syncedCustomer.inflowId } });
//   if (customer.credits?.length) {
//     await tx.customerCredit.createMany({
//       data: customer.credits.map((credit) => ({
//         inflowId: credit.customerCreditId,
//         customerId: customer.customerId,
//         currencyId: credit.currencyId,
//         credit: new Prisma.Decimal(credit.credit || 0),
//       })),
//     });
//   }


//   return syncCustomer;
// }
// services/sync/products/vendor.sync.ts
import { AddressType, Prisma } from "@/generated/prisma/client";
import { InflowVendor } from "../types";
import { upsertCurrencyScheme } from "./currency.sync";
import { ensureCurrencyShell, ensurePaymentTermsShell, ensureTaxingSchemeShell } from "./ensure.service";
import { ensureSyncProduct } from "./ensure-product.sync";
import { syncTaxingScheme } from "./taxing-scheme.sync";
import { syncTeamMember } from "./team-member.sync";

type Tx = Prisma.TransactionClient;

type VendorSyncCaches = {
  verifiedPaymentTermsIds: Set<string>;
  verifiedCurrencyIds: Set<string>;
  verifiedTaxingSchemeIds: Set<string>;
  verifiedTeamMemberIds?: Set<string>;
  verifiedCategoryIds?: Set<string>;
  verifiedVendorIds?: Set<string>;
  verifiedProductIds?: Set<string>;
};

// Helper: Safely convert numeric values to Prisma.Decimal
const toDecimal = (val: string | number | null | undefined): Prisma.Decimal | null => {
  if (val === null || val === undefined || val === "") return null;
  return new Prisma.Decimal(val);
};

/**
 * Syncs a single vendor payload into the local database using an ongoing Prisma transaction.
 */
export async function syncVendor(
  tx: Tx,
  vendor: InflowVendor,
  caches: VendorSyncCaches
) {
  const cleanEmail = vendor.email?.trim().toLowerCase();

  // Initialize optional cache sets if omitted
  const verifiedTeamMembers = caches.verifiedTeamMemberIds ??= new Set<string>();
  const verifiedProducts = caches.verifiedProductIds ??= new Set<string>();
  const verifiedPaymentTerms = caches.verifiedPaymentTermsIds ??= new Set<string>();
  const verifiedCurrencies = caches.verifiedCurrencyIds ??= new Set<string>();
  const verifiedTaxingSchemes = caches.verifiedTaxingSchemeIds ??= new Set<string>();

  /**
   * STEP 1: Inline Foreign Key Safety Check (Payment Terms, Currency, & Taxing Scheme)
   */

  let validPaymentTermId: string | null = null;
  if (vendor.defaultPaymentTermsId) {
    if (verifiedPaymentTerms.has(vendor.defaultPaymentTermsId)) {
      validPaymentTermId = vendor.defaultPaymentTermsId;
    } else {
      const localPaymentTerm = await tx.paymentTerm.findUnique({
        where: { inflowId: vendor.defaultPaymentTermsId },
        select: { inflowId: true }
      });
      
      if (localPaymentTerm) {
        validPaymentTermId = localPaymentTerm.inflowId;
        verifiedPaymentTerms.add(localPaymentTerm.inflowId);
      } else if (vendor.defaultPaymentTerms) {
        console.warn(
          `[Sync Notification] Payment Terms "${vendor.defaultPaymentTermsId}" missing locally. Syncing JIT...`
        );
        const newPayment = await ensurePaymentTermsShell(tx, vendor.defaultPaymentTerms);
        if (newPayment?.inflowId) {
          validPaymentTermId = newPayment.inflowId;
          verifiedPaymentTerms.add(newPayment.inflowId);
        }
      }
    }
  }

  let validCurrencyId: string | null = null;
  if (vendor.currencyId) {
    if (verifiedCurrencies.has(vendor.currencyId)) {
      validCurrencyId = vendor.currencyId;
    } else {
      const localCurrency = await tx.currency.findUnique({
        where: { inflowId: vendor.currencyId },
        select: { inflowId: true }
      });
      
      if (localCurrency) {
        validCurrencyId = localCurrency.inflowId;
        verifiedCurrencies.add(localCurrency.inflowId);
      } else if (vendor.currency) {
        console.warn(
          `[Sync Notification] Currency "${vendor.currencyId}" missing locally. Syncing JIT...`
        );
        const newPayment = await ensureCurrencyShell(tx, vendor.currency);
        if (newPayment?.inflowId) {
          validCurrencyId = newPayment.inflowId;
          verifiedCurrencies.add(newPayment.inflowId);
        }
      }
    }
  }

  let validTaxingSchemeId: string | null = null;
  if (vendor.taxingSchemeId) {
    if (verifiedTaxingSchemes.has(vendor.taxingSchemeId)) {
      validTaxingSchemeId = vendor.taxingSchemeId;
    } else {
      const localTaxingScheme = await tx.taxingScheme.findUnique({
        where: { inflowId: vendor.taxingSchemeId },
        select: { inflowId: true }
      });
      
      if (localTaxingScheme) {
        validTaxingSchemeId = localTaxingScheme.inflowId;
        verifiedTaxingSchemes.add(localTaxingScheme.inflowId);
      } else if (vendor.taxingScheme) {
        console.warn(
          `[Sync Notification] Taxing Scheme "${vendor.taxingSchemeId}" missing locally. Syncing JIT...`
        );
        const newTaxingScheme = await ensureTaxingSchemeShell(tx, vendor.taxingScheme);
        if (newTaxingScheme?.inflowId) {
          validTaxingSchemeId = newTaxingScheme.inflowId;
          verifiedTaxingSchemes.add(newTaxingScheme.inflowId);
        }
      }
    }
  }

  // if (vendor.taxingSchemeId && vendor.taxingScheme && !caches.verifiedTaxingSchemeIds.has(vendor.taxingSchemeId)) {
  //   await syncTaxingScheme(tx, vendor.taxingScheme);
  //   caches.verifiedTaxingSchemeIds.add(vendor.taxingSchemeId); // 🟢 FIXED: now populates verifiedTaxingSchemeIds
  // }

  /**
   * STEP 2: Upsert Parent BusinessPartner Profile row
   */
  const existingVendorWithPartner = await tx.vendor.findUnique({
    where: { inflowId: vendor.vendorId },
    select: { businessPartnerId: true },
  });

  const partnerPayload = {
    name: vendor.name,
    contactName: vendor.contactName,
    email: cleanEmail,
    phone: vendor.phone,
    fax: vendor.fax,
    website: vendor.website,
    remarks: vendor.remarks,
    isActive: vendor.isActive ?? true,
  };

  const partner = await tx.businessPartner.upsert({
    where: {
      id: existingVendorWithPartner?.businessPartnerId ?? "NEVER_MATCH_GUID",
    },
    create: partnerPayload,
    update: partnerPayload,
  });

  /**
   * STEP 3: Business Partner Addresses Sync
   */
  if (vendor.addresses?.length) {
    const addressesWithIds = vendor.addresses.filter((a) => a.vendorAddressId);
    if (addressesWithIds.length) {
      await tx.businessPartnerAddress.deleteMany({
        where: { businessPartnerId: partner.id },
      });

      await tx.businessPartnerAddress.createMany({
        data: addressesWithIds.map((addr) => ({
          inflowId: addr.vendorAddressId,
          businessPartnerId: partner.id,
          name: addr.name || "Main Address",
          address1: addr.address?.address1,
          address2: addr.address?.address2,
          city: addr.address?.city,
          state: addr.address?.state,
          country: addr.address?.country,
          postalCode: addr.address?.postalCode,
          remarks: addr.address?.remarks,
          addressType: addr.address?.addressType as AddressType | null,
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * STEP 3.5: 🛡️ SELF-HEALING FOREIGN KEY GUARD: TeamMember (lastModifiedById)
   */
  let validLastModifiedById: string | null = null;
  if (vendor.lastModifiedById) {
    if (verifiedTeamMembers.has(vendor.lastModifiedById)) {
      validLastModifiedById = vendor.lastModifiedById;
    } else {
      const localMember = await tx.teamMember.findUnique({
        where: { inflowId: vendor.lastModifiedById },
        select: { inflowId: true },
      });

      if (localMember) {
        validLastModifiedById = localMember.inflowId;
        verifiedTeamMembers.add(localMember.inflowId);
      } else if (vendor.lastModifiedBy) {
        console.warn(
          `[Sync Notification] TeamMember with inflowId "${vendor.lastModifiedById}" missing locally. Syncing JIT...`
        );
        const syncMember = await syncTeamMember(tx, vendor.lastModifiedBy);
        if (syncMember?.inflowId) {
          validLastModifiedById = syncMember.inflowId;
          verifiedTeamMembers.add(syncMember.inflowId);
        }
      }
    }
  }

  /**
   * STEP 4: Child Vendor Ledger Profile Upsert
   */
  const vendorPayload = {
    currencyId: validCurrencyId,
    defaultAddressId: vendor.defaultAddressId,
    defaultCarrier: vendor.defaultCarrier,
    defaultPaymentMethod: vendor.defaultPaymentMethod,
    defaultPaymentTermsId: validPaymentTermId,
    discount: toDecimal(vendor.discount),
    isTaxInclusivePricing: vendor.isTaxInclusivePricing ?? false,
    leadTimeDays: vendor.leadTimeDays,
    taxingSchemeId: validTaxingSchemeId,
    lastModifiedById: validLastModifiedById,
    lastModifiedDttm: vendor.lastModifiedDttm ? new Date(vendor.lastModifiedDttm) : null,
  };

  const syncedVendor = await tx.vendor.upsert({
    where: { inflowId: vendor.vendorId },
    create: {
      ...vendorPayload,
      inflowId: vendor.vendorId,
      businessPartnerId: partner.id,
    },
    update: vendorPayload,
  });

  /**
   * STEP 5: Child Vendor Items Sync
   */
  if (vendor.vendorItems !== undefined) {
    await tx.vendorItem.deleteMany({ where: { vendorId: vendor.vendorId } });

    if (vendor.vendorItems?.length) {
      const validItemsToCreate = [];

      for (const item of vendor.vendorItems) {
        if (!item.vendorItemId) continue;

        let validProductId: string | null = null;

        if (item.productId) {
          if (verifiedProducts.has(item.productId)) {
            validProductId = item.productId;
          } else {
            const localProduct = await tx.product.findUnique({
              where: { inflowId: item.productId },
              select: { inflowId: true },
            });

            if (localProduct) {
              validProductId = localProduct.inflowId;
              verifiedProducts.add(localProduct.inflowId);
            } else if (item.product) {
              console.warn(
                `[Sync Notification] Product with inflowId "${item.productId}" missing locally. Syncing JIT...`
              );
              // Pass downstream caches into ensureSyncProduct to prevent infinite sync loops
              const syncedProduct = await ensureSyncProduct(tx, item.product, undefined, caches);
              if (syncedProduct?.inflowId) {
                validProductId = syncedProduct.inflowId;
                verifiedProducts.add(syncedProduct.inflowId);
              }
            }
          }
        }

        if (!validProductId) {
          console.warn(
            `[Sync Notification] Skipping vendor item "${item.vendorItemId}" because productId could not be resolved.`
          );
          continue;
        }

        validItemsToCreate.push({
          inflowId: item.vendorItemId,
          vendorId: vendor.vendorId,
          productId: validProductId,
          vendorSku: item.vendorItemCode,
          unitCost: toDecimal(item.cost),
          lineNum: item.lineNum || null,
          leadTimeDays: item.leadTimeDays || null,
        });
      }

      if (validItemsToCreate.length > 0) {
        await tx.vendorItem.createMany({
          data: validItemsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  /**
   * STEP 6: Financial Collections Sync
   */
  await tx.vendorDue.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
  if (vendor.dues?.length) {
    await tx.vendorDue.createMany({
      data: vendor.dues.filter((due) => due.currencyId).map((due) => ({
        inflowId: due.vendorDueId,
        vendorId: vendor.vendorId,
        currencyId: due.currencyId,
        amountCurrent: toDecimal(due.amountCurrent) ?? new Prisma.Decimal(0),
        amount1To30: toDecimal(due.amount1To30) ?? new Prisma.Decimal(0),
        amount31To60: toDecimal(due.amount31To60) ?? new Prisma.Decimal(0),
        amount61Plus: toDecimal(due.amount61Plus) ?? new Prisma.Decimal(0),
      })),
    });
  }

  await tx.vendorBalance.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
  if (vendor.balances?.length) {
    await tx.vendorBalance.createMany({
      data: vendor.balances.map((bal) => ({
        inflowId: bal.vendorBalanceId,
        vendorId: vendor.vendorId,
        currencyId: bal.currencyId,
        balance: toDecimal(bal.balance) ?? new Prisma.Decimal(0),
      })),
    });
  }

  await tx.vendorCredit.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
  if (vendor.credits?.length) {
    await tx.vendorCredit.createMany({
      data: vendor.credits.map((cred) => ({
        inflowId: cred.vendorCreditId,
        vendorId: vendor.vendorId,
        currencyId: cred.currencyId,
        credit: toDecimal(cred.credit) ?? new Prisma.Decimal(0),
      })),
    });
  }

  /**
   * STEP 7: Vendor Attachments Sync
   */
  await tx.vendorAttachment.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
  if (vendor.attachments?.length) {
    await tx.vendorAttachment.createMany({
      data: vendor.attachments.map((att: any) => ({
        inflowId: att.inflowId || att.vendorAttachmentId,
        vendorId: vendor.vendorId,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize,
        contentType: att.contentType,
      })),
    });
  }

  return syncedVendor;
}

// // services/sync/products/vendor.sync.ts
// import { AddressType, Prisma } from "@/generated/prisma/client";
// import { ensurePaymentTermsShell } from "./ensure.service";
// import { InflowVendor } from "../types";
// import { syncTaxingScheme } from "./taxing-scheme.sync";
// import { syncTeamMember } from "./team-member.sync";
// import { syncProduct } from "./product.sync";
// import { upsertCurrencyScheme } from "./currency.sync";
// import { ensureSyncProduct } from "./ensure-product.sync";

// type Tx = Prisma.TransactionClient;


// /**
//  * Syncs a single vendor payload into the local database using an ongoing Prisma transaction.
//  */
// export async function syncVendor(
//   tx: Tx,
//   vendor: InflowVendor,
//   caches: { verifiedPaymentTermsIds: Set<string>; verifiedCurrencyIds: Set<string>; verifiedTaxingSchemeIds: Set<string>; }
// ) {
//   const cleanEmail = vendor.email?.trim().toLowerCase();

//   /**
//    * STEP 1: Inline Foreign Key Safety Check (Payment Terms & Currency)
//    */
//   if (vendor.defaultPaymentTermsId && !caches.verifiedPaymentTermsIds.has(vendor.defaultPaymentTermsId)) {
//     await ensurePaymentTermsShell(tx, {
//       inflowId: vendor.defaultPaymentTermsId,
//       name: `Terms Placeholder (${vendor.defaultPaymentTermsId.slice(0, 5)})`,
//     });
//     caches.verifiedPaymentTermsIds.add(vendor.defaultPaymentTermsId);
//   }

//   if (vendor.currencyId && vendor.currency && !caches.verifiedCurrencyIds.has(vendor.currencyId)) {
//     await upsertCurrencyScheme(tx, vendor.currency);
//     caches.verifiedCurrencyIds.add(vendor.currencyId);
//   }

//   if (vendor.taxingSchemeId && vendor?.taxingScheme && !caches.verifiedTaxingSchemeIds.has(vendor.taxingSchemeId)) {
//     await syncTaxingScheme(tx, vendor?.taxingScheme);
//     caches.verifiedCurrencyIds.add(vendor.taxingSchemeId);
//   }

//   /**
//    * STEP 2: Upsert Parent BusinessPartner Profile row
//    */
//   const existingVendorWithPartner = await tx.vendor.findUnique({
//     where: { inflowId: vendor.vendorId },
//     select: { businessPartnerId: true },
//   });

//   const partner = await tx.businessPartner.upsert({
//     where: {
//       id: existingVendorWithPartner?.businessPartnerId ?? "NEVER_MATCH_GUID",
//     },
//     create: {
//       name: vendor.name,
//       contactName: vendor.contactName,
//       email: cleanEmail,
//       phone: vendor.phone,
//       fax: vendor.fax,
//       website: vendor.website,
//       remarks: vendor.remarks,
//       isActive: vendor.isActive ?? true,
//     },
//     update: {
//       name: vendor.name,
//       contactName: vendor.contactName,
//       email: cleanEmail,
//       phone: vendor.phone,
//       fax: vendor.fax,
//       website: vendor.website,
//       remarks: vendor.remarks,
//       isActive: vendor.isActive ?? true,
//     },
//   });

//   /**
//    * STEP 3: Business Partner Addresses Synced (Optimized for performance)
//    */
//   if (vendor.addresses?.length) {
//     // Drop legacy entries to prevent orphaned or deleted sub-properties
//     const addressesWithIds = vendor.addresses.filter((a) => a.vendorAddressId);
//     if (addressesWithIds.length) {
//       await tx.businessPartnerAddress.deleteMany({
//         where: { businessPartnerId: partner.id }
//       });
      
//       await tx.businessPartnerAddress.createMany({
//         data: addressesWithIds.map((addr) => ({
//           inflowId: addr.vendorAddressId,
//           businessPartnerId: partner.id,
//           name: addr.name || "Main Address",
//           address1: addr.address?.address1,
//           address2: addr.address?.address2,
//           city: addr.address?.city,
//           state: addr.address?.state,
//           country: addr.address?.country,
//           postalCode: addr.address?.postalCode,
//           remarks: addr.address?.remarks,
//           addressType: addr.address?.addressType as AddressType | null,
//         })),
//         skipDuplicates: true,
//       });
//     }
//   }

//   /**
//    * STEP 3.5: 🛡️ SELF-HEALING FOREIGN KEY GUARD: TeamMember (lastModifiedById)
//    */
//   let validLastModifiedById: string | null = null;
//   if (vendor.lastModifiedById) {
//     const localMember = await tx.teamMember.findUnique({
//       where: { inflowId: vendor.lastModifiedById },
//       select: { inflowId: true }
//     });
    
//     if (localMember) {
//       validLastModifiedById = localMember.inflowId;
//     } else {
//       console.warn(
//         `[Sync Notification] TeamMember with inflowId "${vendor.lastModifiedById}" not synced yet. Setting vendor.lastModifiedById to null to avoid constraint errors.`
//       );
//       if(vendor.lastModifiedBy) {
//         console.log(vendor.lastModifiedBy)
//         const syncMember = await syncTeamMember(tx, vendor.lastModifiedBy);
//         if(syncMember) {
//           validLastModifiedById = syncMember.inflowId;
//         }
//       }
//     }
//   }

//   /**
//    * STEP 4: Child Vendor Ledger Profile Upsert
//    */
//   const syncedVendor = await tx.vendor.upsert({
//     where: { inflowId: vendor.vendorId },
//     create: {
//       inflowId: vendor.vendorId,
//       businessPartnerId: partner.id,
//       currencyId: vendor.currencyId,
//       defaultAddressId: vendor.defaultAddressId,
//       defaultCarrier: vendor.defaultCarrier,
//       defaultPaymentMethod: vendor.defaultPaymentMethod,
//       defaultPaymentTermsId: vendor.defaultPaymentTermsId,
//       discount: vendor.discount ? new Prisma.Decimal(vendor.discount) : null,
//       isTaxInclusivePricing: vendor.isTaxInclusivePricing ?? false,
//       leadTimeDays: vendor.leadTimeDays,
//       taxingSchemeId: vendor.taxingSchemeId,
//       lastModifiedById: validLastModifiedById, // 🟢 NOW USING THE SAFE GUARDED ID
//       lastModifiedDttm: vendor.lastModifiedDttm ? new Date(vendor.lastModifiedDttm) : null,
//     },
//     update: {
//       currencyId: vendor.currencyId,
//       defaultAddressId: vendor.defaultAddressId,
//       defaultCarrier: vendor.defaultCarrier,
//       defaultPaymentMethod: vendor.defaultPaymentMethod,
//       defaultPaymentTermsId: vendor.defaultPaymentTermsId,
//       discount: vendor.discount ? new Prisma.Decimal(vendor.discount) : null,
//       isTaxInclusivePricing: vendor.isTaxInclusivePricing ?? false,
//       leadTimeDays: vendor.leadTimeDays,
//       taxingSchemeId: vendor.taxingSchemeId,
//       lastModifiedById: validLastModifiedById, // 🟢 NOW USING THE SAFE GUARDED ID
//       lastModifiedDttm: vendor.lastModifiedDttm ? new Date(vendor.lastModifiedDttm) : null,
//     },
//   });

//   /**
//    * STEP 5: Child Vendor Items Sync
//    */
//   if (vendor.vendorItems !== undefined) {
//     await tx.vendorItem.deleteMany({ where: { vendorId: vendor.vendorId } });

//     if (vendor.vendorItems?.length) {
//       const validItemsToCreate = [];

//       for (const item of vendor.vendorItems) {
//         if (!item.vendorItemId) continue;

//         let validProductId: string | null = null;

//         if (item.productId) {
//           const localProduct = await tx.product.findUnique({
//             where: { inflowId: item.productId },
//             select: { inflowId: true },
//           });

//           if (localProduct) {
//             validProductId = localProduct.inflowId; // 🟢 FIXED: assigning to validProductId
//           } else if (item.product) {
//             console.warn(
//               `[Sync Notification] Product with inflowId "${item.productId}" not synced yet. Attempting inline sync...`
//             );
//             const syncedProduct = await ensureSyncProduct(tx, item.product);
//             if (syncedProduct) {
//               validProductId = syncedProduct.inflowId;
//             }
//           }
//         }

//         // Skip if product cannot be resolved or mapped
//         if (!validProductId) {
//           console.warn(
//             `[Sync Notification] Skipping vendor item "${item.vendorItemId}" because productId could not be resolved.`
//           );
//           continue;
//         }

//         validItemsToCreate.push({
//           inflowId: item.vendorItemId,
//           vendorId: vendor.vendorId,
//           productId: validProductId, // 🟢 FIXED: passing verified productId
//           vendorSku: item.vendorItemCode,
//           unitCost: item.cost ? new Prisma.Decimal(item.cost) : null,
//           lineNum: item.lineNum || null,
//           leadTimeDays: item.leadTimeDays || null,
//         });
//       }

//       if (validItemsToCreate.length > 0) {
//         await tx.vendorItem.createMany({
//           data: validItemsToCreate,
//           skipDuplicates: true,
//         });
//       }
//     }
//   }

//   /**
//    * STEP 6: Ledger Data Financial Collections
//    */
//   await tx.vendorDue.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
//   if (vendor.dues?.length) {
//     await tx.vendorDue.createMany({
//       data: vendor.dues.filter((due) => due.currencyId).map((due) => ({
//         inflowId: due.vendorDueId,
//         vendorId: vendor.vendorId,
//         currencyId: due.currencyId,
//         amountCurrent: new Prisma.Decimal(due.amountCurrent || 0),
//         amount1To30: new Prisma.Decimal(due.amount1To30 || 0),
//         amount31To60: new Prisma.Decimal(due.amount31To60 || 0),
//         amount61Plus: new Prisma.Decimal(due.amount61Plus || 0),
//       })),
//     });
//   }

//   await tx.vendorBalance.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
//   if (vendor.balances?.length) {
//     await tx.vendorBalance.createMany({
//       data: vendor.balances.map((bal) => ({
//         inflowId: bal.vendorBalanceId,
//         vendorId: vendor.vendorId,
//         currencyId: bal.currencyId,
//         balance: new Prisma.Decimal(bal.balance || 0),
//       })),
//     });
//   }

//   await tx.vendorCredit.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
//   if (vendor.credits?.length) {
//     await tx.vendorCredit.createMany({
//       data: vendor.credits.map((cred) => ({
//         inflowId: cred.vendorCreditId,
//         vendorId: vendor.vendorId,
//         currencyId: cred.currencyId,
//         credit: new Prisma.Decimal(cred.credit || 0),
//       })),
//     });
//   }

//   /**
//    * STEP 7: Vendor Attachments Sync
//    */
//   await tx.vendorAttachment.deleteMany({ where: { vendorId: syncedVendor.inflowId } });
//   if (vendor.attachments?.length) {
//     await tx.vendorAttachment.createMany({
//       data: vendor.attachments.map((att: any) => ({
//         inflowId: att.inflowId || att.vendorAttachmentId,
//         vendorId: vendor.vendorId,
//         fileName: att.fileName,
//         fileUrl: att.fileUrl,
//         fileSize: att.fileSize,
//         contentType: att.contentType,
//       })),
//     });
//   }

//   return syncedVendor;
// }
// app/api/admin/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { Prisma } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, contactName, email, phone, fax, website, remarks, isActive, 
      taxExemptNumber, defaultCarrier, defaultPaymentMethod, discount, 
      defaultLocationId, defaultPaymentTermsId, pricingSchemeId, taxingSchemeId, 
      defaultSalesRepTeamMemberId, addresses = [], customFields = {}
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Missing required business name field." }, { status: 400 });
    }

    // Form clean native GUIDs to ensure 100% downstream compliance with inFlow's database schema
    const customerId = crypto.randomUUID().toLowerCase();
    const cleanEmail = email?.trim().toLowerCase() || null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Parent Business Partner Node
      const businessPartner = await tx.businessPartner.create({
        data: { 
          name: name.trim(), 
          contactName: contactName?.trim(), 
          email: cleanEmail, 
          phone: phone?.trim(), 
          fax: fax?.trim(), 
          website: website?.trim(), 
          remarks: remarks?.trim(), 
          isActive: isActive ?? true 
        }
      });

      // 2. Create Related Address Vectors
      const savedAddresses = await Promise.all(
        addresses.map(async (addr: any) => {
          const addressId = crypto.randomUUID().toLowerCase(); // Native UUID string
          return await tx.businessPartnerAddress.create({
            data: {
              businessPartnerId: businessPartner.id,
              inflowId: addressId,
              name: addr.name?.trim() || "Primary Address",
              address1: addr.address1?.trim() || "",
              address2: addr.address2?.trim() || null,
              city: addr.city?.trim() || "",
              state: addr.state?.trim() || "",
              country: addr.country?.trim() || "Philippines",
              postalCode: addr.postalCode?.trim() || "",
              remarks: addr.remarks?.trim() || null,
              addressType: addr.addressType || "Commercial"
            }
          });
        })
      );

      // Determine explicit structural fallback selectors
      const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
      const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      
      const billingInflowId = savedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
      const shippingInflowId = savedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;

      // 3. Setup Core Customer Record Block
      const customer = await tx.customer.create({
        data: {
          businessPartnerId: businessPartner.id,
          inflowId: customerId,
          taxExemptNumber: taxExemptNumber?.trim() || null,
          defaultCarrier: defaultCarrier?.trim() || null,
          defaultPaymentMethod: defaultPaymentMethod?.trim() || null,
          discount: discount ? new Prisma.Decimal(discount) : 0,
          defaultLocationId: defaultLocationId || null,
          defaultPaymentTermsId: defaultPaymentTermsId || null,
          pricingSchemeId: pricingSchemeId || null,
          taxingSchemeId: taxingSchemeId || null,
          defaultSalesRepTeamMemberId: defaultSalesRepTeamMemberId || null,
          defaultBillingAddressId: billingInflowId,
          defaultShippingAddressId: shippingInflowId
        }
      });

      // 4. Seeding Financial Summaries
      const targetPricingScheme = pricingSchemeId 
        ? await tx.pricingScheme.findUnique({ where: { inflowId: pricingSchemeId }, select: { currencyId: true } })
        : null;

      const currencyId = targetPricingScheme?.currencyId || "USD";

      await Promise.all([
        tx.customerBalance.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, balance: 0 } }),
        tx.customerCredit.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, credit: 0 } }),
        tx.customerDue.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, amountCurrent: 0, amount1To30: 0, amount31To60: 0, amount61Plus: 0 } })
      ]);

      /**
       * STEP 5: Construct Outbound inFlow-Compliant Nested Payload Representation
       */
      const inflowPayload = {
        id: customer.id,
        customerId: customer.inflowId,
        name: businessPartner.name,
        contactName: businessPartner.contactName,
        email: businessPartner.email,
        phone: businessPartner.phone,
        fax: businessPartner.fax,
        website: businessPartner.website,
        remarks: businessPartner.remarks,
        discount: customer.discount ? customer.discount.toString() : null,
        isActive: businessPartner.isActive,
        taxExemptNumber: customer.taxExemptNumber,
        defaultLocationId: customer.defaultLocationId,
        defaultCarrier: customer.defaultCarrier,
        defaultPaymentMethod: customer.defaultPaymentMethod,
        defaultPaymentTermsId: customer.defaultPaymentTermsId,
        pricingSchemeId: customer.pricingSchemeId,
        taxingSchemeId: customer.taxingSchemeId,
        defaultSalesRepTeamMemberId: customer.defaultSalesRepTeamMemberId,
        defaultBillingAddressId: customer.defaultBillingAddressId,
        defaultShippingAddressId: customer.defaultShippingAddressId,
        addresses: savedAddresses.map(addr => ({
          customerAddressId: addr.inflowId,
          customerId: customer.inflowId,
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
        customFields: {
          custom1: customFields.custom1 || null,
          custom2: customFields.custom2 || null,
          custom3: customFields.custom3 || null,
          custom4: customFields.custom4 || null,
          custom5: customFields.custom5 || null,
          custom6: customFields.custom6 || null,
          custom7: customFields.custom7 || null,
          custom8: customFields.custom8 || null,
          custom9: customFields.custom9 || null,
          custom10: customFields.custom10 || null,
        }
      };

      return { customer, inflowPayload };
    });

    // 6. Push safely to background worker queue outside the active DB transaction scope
    // await midSyncQueue.add(
    //   "customer_sync_job",
    //   {
    //     source: "CUSTOMER_SYNC_API",
    //     model: "CUSTOMER",
    //     payload: result.inflowPayload,
    //     timestamp: new Date().toISOString()
    //   },
    //   { 
    //     attempts: 3, 
    //     backoff: { type: "exponential", delay: 2000 },
    //     removeOnComplete: true
    //   }
    // );

    return NextResponse.json(result.customer, { status: 201 });
  } catch (error) {
    console.error("[CUSTOMER_POST_ERROR]:", error);
    
    return NextResponse.json({ error: "Failed to process customer creation pipeline." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, name, contactName, email, phone, fax, website, remarks, isActive, 
      taxExemptNumber, defaultCarrier, defaultPaymentMethod, discount, 
      defaultLocationId, defaultPaymentTermsId, pricingSchemeId, taxingSchemeId, 
      defaultSalesRepTeamMemberId, addresses = [], customFields = {}
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required customer target identification reference token." }, { status: 400 });
    }

    const cleanEmail = email?.trim().toLowerCase() || null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current database record contexts
      const currentCustomer = await tx.customer.findUnique({
        where: { id },
        select: { businessPartnerId: true, inflowId: true }
      });
      if (!currentCustomer) throw new Error("Target customer record layout context was not located.");

      // 2. Modify Core Legal Baseline Info
      const businessPartner = await tx.businessPartner.update({
        where: { id: currentCustomer.businessPartnerId },
        data: { 
          name: name?.trim(), 
          contactName: contactName?.trim(), 
          email: cleanEmail, 
          phone: phone?.trim(), 
          fax: fax?.trim(), 
          website: website?.trim(), 
          remarks: remarks?.trim(), 
          isActive: isActive !== undefined ? isActive : undefined
        }
      });

      const existingAddresses = await tx.businessPartnerAddress.findMany({
        where: { businessPartnerId: currentCustomer.businessPartnerId },
        select: { id: true }
      });

      const incomingIds = addresses
        .filter((a: any) => a.id) // Only get addresses that have an ID
        .map((a: any) => a.id);

      // 2. Identify addresses to delete (exist in DB, but not in current payload)
      const toDelete = existingAddresses.filter(addr => !incomingIds.includes(addr.id));

      if (toDelete.length > 0) {
        await tx.businessPartnerAddress.deleteMany({
          where: { id: { in: toDelete.map(a => a.id) } }
        });
      }

      // 3. Smart Address Alignment Strategy (Upserts matching structural states)
      const syncedAddresses = await Promise.all(
        addresses.map(async (addr: any) => {
          const baseData = {
            name: addr.name?.trim() || "Mailing Address",
            address1: addr.address1?.trim() || "",
            address2: addr.address2?.trim() || null,
            city: addr.city?.trim() || "",
            state: addr.state?.trim() || "",
            country: addr.country?.trim() || "Philippines",
            postalCode: addr.postalCode?.trim() || "",
            remarks: addr.remarks?.trim() || null,
            addressType: addr.addressType || "Commercial"
          };

          if (addr.id) {
            return await tx.businessPartnerAddress.update({
              where: { id: addr.id },
              data: baseData
            });
          } else {
            return await tx.businessPartnerAddress.create({
              data: {
                ...baseData,
                businessPartnerId: currentCustomer.businessPartnerId,
                inflowId: crypto.randomUUID().toLowerCase()
              }
            });
          }
        })
      );

      const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
      const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      
      const billingInflowId = syncedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
      const shippingInflowId = syncedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;

      // 4. Apply Sub-ledger Rule Context Overwrites
      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: {
          taxExemptNumber: taxExemptNumber?.trim() || null,
          defaultCarrier: defaultCarrier?.trim() || null,
          defaultPaymentMethod: defaultPaymentMethod?.trim() || null,
          discount: discount !== undefined ? new Prisma.Decimal(discount) : undefined,
          defaultLocationId: defaultLocationId || null,
          defaultPaymentTermsId: defaultPaymentTermsId || null,
          pricingSchemeId: pricingSchemeId || null,
          taxingSchemeId: taxingSchemeId || null,
          defaultSalesRepTeamMemberId: defaultSalesRepTeamMemberId || null,
          defaultBillingAddressId: billingInflowId,
          defaultShippingAddressId: shippingInflowId
        }
      });

      // 5. Build up all addresses associated with this business partner for full state sync
      const finalAddresses = await tx.businessPartnerAddress.findMany({
        where: { businessPartnerId: currentCustomer.businessPartnerId }
      });

      /**
       * STEP 5: Construct Outbound inFlow-Compliant Upsert Representation
       */
      const inflowPayload = {
        id: updatedCustomer.id,
        customerId: currentCustomer.inflowId, // Matches immutable external inFlow GUID
        name: businessPartner.name,
        contactName: businessPartner.contactName,
        email: businessPartner.email,
        phone: businessPartner.phone,
        fax: businessPartner.fax,
        website: businessPartner.website,
        remarks: businessPartner.remarks,
        discount: updatedCustomer.discount ? updatedCustomer.discount.toString() : null,
        isActive: businessPartner.isActive,
        taxExemptNumber: updatedCustomer.taxExemptNumber,
        defaultLocationId: updatedCustomer.defaultLocationId,
        defaultCarrier: updatedCustomer.defaultCarrier,
        defaultPaymentMethod: updatedCustomer.defaultPaymentMethod,
        defaultPaymentTermsId: updatedCustomer.defaultPaymentTermsId,
        pricingSchemeId: updatedCustomer.pricingSchemeId,
        taxingSchemeId: updatedCustomer.taxingSchemeId,
        defaultSalesRepTeamMemberId: updatedCustomer.defaultSalesRepTeamMemberId,
        defaultBillingAddressId: updatedCustomer.defaultBillingAddressId,
        defaultShippingAddressId: updatedCustomer.defaultShippingAddressId,
        addresses: finalAddresses.map(addr => ({
          customerAddressId: addr.inflowId,
          customerId: currentCustomer.inflowId,
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
        customFields: {
          custom1: customFields.custom1 || null,
          custom2: customFields.custom2 || null,
          custom3: customFields.custom3 || null,
          custom4: customFields.custom4 || null,
          custom5: customFields.custom5 || null,
          custom6: customFields.custom6 || null,
          custom7: customFields.custom7 || null,
          custom8: customFields.custom8 || null,
          custom9: customFields.custom9 || null,
          custom10: customFields.custom10 || null,
        }
      };

      return { updatedCustomer, inflowPayload };
    });

    await getMidSyncQueue().add(
      "customer_sync_job",
      {
        source: "CUSTOMER_SYNC_API",
        model: "CUSTOMER",
        payload: result.inflowPayload,
        timestamp: new Date().toISOString()
      },
      { 
        attempts: 3, 
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true
      }
    );

    return NextResponse.json(result.updatedCustomer, { status: 200 });
  } catch (error: any) {
    console.error("[CUSTOMER_PATCH_ERROR]:", error);
    return NextResponse.json({ error: error.message || "Internal failure modifying transactional parameters." }, { status: 500 });
  }
}
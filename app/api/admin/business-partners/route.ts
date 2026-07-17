import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { Prisma } from "@/generated/prisma/client";
import { WebhookService } from "@/services/webhook.service";
import { ADDRESS_TYPE_MAP } from "@/types/local-location.type";
import { splitBusinessPartnerPayload } from "@/helpers/businessPartnerSplitPayload";
import { CloudSyncDispatcher } from "@/lib/queues/businer-partner.helper";
import { LocalSyncDispatcher } from "@/lib/queues/local-dispatcher.helper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, contactName, email, phone, fax, website, remarks, isActive,
      isCustomer, isVendor, customerConfig, vendorConfig, addresses = []
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Missing required business name field." }, { status: 400 });
    }

    const cleanEmail = email?.trim().toLowerCase() || null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Parent Business Partner Node
      const businessPartner = await tx.businessPartner.create({
        data: { 
          name: name.trim(), 
          contactName: contactName?.trim() || null, 
          email: cleanEmail, 
          phone: phone?.trim() || null, 
          fax: fax?.trim() || null, 
          website: website?.trim() || null, 
          remarks: remarks?.trim() || null, 
          isActive: isActive ?? true,
        }
      });

      // 2. Create Address Vectors
      const savedAddresses = await Promise.all(
        addresses.map(async (addr: any) => {
          const addressId = crypto.randomUUID().toLowerCase();
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

      // Find address indices for fallbacks
      const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
      const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      const vendorAddrIndex = addresses.findIndex((a: any) => a.isDefaultVendorAddress === true);
      
      const billingInflowId = savedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
      const shippingInflowId = savedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;
      const vendorAddrInflowId = savedAddresses[vendorAddrIndex >= 0 ? vendorAddrIndex : 0]?.inflowId || null;

      let customerPayloadData: any = null;
      let vendorPayloadData: any = null;

      // 3. Create Customer block if active
      if (isCustomer && customerConfig) {
        const customerId = crypto.randomUUID().toLowerCase();
        
        // Resolve target Pricing Scheme Currency
        const targetPricingScheme = customerConfig.pricingSchemeId 
          ? await tx.pricingScheme.findUnique({ where: { inflowId: customerConfig.pricingSchemeId }, select: { currencyId: true } })
          : null;
        const currencyId = targetPricingScheme?.currencyId || "USD";

        const customer = await tx.customer.create({
          data: {
            businessPartnerId: businessPartner.id,
            inflowId: customerId,
            taxExemptNumber: customerConfig.taxExemptNumber?.trim() || null,
            defaultCarrier: customerConfig.defaultCarrier?.trim() || null,
            defaultPaymentMethod: customerConfig.defaultPaymentMethod?.trim() || "Cash",
            discount: customerConfig.discount ? new Prisma.Decimal(customerConfig.discount) : 0,
            defaultLocationId: customerConfig.defaultLocationId || null,
            defaultPaymentTermsId: customerConfig.defaultPaymentTermsId || null,
            pricingSchemeId: customerConfig.pricingSchemeId || null,
            taxingSchemeId: customerConfig.taxingSchemeId || null,
            defaultSalesRepTeamMemberId: customerConfig.defaultSalesRepTeamMemberId || null,
            defaultBillingAddressId: billingInflowId,
            defaultShippingAddressId: shippingInflowId
          }
        });

        // Seed financial structures
        const [balance, credit, due] = await Promise.all([
          tx.customerBalance.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, balance: 0 } }),
          tx.customerCredit.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, credit: 0 } }),
          tx.customerDue.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, amountCurrent: 0, amount1To30: 0, amount31To60: 0, amount61Plus: 0 } })
        ]);

        customerPayloadData = {
          ...customer,
          currencyId,
          balances: [balance],
          credits: [credit],
          dues: [due]
        };
      }

      // 4. Create Vendor block if active
      if (isVendor && vendorConfig) {
        const vendorId = crypto.randomUUID().toLowerCase();
        const vendor = await tx.vendor.create({
          data: {
            businessPartnerId: businessPartner.id,
            inflowId: vendorId,
            defaultCarrier: vendorConfig.defaultCarrier?.trim() || null,
            defaultPaymentMethod: vendorConfig.defaultPaymentMethod?.trim() || "Cash",
            discount: vendorConfig.discount ? new Prisma.Decimal(vendorConfig.discount) : 0,
            isTaxInclusivePricing: vendorConfig.isTaxInclusivePricing ?? false,
            leadTimeDays: vendorConfig.leadTimeDays ? parseInt(vendorConfig.leadTimeDays) : 0,
            currencyId: vendorConfig.currencyId || null,
            defaultPaymentTermsId: vendorConfig.defaultPaymentTermsId || null,
            taxingSchemeId: vendorConfig.taxingSchemeId || null,
            defaultAddressId: vendorAddrInflowId
          }
        });

        const currencyId = vendorConfig.currencyId;

        // Seed financial structures
        const [balance, credit, due] = await Promise.all([
          tx.vendorBalance.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), vendorId, currencyId, balance: 0 } }),
          tx.vendorCredit.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), vendorId, currencyId, credit: 0 } }),
          tx.vendorDue.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), vendorId, currencyId, amountCurrent: 0, amount1To30: 0, amount31To60: 0, amount61Plus: 0 } })
        ]);

        // Seed vendor performance tracking metrics
        // const rating = await tx.vendorRating.create({
        //   data: {
        //     inflowId: crypto.randomUUID().toLowerCase(),
        //     vendorId,
        //     onTimeDeliveryRate: 100,
        //     qualityRating: 5,
        //     overallScore: 100
        //   }
        // });

        vendorPayloadData = {
          ...vendor,
          balances: [balance],
          credits: [credit],
          dues: [due],
        //   ratings: [rating]
        };
      }

      return { businessPartner, savedAddresses, customerPayloadData, vendorPayloadData };
    });

    // ==========================================
    // 🏢 BROADCAST SYNC TO EXTERNAL QUEUES
    // ==========================================
    // Prepare transaction payload structure
    const syncPayload = {
      id: result.businessPartner.id,
      name: result.businessPartner.name,
      contactName: result.businessPartner.contactName,
      email: result.businessPartner.email,
      phone: result.businessPartner.phone,
      fax: result.businessPartner.fax,
      website: result.businessPartner.website,
      remarks: result.businessPartner.remarks,
      isActive: result.businessPartner.isActive,
      isCustomer: !!result.customerPayloadData,
      isVendor: !!result.vendorPayloadData,
      addresses: result.savedAddresses.map(addr => ({
        customerAddressId: addr.inflowId,
        name: addr.name,
        addressType: addr.addressType,
        address1: addr.address1,
        address2: addr.address2,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country,
        remarks: addr.remarks
      })),
      customerConfig: result.customerPayloadData ? {
        customerId: result.customerPayloadData.inflowId,
        taxExemptNumber: result.customerPayloadData.taxExemptNumber,
        defaultCarrier: result.customerPayloadData.defaultCarrier,
        defaultPaymentMethod: result.customerPayloadData.defaultPaymentMethod,
        discount: result.customerPayloadData.discount.toString(),
        defaultLocationId: result.customerPayloadData.defaultLocationId,
        defaultPaymentTermsId: result.customerPayloadData.defaultPaymentTermsId,
        pricingSchemeId: result.customerPayloadData.pricingSchemeId,
        taxingSchemeId: result.customerPayloadData.taxingSchemeId,
        defaultSalesRepTeamMemberId: result.customerPayloadData.defaultSalesRepTeamMemberId,
        defaultBillingAddressId: result.customerPayloadData.defaultBillingAddressId,
        defaultShippingAddressId: result.customerPayloadData.defaultShippingAddressId,
        currencyId: result.customerPayloadData.currencyId,
        balances: result.customerPayloadData.balances.map((b: any) => ({ ...b, balance: b.balance.toString() })),
        credits: result.customerPayloadData.credits.map((c: any) => ({ ...c, credit: c.credit.toString() })),
        dues: result.customerPayloadData.dues.map((d: any) => ({ ...d, amountCurrent: d.amountCurrent.toString() }))
      } : null,
      vendorConfig: result.vendorPayloadData ? {
        vendorId: result.vendorPayloadData.inflowId,
        defaultCarrier: result.vendorPayloadData.defaultCarrier,
        defaultPaymentMethod: result.vendorPayloadData.defaultPaymentMethod,
        discount: result.vendorPayloadData.discount.toString(),
        isTaxInclusivePricing: result.vendorPayloadData.isTaxInclusivePricing,
        leadTimeDays: result.vendorPayloadData.leadTimeDays,
        currencyId: result.vendorPayloadData.currencyId,
        defaultPaymentTermsId: result.vendorPayloadData.defaultPaymentTermsId,
        taxingSchemeId: result.vendorPayloadData.taxingSchemeId,
        defaultAddressId: result.vendorPayloadData.defaultAddressId,
        ratings: result.vendorPayloadData.ratings
      } : null
    };

    const splitPayloads = splitBusinessPartnerPayload(result);

    // Dispatch job to background syncing queue (e.g., Cloud sync)
    await CloudSyncDispatcher.dispatchSplitBusinessPartnerSyncJobs(splitPayloads);

    // Dispatch job to background syncing queue (e.g., Local sync)
    const localJobs = await LocalSyncDispatcher.prepareLocalBusinessPartnerSyncJobs(
      result.businessPartner.id,
      splitPayloads,
      prisma,
      WebhookService
    );

    // Map and execute queue insertions concurrently
    if (localJobs.length > 0) {
      const localQueue = getMidSyncQueue();
      await Promise.all(
        localJobs.map(job => 
          localQueue.add(
            job.name, 
            job.data, 
            { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: true }
          )
        )
      );
    }

    return NextResponse.json(result.businessPartner, { status: 201 });
  } catch (error) {
    console.error("[BUSINESS_PARTNER_POST_ERROR]:", error);
    return NextResponse.json({ error: "Failed to process business partner creation pipeline." }, { status: 500 });
  }
}
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
      isCustomer, isVendor, customerConfig, vendorConfig, addresses = [], locations = []
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
        
        // 1. Resolve target Pricing Scheme Currency
        const targetPricingScheme = customerConfig.pricingSchemeId 
          ? await tx.pricingScheme.findUnique({ 
              where: { inflowId: customerConfig.pricingSchemeId }, 
              select: { currencyId: true } 
            })
          : null;
          
        let resolvedCurrencyId = targetPricingScheme?.currencyId || null;

        // 2. Fallback to PHP if no explicit pricing scheme currency is resolved
        if (!resolvedCurrencyId) {
          const fallbackCurrency = await tx.currency.findUnique({ 
            where: { isoCode: "PHP" }, 
            select: { inflowId: true } 
          });
          resolvedCurrencyId = fallbackCurrency?.inflowId || null;
        }

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

        let balance: any = null;
        let credit: any = null;
        let due: any = null;

        // 3. Seed financial structures if a currency context is valid
        if (resolvedCurrencyId) {
          [balance, credit, due] = await Promise.all([
            tx.customerBalance.create({ 
              data: { 
                inflowId: crypto.randomUUID().toLowerCase(), 
                customerId, 
                currencyId: resolvedCurrencyId, // Fixed field identifier
                balance: 0 
              } 
            }),
            tx.customerCredit.create({ 
              data: { 
                inflowId: crypto.randomUUID().toLowerCase(), 
                customerId, 
                currencyId: resolvedCurrencyId, // Fixed variable reference
                credit: 0 
              } 
            }),
            tx.customerDue.create({ 
              data: { 
                inflowId: crypto.randomUUID().toLowerCase(), 
                customerId, 
                currencyId: resolvedCurrencyId, // Fixed variable reference
                amountCurrent: 0, 
                amount1To30: 0, 
                amount31To60: 0, 
                amount61Plus: 0 
              } 
            })
          ]);
        }

        customerPayloadData = {
          ...customer,
          balances: balance ? [balance] : [],
          credits: credit ? [credit] : [],
          dues: due ? [due] : []
        };
      }

      // 4. Create Vendor block if active
      if (isVendor && vendorConfig) {
        const vendorId = crypto.randomUUID().toLowerCase();

        let resolvedCurrencyId = vendorConfig.currencyId || null;

        // 2. Fallback to PHP if no explicit pricing scheme currency is resolved
        if (!resolvedCurrencyId) {
          const fallbackCurrency = await tx.currency.findUnique({ 
            where: { isoCode: "PHP" }, 
            select: { inflowId: true } 
          });
          resolvedCurrencyId = fallbackCurrency?.inflowId || null;
        }

        const vendor = await tx.vendor.create({
          data: {
            businessPartnerId: businessPartner.id,
            inflowId: vendorId,
            defaultCarrier: vendorConfig.defaultCarrier?.trim() || null,
            defaultPaymentMethod: vendorConfig.defaultPaymentMethod?.trim() || "Cash",
            discount: vendorConfig.discount ? new Prisma.Decimal(vendorConfig.discount) : 0,
            isTaxInclusivePricing: vendorConfig.isTaxInclusivePricing ?? false,
            leadTimeDays: vendorConfig.leadTimeDays ? parseInt(vendorConfig.leadTimeDays) : 0,
            currencyId: resolvedCurrencyId,
            defaultPaymentTermsId: vendorConfig.defaultPaymentTermsId || null,
            taxingSchemeId: vendorConfig.taxingSchemeId || null,
            defaultAddressId: vendorAddrInflowId
          }
        });

        let balance: any = null;
        let credit: any = null;
        let due: any = null;

        // 3. Seed financial structures if a currency context is valid
        if (resolvedCurrencyId) {
          [balance, credit, due] = await Promise.all([
            tx.vendorBalance.create({ 
              data: { 
                inflowId: crypto.randomUUID().toLowerCase(), 
                vendorId, 
                currencyId: resolvedCurrencyId, // Fixed field identifier
                balance: 0 
              } 
            }),
            tx.vendorCredit.create({ 
              data: { 
                inflowId: crypto.randomUUID().toLowerCase(), 
                vendorId, 
                currencyId: resolvedCurrencyId, // Fixed variable reference
                credit: 0 
              } 
            }),
            tx.vendorDue.create({ 
              data: { 
                inflowId: crypto.randomUUID().toLowerCase(), 
                vendorId, 
                currencyId: resolvedCurrencyId, // Fixed variable reference
                amountCurrent: 0, 
                amount1To30: 0, 
                amount31To60: 0, 
                amount61Plus: 0 
              } 
            })
          ]);
        }

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
          balances: balance ? [balance] : [],
          credits: credit ? [credit] : [],
          dues: due ? [due] : []
        };
      }

      return { businessPartner, savedAddresses, customerPayloadData, vendorPayloadData };
    });

    const splitPayloads = splitBusinessPartnerPayload(result);

    // Dispatch job to background syncing queue (e.g., Cloud sync)
    await CloudSyncDispatcher.dispatchSplitBusinessPartnerSyncJobs(splitPayloads);

    // Dispatch job to background syncing queue (e.g., Local sync)
    const localJobs = await LocalSyncDispatcher.prepareLocalBusinessPartnerSyncJobs(
      result.businessPartner.id,
      locations,
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
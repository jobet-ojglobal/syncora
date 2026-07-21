import { Prisma } from "@/generated/prisma/client";
import { splitBusinessPartnerPayload } from "@/helpers/businessPartnerSplitPayload";
import { prisma } from "@/lib/prisma";
import { CloudSyncDispatcher } from "@/lib/queues/businer-partner.helper";
import { LocalSyncDispatcher } from "@/lib/queues/local-dispatcher.helper";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { softDeleteBusinessPartner } from "@/services/business-partner.service";
import { WebhookService } from "@/services/webhook.service";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter: Business Partner ID" },
        { status: 400 }
      );
    }

    // Retrieve full entity structure map conforming to structural layout expectations
    const businessPartner = await prisma.businessPartner.findUnique({
      where: {
        id: id,
      },
      include: {
        addresses: {
          orderBy: {
            createdAt: "asc",
          },
        },
        customer: {
          include: {
            pricingScheme: true,
            taxingScheme: true,
            defaultPaymentTerms: true,
            dues: {
              include: {
                currency: true,
              },
            },
            balances: {
              include: {
                currency: true,
              },
            },
            credits: {
              include: {
                currency: true,
              },
            },
          },
        },
        vendor: {
          include: {
            currency: true,
            taxingScheme: true,
            defaultPaymentTerms: true,
            dues: {
              include: {
                currency: true,
              },
            },
            balances: {
              include: {
                currency: true,
              },
            },
            vendorItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    inflowId: true,
                    sku: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
            _count: {
              select: {
                products: true,
                vendorItems: true,
              },
            },
          },
        },
      },
    });

    if (!businessPartner || businessPartner.deletedAt !== null) {
      return NextResponse.json(
        { error: "Business Partner record not found or has been soft-deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json(businessPartner, { status: 200 });
  } catch (error: any) {
    console.error("CRITICAL API EXECUTION ERROR [Business Partner Details]:", error);
    return NextResponse.json(
      {
        error: "Internal Ledger Server Error",
        details: error.message || "An error occurred while compiling database records.",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      name, contactName, email, phone, fax, website, remarks, isActive,
      isCustomer, isVendor, customerConfig, vendorConfig, addresses = [], locations = []
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Target business partner identifier is missing." }, { status: 400 });
    }

    const cleanEmail = email?.trim().toLowerCase() || null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Core Parent Node
      const businessPartner = await tx.businessPartner.update({
        where: { id },
        data: {
          name: name?.trim(),
          contactName: contactName?.trim() || null,
          email: cleanEmail,
          phone: phone?.trim() || null,
          fax: fax?.trim() || null,
          website: website?.trim() || null,
          remarks: remarks?.trim() || null,
          isActive: isActive ?? true,
        }
      });

      // 2. Perform Intelligent Address Syncing (Create/Update/Delete)
      const existingAddresses = await tx.businessPartnerAddress.findMany({
        where: { businessPartnerId: id }
      });

      const incomingAddressIds = addresses.map((a: any) => a.id).filter(Boolean);
      const addressesToDelete = existingAddresses.filter(addr => !incomingAddressIds.includes(addr.id));

      // Remove untracked addresses
      if (addressesToDelete.length > 0) {
        await tx.businessPartnerAddress.deleteMany({
          where: { id: { in: addressesToDelete.map(a => a.id) } }
        });
      }

      // Upsert addresses
      const savedAddresses = await Promise.all(
        addresses.map(async (addr: any) => {
          if (addr.id) {
            return await tx.businessPartnerAddress.update({
              where: { id: addr.id },
              data: {
                name: addr.name?.trim() || "Address Record",
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
          } else {
            const addressId = crypto.randomUUID().toLowerCase();
            return await tx.businessPartnerAddress.create({
              data: {
                businessPartnerId: id,
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
          }
        })
      );

      // Map dynamic primary pointers
      const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
      const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      const vendorAddrIndex = addresses.findIndex((a: any) => a.isDefaultVendorAddress === true);
      
      const billingInflowId = savedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
      const shippingInflowId = savedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;
      const vendorAddrInflowId = savedAddresses[vendorAddrIndex >= 0 ? vendorAddrIndex : 0]?.inflowId || null;

      let customerPayloadData: any = null;
      let vendorPayloadData: any = null;

      // 3. Handle Customer Configuration (Upsert/Deactivate)
      if (isCustomer && customerConfig) {
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

        const existingCustomer = await tx.customer.findFirst({
          where: { businessPartnerId: id }
        });

        let customer;
        if (existingCustomer) {
          customer = await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
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
        } else {
          const customerId = crypto.randomUUID().toLowerCase();
          customer = await tx.customer.create({
            data: {
              businessPartnerId: id,
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

          // Seed finance items for newly generated sub-record
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
        }

        const balances = await tx.customerBalance.findMany({ where: { customerId: customer.inflowId } });
        const credits = await tx.customerCredit.findMany({ where: { customerId: customer.inflowId } });
        const dues = await tx.customerDue.findMany({ where: { customerId: customer.inflowId } });

        customerPayloadData = { ...customer, balances, credits, dues };
      }

      // 4. Handle Vendor Configuration (Upsert)
      if (isVendor && vendorConfig) {
        const existingVendor = await tx.vendor.findFirst({
          where: { businessPartnerId: id }
        });

        let resolvedCurrencyId = vendorConfig.currencyId || null;

        // 2. Fallback to PHP if no explicit pricing scheme currency is resolved
        if (!resolvedCurrencyId) {
          const fallbackCurrency = await tx.currency.findUnique({ 
            where: { isoCode: "PHP" }, 
            select: { inflowId: true } 
          });
          resolvedCurrencyId = fallbackCurrency?.inflowId || null;
        }

        let vendor;
        if (existingVendor) {
          vendor = await tx.vendor.update({
            where: { id: existingVendor.id },
            data: {
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
        } else {
          const vendorId = crypto.randomUUID().toLowerCase();
          vendor = await tx.vendor.create({
            data: {
              businessPartnerId: id,
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

          // await tx.vendorRating.create({
          //   data: {
          //     inflowId: crypto.randomUUID().toLowerCase(),
          //     vendorId,
          //     onTimeDeliveryRate: 100,
          //     qualityRating: 5,
          //     overallScore: 100
          //   }
          // });
        }

        const balances = await tx.vendorBalance.findMany({ where: { vendorId: vendor.inflowId } });
        const credits = await tx.vendorCredit.findMany({ where: { vendorId: vendor.inflowId } });
        const dues = await tx.vendorDue.findMany({ where: { vendorId: vendor.inflowId } });

        // const ratings = await tx.vendorRating.findMany({ where: { vendorId: vendor.inflowId } });
        vendorPayloadData = { ...vendor, currencyId: resolvedCurrencyId, balances, credits, dues  };
      }

      return { businessPartner, savedAddresses, customerPayloadData, vendorPayloadData };
    });

    const splitPayloads = splitBusinessPartnerPayload(result);

    // Dispatch job to background syncing queue (e.g., Cloud sync)
    // await CloudSyncDispatcher.dispatchSplitBusinessPartnerSyncJobs(splitPayloads);

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

    return NextResponse.json(result.businessPartner, { status: 200 });
  } catch (error) {
    console.error("[BUSINESS_PARTNER_PATCH_ERROR]:", error);
    return NextResponse.json({ error: "Failed to update business partner configuration." }, { status: 500 });
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params per Next.js App Router signature rules
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Business Partner ID parameter is required.' },
        { status: 400 }
      );
    }

    // Call database deletion service wrapper containing validation checks
    const result = await softDeleteBusinessPartner(id);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    // Extract validation error strings or fallback on unknown engine errors
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    
    // Check if the error was a validation block we intentionally threw
    if (errorMessage.startsWith('Action blocked') || errorMessage.includes('not found')) {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 422 } // Unprocessable Entity due to business rule violation
      );
    }

    // Default error structure for unexpected developer faults / network hiccups
    console.error('Fatal API error deleting Business Partner:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected database error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
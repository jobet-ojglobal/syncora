import { SplitSyncPayloads } from '@/helpers/businessPartnerSplitPayload';

export interface LocalSyncJobData {
  name: string;
  data: {
    source: "BUSINESS_PARTNER_UPSERT_LOCAL";
    model: "Customer" | "Vendor";
    payload: any;
    timestamp: string;
    location: {
      inflowId: string;
      url: string;
      name: string;
    };
  };
}

export class LocalSyncDispatcher {
  
  /**
   * Transforms cloud payloads into localized execution payloads and maps IDs per webhook location target
   */
  static async prepareLocalBusinessPartnerSyncJobs(
    cloudId: string, 
    locations: string[],
    splitPayloads: SplitSyncPayloads, 
    prisma: any,
    WebhookService: any
  ): Promise<LocalSyncJobData[]> {
    const jobsToQueue: LocalSyncJobData[] = [];

    // --- 1. RESOLVE CUSTOMER LOCAL PATHS ---
    if (splitPayloads.customer) {
      const customerPayload = splitPayloads.customer;
      const webhooks = await WebhookService.getLocationWebhookURLByLocationIDs(
        locations, 
        "customerLocal"
      );

      const activeWebhooks = webhooks.filter((w: any) => w.location?.url?.trim());

      if (activeWebhooks.length > 0) {
        // Query database context mappings concurrently for all matching target locations
        const [
          bpMappings,
          pricingMappings,
          paymentMappings,
          taxingMappings
        ] = await Promise.all([
          prisma.customerLocationMap.findMany({ where: { customerId: cloudId }, select: { locationId: true, localId: true } }),
          prisma.pricingSchemeLocationMap.findMany({ where: { pricingSchemeId: customerPayload.pricingSchemeId || undefined }, select: { locationId: true, localId: true } }),
          prisma.paymentTermLocationMap.findMany({ where: { paymentTermId: customerPayload.defaultPaymentTermsId || undefined }, select: { locationId: true, localId: true } }),
          prisma.taxingSchemeLocationMap.findMany({ where: { taxingSchemeId: customerPayload.taxingSchemeId || undefined }, select: { locationId: true, localId: true } })
        ]);

        for (const webhook of activeWebhooks) {
          const locId = webhook.locationId;
          
          const bpMatch = bpMappings.find((m: any) => m.locationId === locId);
          const pricingMatch = pricingMappings.find((m: any) => m.locationId === locId);
          const paymentMatch = paymentMappings.find((m: any) => m.locationId === locId);
          const taxingMatch = taxingMappings.find((m: any) => m.locationId === locId);

          jobsToQueue.push({
            name: "customer_localsync_job",
            data: {
              source: "BUSINESS_PARTNER_UPSERT_LOCAL",
              model: "Customer",
              timestamp: new Date().toISOString(),
              location: {
                inflowId: webhook.locationId,
                url: webhook.location.url,
                name: webhook.location.name
              },
              payload: {
                ...customerPayload,
                localId: bpMatch?.localId || null,

                defaultBillingAddressId: null,
                defaultShippingAddressId: null,
                defaultLocationId: null,

                pricingSchemeId: pricingMatch?.localId || null,
                defaultPaymentTermsId: paymentMatch?.localId || null,
                taxingSchemeId: taxingMatch?.localId || null,
              }
            }
          });
        }
      }
    }

    // --- 2. RESOLVE VENDOR LOCAL PATHS ---
    if (splitPayloads.vendor) {
      const vendorPayload = splitPayloads.vendor;
      // Re-use core currency/tax references relative to Vendor rules config targeting local synchronization endpoints
      const webhooks = await WebhookService.getLocationWebhookURLByLocationIDs(
        locations, 
        "vendorLocal"
      );

      const activeWebhooks = webhooks.filter((w: any) => w.location?.url?.trim());

      if (activeWebhooks.length > 0) {
        const [
          bpMappings,
          currencyMappings,
          paymentMappings,
          taxingMappings
        ] = await Promise.all([
          prisma.vendorLocationMap.findMany({ where: { vendorId: cloudId }, select: { locationId: true, localId: true } }),
          prisma.currencyLocationMap.findMany({ where: { currencyId: vendorPayload.currencyId }, select: { locationId: true, localId: true } }),
          prisma.paymentTermLocationMap.findMany({ where: { paymentTermId: vendorPayload.defaultPaymentTermsId || undefined }, select: { locationId: true, localId: true } }),
          prisma.taxingSchemeLocationMap.findMany({ where: { taxingSchemeId: vendorPayload.taxingSchemeId || undefined }, select: { locationId: true, localId: true } })
        ]);

        for (const webhook of activeWebhooks) {
          const locId = webhook.locationId;
          
          const bpMatch = bpMappings.find((m: any) => m.locationId === locId);
          const currMatch = currencyMappings.find((m: any) => m.locationId === locId);
          const paymentMatch = paymentMappings.find((m: any) => m.locationId === locId);
          const taxingMatch = taxingMappings.find((m: any) => m.locationId === locId);

          jobsToQueue.push({
            name: "vendor_localsync_job",
            data: {
              source: "BUSINESS_PARTNER_UPSERT_LOCAL",
              model: "Vendor",
              timestamp: new Date().toISOString(),
              location: {
                inflowId: webhook.locationId,
                url: webhook.location.url,
                name: webhook.location.name
              },
              payload: {
                ...vendorPayload,
                vendorId: undefined,
                localId: bpMatch?.localId || null,
                
                defaultAddressId: null,

                currencyId: currMatch?.localId || null,
                defaultPaymentTermsId: paymentMatch?.localId || null,
                taxingSchemeId: taxingMatch?.localId || null,
              }
            }
          });
        }
      }
    }

    return jobsToQueue;
  }
}
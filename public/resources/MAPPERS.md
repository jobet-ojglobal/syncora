# Outbound (When distributing to your queues)

const mappings = await prisma.taxingSchemeLocationMap.findMany({
  where: { taxingSchemeId: cloudId }
});

const jobsToQueue = validLocations.map((loc) => {
  // Find the exact integer ID that this specific location knows this record by
  const match = mappings.find(m => m.locationId === loc.inflowId);

  return {
    name: "taxing_scheme_localsync_job",
    data: {
      source: "TAXING_SCHEME_UPSERT_LOCAL",
      model: "TaxingScheme",
      payload: {
        ...cleanInflowPayload,
        // If it exists locally, pass its local ID so the node knows to UPDATE instead of CREATE
        taxingSchemeId: match ? match.localId : null, 
      },
      location: loc
    }
  };
});

# Inbound (When a Local Node sends an update to your webhooks)

const mapping = await prisma.taxingSchemeLocationMap.findUnique({
  where: {
    // Unique compound indexes make this incredibly fast
    taxingSchemeId_locationId: {
      locationId: webhookPayload.locationId,
      localId: webhookPayload.localId
    }
  },
  select: { taxingSchemeId: true }
});

const globalCloudId = mapping?.taxingSchemeId;
// Now you know exactly which central cloud record needs modifying!






CategoryLocationMap
ProductGroupLocationMap
ProductVariantLocationMap
ProductLocationMap
ProductPriceLocationMap
ProductCostAdjustmentLocationMap
ProductBarcodeLocationMap
ProductOperationLocationMap
OperationTypeLocationMap
ProductAttachmentLocationMap
ProductCostLocationMap
ReorderSettingLocationMap
ProductBomLocationMap
ProductImageLocationMap
ProductGroupOptionLocationMap
ProductGroupOptionValueLocationMap
AdjustmentReasonLocationMap
CurrencyLocationMap
CurrencyConversionLocationMap
PricingSchemeLocationMap
PaymentTermLocationMap
TeamMemberLocationMapExtended
CustomerLocationMap
CustomerDueLocationMap
CustomerBalanceLocationMap
CustomerCreditLocationMap
VendorLocationMap
VendorAttachmentLocationMap
VendorItemLocationMap
VendorDueLocationMap
VendorBalanceLocationMap
VendorCreditLocationMap
import { getLocalBatchCategories } from "@/lib/locations/data/category";
import { getLocalBatchCurrencies } from "@/lib/locations/data/currency";
import { getLocalBatchCustomers } from "@/lib/locations/data/customer";
import { getLocalBatchLocations } from "@/lib/locations/data/location";
import { getLocalBatchPaymentTerms } from "@/lib/locations/data/payment-term";
import { getLocalBatchPricingSchemes } from "@/lib/locations/data/pricing-scheme";
import { getLocalBatchProducts, getLocalBatchInventory } from "@/lib/locations/data/product-local";
import { getLocalBatchTaxingSchemes } from "@/lib/locations/data/taxing-scheme";
import { getLocalBatchVendors } from "@/lib/locations/data/vendors";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locationId, source, count = 10, after } = body;

    if (!source || !locationId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { url: true }
    });

    if (!location?.url) {
      return NextResponse.json({ error: "Location endpoint URL not configured" }, { status: 400 });
    }

    if (source === "inventory_lines_local") {
      const items = await getLocalBatchInventory(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.productId,
        name: loc.name || "Unnamed Product",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
          hasNextPage: rawList.length === count,
          endCursor,
        },
      });
    } else if (source === "categories_local") {
      const items = await getLocalBatchCategories(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.categoryId,
        name: loc.name || "Unnamed Category",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
        hasNextPage: rawList.length === count,
        endCursor,
        },
      });
    } else if (source === "currencies_local") {
      const items = await getLocalBatchCurrencies(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.currencyId,
        name: loc.code || "Unnamed Currency",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
        hasNextPage: rawList.length === count,
        endCursor,
        },
      });
    } else if (source === "taxing_schemes_local") {
      const items = await getLocalBatchTaxingSchemes(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.taxingSchemeId,
        name: loc.name || "Unnamed Taxing Scheme",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
        hasNextPage: rawList.length === count,
        endCursor,
        },
      });
    } else if (source === "pricing_schemes_local") {
      const items = await getLocalBatchPricingSchemes(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.pricingSchemeId,
        name: loc.name || "Unnamed Pricing Scheme",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
        hasNextPage: rawList.length === count,
        endCursor,
        },
      });
    } else if (source === "products_local_map") {
      const items = await getLocalBatchProducts(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.productId,
        name: loc.name || "Unnamed Product",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
        hasNextPage: rawList.length === count,
        endCursor,
        },
      });
    } else if (source === "products_local_sync") {
      const items = await getLocalBatchProducts(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.productId,
        name: loc.name || "Unnamed Product",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
        hasNextPage: rawList.length === count,
        endCursor,
        },
      });
    } else if (source === "payment_terms_local") {
      const items = await getLocalBatchPaymentTerms(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.paymentTermsId,
        name: loc.name || "Unnamed Payment Term",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
        hasNextPage: rawList.length === count,
        endCursor,
        },
      });
    } else if (source === "customers_local") {
      const items = await getLocalBatchCustomers(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.customerId,
        name: loc.name || "Unnamed Customer",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
        hasNextPage: rawList.length === count,
        endCursor,
        },
      });
    } else if (source === "vendors_local") {
      const items = await getLocalBatchVendors(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.filter(item => item.isActive === 1).map((loc: any) => ({
        ...loc,
        itemId: loc.vendorId,
        name: loc.name || "Unnamed Vendor",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
        hasNextPage: rawList.length === count,
        endCursor,
        },
      });
    } else if (source === "locations_local") {
      const items = await getLocalBatchLocations(location.url, count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.locationId,
        name: loc.name || "Unnamed Location",
      }));

      const endCursor = normalizedItems.length > 0 
        ? normalizedItems[normalizedItems.length - 1].itemId 
        : null;

      return NextResponse.json({
        items: normalizedItems,
        pageInfo: {
        hasNextPage: rawList.length === count,
        endCursor,
        },
      });
    }  

    return NextResponse.json({ items: [], pageInfo: { hasNextPage: false, endCursor: null } });
  } catch (error) {
    console.error("Preview API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load preview" },
      { status: 500 }
    );
  }
}

// <SyncButtonOptionsPreview isDisabled={!webhook} locationId={selectedLocationInflowId} source="categories_local" title="Categories" />
// <SyncButtonOptionsPreview isDisabled={!webhook} locationId={selectedLocationInflowId} source="currencies_local" title="Currency" />
// <SyncButtonOptionsPreview isDisabled={!webhook} locationId={selectedLocationInflowId} source="taxing_schemes_local" title="Taxing Schemes" />
// <SyncButtonOptionsPreview isDisabled={!webhook} locationId={selectedLocationInflowId} source="pricing_schemes_local" title="Pricing Schemes" />
// <SyncButtonOptionsPreview isDisabled={!webhook} locationId={selectedLocationInflowId} source="products_local" title="Products" />
// <SyncButtonOptionsPreview isDisabled={!webhook} locationId={selectedLocationInflowId} source="payment_terms_local" title="Payment Terms" />
// <SyncButtonOptionsPreview isDisabled={!webhook} locationId={selectedLocationInflowId} source="customers_local" title="Customers" />
// <SyncButtonOptionsPreview isDisabled={!webhook} locationId={selectedLocationInflowId} source="locations_local" title="Locations" />
// <SyncButtonOptionsPreview isDisabled={!webhook} locationId={selectedLocationInflowId} source="inventory_lines_local" title="Inventory Lines" />
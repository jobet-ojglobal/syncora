// app/api/sync/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTaxingSchemes } from "@/lib/locations/data/taxing-scheme";
import { getCustomers } from "@/lib/locations/data/customer";
import { getCurrencies } from "@/lib/locations/data/currency";
import { getCategories } from "@/lib/locations/data/category";
import { getPricingSchemes } from "@/lib/locations/data/pricing-scheme";
import { getPaymentTerms } from "@/lib/locations/data/payment-term";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source");
    const locationId = searchParams.get("locationId");

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

    // Dynamic routing depending on your source
    if (source === "taxing_schemes_local") {
      const rawSchemes = await getTaxingSchemes(location.url);
      
      // Transform records into a uniform preview structure
      const previewItems = rawSchemes.map((scheme: any) => ({
        id: String(scheme.taxingSchemeId), // incoming original ID
        name: scheme.name,
        description: `${scheme.taxCodes?.length || 0} nested tax codes present`,
        rawData: scheme, // Cache full object to pass back later
      }));

      return NextResponse.json({ items: previewItems });
    } else if (source === "pricing_schemes_local") {
      const rawSchemes = await getPricingSchemes(location.url);
      
      // Transform records into a uniform preview structure
      const previewItems = rawSchemes.map((scheme: any) => ({
        id: String(scheme.pricingSchemeId), // incoming original ID
        name: scheme.name,
        description: `0 nested tax codes present`,
        rawData: scheme, // Cache full object to pass back later
      }));

      return NextResponse.json({ items: previewItems });
    } else if (source === "customers_local") {
      const rawCustomer = await getCustomers(location.url);
      
      // Transform records into a uniform preview structure
      const previewItems = rawCustomer.map((scheme: any) => ({
        id: String(scheme.customerId), // incoming original ID
        name: scheme.name,
        description: `${scheme.dues?.length || 0} nested dues present. ${scheme.balances?.length || 0} nested balances present. ${scheme.credits?.length || 0} nested credits present.`,
        rawData: scheme, // Cache full object to pass back later
      }));

      return NextResponse.json({ items: previewItems });
    } else if (source === "currencies_local") {
      const rawCurrency = await getCurrencies(location.url);
      
      // Transform records into a uniform preview structure
      const previewItems = rawCurrency.map((scheme: any) => ({
        id: String(scheme.currencyId), // incoming original ID
        name: scheme.description,
        description: `${scheme.address?.length || 0} nested items present`,
        rawData: scheme, // Cache full object to pass back later
      }));

      return NextResponse.json({ items: previewItems });
    } else if (source === "payment_terms_local") {
      const rawPayment = await getPaymentTerms(location.url);
      
      // Transform records into a uniform preview structure
      const previewItems = rawPayment.map((scheme: any) => ({
        id: String(scheme.paymentTermId), // incoming original ID
        name: scheme.name,
        description: `0 nested items present`,
        rawData: scheme, // Cache full object to pass back later
      }));

      return NextResponse.json({ items: previewItems });
    } else if (source === "categories_local") {
      const rawCategories = await getCategories(location.url);
      
      // Transform records into a uniform preview structure
      const previewItems = rawCategories.map((scheme: any) => ({
        id: String(scheme.categoryId), // incoming original ID
        name: scheme.name,
        description: `0 nested items present`,
        rawData: scheme, // Cache full object to pass back later
      }));

      return NextResponse.json({ items: previewItems });
    }
    

    return NextResponse.json({ items: [] });
  } catch (error) {
    console.error("Preview payload error:", error);
    return NextResponse.json({ error: "Failed to generate preview dataset" }, { status: 500 });
  }
}

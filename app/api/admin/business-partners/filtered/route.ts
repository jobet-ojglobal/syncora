import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const role = searchParams.get("role") || "ALL"; // ALL, CUSTOMER, VENDOR
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));

    const skip = page * limit;

    // 1. Build Base Conditions
    const whereConditions: Prisma.BusinessPartnerWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { contactName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    // 2. Dynamic Role Filtering (existence of joined 1-to-1 relationships)
    if (role === "CUSTOMER") {
      whereConditions.customer = { isNot: null };
    } else if (role === "VENDOR") {
      whereConditions.vendor = { isNot: null };
    }

    // 3. Database Execution
    const [totalRecords, partners] = await prisma.$transaction([
      prisma.businessPartner.count({ where: whereConditions }),
      prisma.businessPartner.findMany({
        where: whereConditions,
        skip,
        take: limit,
        include: {
          addresses: {
            select: {
              city: true,
              state: true,
              country: true,
            },
            take: 1,
          },
          customer: {
            include: {
              pricingScheme: { select: { name: true } },
              taxingScheme: { select: { name: true } },
              balances: {
                select: {
                  balance: true,
                  currency: { select: { symbol: true, isoCode: true } }
                }
              },
              _count: { select: { salesOrders: true } }
            }
          },
          vendor: {
            include: {
              currency: { select: { isoCode: true } },
              dues: { take: 1 },
              _count: { select: { products: true, purchaseOrders: true } }
            }
          }
        },
        orderBy: { name: "asc" }
      })
    ]);

    // 4. Flatten Payload structure for simple presentation
    const transformedData = partners.map((bp) => {
      // Resolve primary address metadata
      const primaryAddress = bp.addresses[0];
      const regionalScope = primaryAddress 
        ? `${primaryAddress.city}, ${primaryAddress.state} (${primaryAddress.country})`
        : "No Address Configured";

      // Parse Customer details if they exist
      let customerMetrics = null;
      if (bp.customer) {
        const totalOutstandingBalance = bp.customer.balances.reduce((acc, cur) => acc + Number(cur.balance), 0);
        const standardWallet = bp.customer.balances[0];
        customerMetrics = {
          inflowId: bp.customer.inflowId,
          pricingTier: bp.customer.pricingScheme?.name || "Standard Catalog Price",
          taxingSchemeName: bp.customer.taxingScheme?.name || "Tax Exempt / Open",
          salesOrderCount: bp.customer._count.salesOrders,
          netBalance: totalOutstandingBalance,
          currencySymbol: standardWallet?.currency?.symbol || "$",
          currencyIso: standardWallet?.currency?.isoCode || "USD"
        };
      }

      // Parse Vendor details if they exist
      let vendorMetrics = null;
      if (bp.vendor) {
        const liveDuesRow = bp.vendor.dues[0];
        const totalOutstandingDebt = liveDuesRow 
          ? Number(liveDuesRow.amountCurrent) + 
            Number(liveDuesRow.amount1To30) + 
            Number(liveDuesRow.amount31To60) + 
            Number(liveDuesRow.amount61Plus)
          : 0;

        vendorMetrics = {
          inflowId: bp.vendor.inflowId,
          catalogItemsCount: bp.vendor._count.products,
          purchaseOrdersCount: bp.vendor._count.purchaseOrders,
          outstandingBalance: totalOutstandingDebt,
          currencyCode: bp.vendor.currency?.isoCode || "USD",
          hasCriticalPastDue: liveDuesRow ? Number(liveDuesRow.amount61Plus) > 0 : false,
        };
      }

      return {
        id: bp.id,
        name: bp.name,
        contactName: bp.contactName || "N/A",
        email: bp.email || "No Email Registered",
        phone: bp.phone || "No Phone",
        isActive: bp.isActive,
        regionalScope,
        customer: customerMetrics,
        vendor: vendorMetrics
      };
    });

    const pageCount = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      data: transformedData,
      totalRecords,
      pageCount,
    }, { status: 200 });

  } catch (error) {
    console.error("Failed compiling business partner register:", error);
    return NextResponse.json(
      { error: "Database fault compiling unified ledger." },
      { status: 500 }
    );
  }
}
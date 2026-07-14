// app/api/admin/customers/filtered/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Extract, clean, and convert URL tracking parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));

    const skip = page * limit;

    // 2. Construct search logic matching relation fields (e.g., businessPartner details)
    const whereConditions: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { inflowId: { contains: search, mode: "insensitive" } },
          {
            businessPartner: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { contactName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        ],
      }),
    };

    // 3. Concurrently pull total matching scale alongside targeted data rows
    const [totalRecords, clients] = await prisma.$transaction([
      prisma.customer.count({ where: whereConditions }),
      prisma.customer.findMany({
        where: whereConditions,
        skip,
        take: limit,
        include: {
          businessPartner: {
            select: {
              name: true,
              contactName: true,
              email: true,
              phone: true,
              isActive: true,
              addresses: {
                select: {
                  city: true,
                  state: true,
                  country: true,
                }
              }
            }
          },
          pricingScheme: { select: { name: true } },
          taxingScheme: { select: { name: true } },
          balances: {
            select: {
              balance: true,
              currency: { select: { symbol: true, isoCode: true } }
            }
          },
          _count: {
            select: {
              salesOrders: true
            }
          }
        },
        orderBy: { businessPartner: { name: "asc" } }
      })
    ]);

    // 4. Map records structure to flatten nested enterprise addresses and models
    const transformedDirectory = clients.map((c) => {
      const totalOutstandingBalance = c.balances.reduce((acc, cur) => acc + Number(cur.balance), 0);
      const standardWallet = c.balances[0];
      const currencySymbol = standardWallet?.currency?.symbol || "$";
      const currencyIso = standardWallet?.currency?.isoCode || "USD";

      const primaryAddress = c.businessPartner.addresses[0];
      const regionalScope = primaryAddress 
        ? `${primaryAddress.city}, ${primaryAddress.state} (${primaryAddress.country})`
        : "No Address Configured";

      return {
        id: c.id,
        inflowId: c.inflowId,
        legalName: c.businessPartner.name,
        contactName: c.businessPartner.contactName || "N/A",
        email: c.businessPartner.email || "No Email Registered",
        phone: c.businessPartner.phone || "No Phone",
        isActive: c.businessPartner.isActive,
        regionalScope,
        pricingTier: c.pricingScheme?.name || "Standard Catalog Price",
        taxingSchemeName: c.taxingScheme?.name || "Tax Exempt / Open",
        salesOrderCount: c._count.salesOrders,
        financialMetrics: {
          netBalance: totalOutstandingBalance,
          symbol: currencySymbol,
          isoCode: currencyIso
        }
      };
    });

    const pageCount = Math.ceil(totalRecords / limit);

    // 5. Package output variables matching client's grid requirements
    return NextResponse.json({
      data: transformedDirectory,
      totalRecords,
      pageCount,
    }, { status: 200 });

  } catch (error) {
    console.error("Critical server breakdown reading enterprise client directories rosters:", error);
    return NextResponse.json(
      { error: "Internal server error assembling multi-table commercial customer indices portfolios." },
      { status: 500 }
    );
  }
}
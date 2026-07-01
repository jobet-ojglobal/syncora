// app/api/admin/customers/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clients = await prisma.customer.findMany({
      where: { deletedAt: null },
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
    });

    const transformedDirectory = clients.map(c => {
      // Aggregate outstanding balances across foreign currency wallets
      const totalOutstandingBalance = c.balances.reduce((acc, cur) => acc + Number(cur.balance), 0);
      const standardWallet = c.balances[0];
      const currencySymbol = standardWallet?.currency?.symbol || "$";
      const currencyIso = standardWallet?.currency?.isoCode || "USD";

      // Flatten address array to pinpoint primary headquarters region
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

    return NextResponse.json(transformedDirectory, { status: 200 });
  } catch (error) {
    console.error("Critical server breakdown reading enterprise client directories rosters:", error);
    return NextResponse.json(
      { error: "Internal server error assembling multi-table commercial customer indices portfolios." },
      { status: 500 }
    );
  }
}
// app/api/admin/currencies/rate-update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const { inflowId, exchangeRate } = await request.json();

    if (!inflowId || !exchangeRate) {
      return NextResponse.json({ error: "Missing tracking unique verification keys parameters references indices." }, { status: 400 });
    }

    // Append a clean new item entry to the chronological currency conversion log
    const updatedMetricLog = await prisma.currencyConversion.create({
      data: {
        inflowId: `CNV-${Math.floor(100000 + Math.random() * 900000)}`,
        currencyId: inflowId,
        exchangeRate: exchangeRate,
        isManual: false // Automatically sets to false since data originates from a live market API callback loop
      }
    });

    return NextResponse.json({ success: true, loggedExchangeRateUpdateInflowId: updatedMetricLog.inflowId }, { status: 200 });
  } catch (error) {
    console.error("Failed running macro inline exchange update transaction:", error);
    return NextResponse.json({ error: "Internal Server database pipeline failure processing conversion parameters." }, { status: 500 });
  }
}
// app/api/admin/currencies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isoCode, symbol, decimalPlaces, decimalSeparator, thousandsSeparator, isSymbolFirst, negativeType, exchangeRate, isManual } = body;

    if (!isoCode || !name || !symbol) {
      return NextResponse.json({ error: "Missing mandatory structural corporate standard validation fields parameters criteria tokens." }, { status: 400 });
    }

    const deployedRecord = await prisma.$transaction(async (tx) => {
      // 1. Establish structural base localization formatting layout standard rules map card
      const currency = await tx.currency.create({
        data: {
          inflowId: crypto.randomUUID().toLowerCase(),
          name: name.trim(),
          isoCode: isoCode.trim().toUpperCase(),
          symbol: symbol.trim(),
          decimalPlaces,
          decimalSeparator,
          thousandsSeparator,
          isSymbolFirst,
          negativeType
        }
      });

      // 2. Instantiate matching active exchange multiplication calibration reference record index row lines
      await tx.currencyConversion.create({
        data: {
          inflowId: crypto.randomUUID().toLowerCase(),
          currencyId: currency.inflowId,
          exchangeRate: exchangeRate || 1.00000000,
          isManual
        }
      });

      return currency;
    });

    return NextResponse.json(deployedRecord, { status: 201 });
  } catch (error: any) {
    console.error("Forex engine architecture mapping configuration storage crashed:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Monetary ISO unique collision constraints breach. This currency handle exists inside ledger archives." }, { status: 409 });
    }
    return NextResponse.json({ error: "Database storage engine pipeline dropped writing currency vectors parameters rows." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, symbol, decimalPlaces, decimalSeparator, thousandsSeparator, isSymbolFirst, negativeType, exchangeRate, isManual } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing currency reference tracker payload identification identifier." }, { status: 400 });
    }

    const structuralUpdate = await prisma.$transaction(async (tx) => {
      // 1. Save core structural typographic localization properties rules variables 
      const currency = await tx.currency.update({
        where: { id },
        data: {
          name: name.trim(),
          symbol: symbol.trim(),
          decimalPlaces,
          decimalSeparator,
          thousandsSeparator,
          isSymbolFirst,
          negativeType
        }
      });

      // 2. Clear out historic conversion entries or upsert active configuration rates lines maps tracking vectors
      await tx.currencyConversion.deleteMany({ where: { currencyId: currency.inflowId } });
      await tx.currencyConversion.create({
        data: {
          inflowId: crypto.randomUUID().toLowerCase(),
          currencyId: currency.inflowId,
          exchangeRate: exchangeRate || 1.00000000,
          isManual
        }
      });

      return currency;
    });

    return NextResponse.json(structuralUpdate, { status: 200 });
  } catch (error) {
    console.error("Forex structural pipeline adjustment aborted:", error);
    return NextResponse.json({ error: "Internal operational write database connection abort error." }, { status: 500 });
  }
}
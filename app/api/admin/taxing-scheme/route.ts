// app/api/admin/taxing-schemes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, isActive, isDefault, calculateTax2OnTax1, 
      tax1Name, tax1OnShipping, tax2Name, tax2OnShipping, taxCodes 
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Missing required taxing scheme name." }, { status: 400 });
    }

    const schemeInflowId = crypto.randomUUID().toLowerCase();

    const compiledScheme = await prisma.$transaction(async (tx) => {
      // 1. Enforce single global default rule
      if (isDefault) {
        await tx.taxingScheme.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });
      }

      // 2. Build foundational taxing scheme
      const scheme = await tx.taxingScheme.create({
        data: {
          inflowId: schemeInflowId,
          name: name.trim(),
          isActive: isActive ?? true,
          isDefault: isDefault ?? false,
          calculateTax2OnTax1: tax2Name ? (calculateTax2OnTax1 ?? false) : false,
          tax1Name: tax1Name?.trim() || null,
          tax1OnShipping: tax1OnShipping ?? false,
          tax2Name: tax2Name?.trim() || null,
          tax2OnShipping: tax2OnShipping ?? false,
        },
      });

      // 3. Batch insert child tax codes if they exist
      if (taxCodes && Array.isArray(taxCodes) && taxCodes.length > 0) {
        // Map payloads out with pre-generated IDs to avoid loop DB roundtrips
        const taxCodesData = taxCodes.map((tc) => ({
          inflowId: crypto.randomUUID().toLowerCase(),
          taxingSchemeId: schemeInflowId,
          name: tc.name.trim().toUpperCase(),
          isActive: tc.isActive ?? true,
          tax1Rate: tc.tax1Rate || 0,
          tax2Rate: tax2Name ? (tc.tax2Rate || 0) : 0,
        }));

        await tx.taxCode.createMany({
          data: taxCodesData,
        });

        // Set the first item as the default tax code identifier
        await tx.taxingScheme.update({
          where: { id: scheme.id },
          data: { defaultTaxCodeId: taxCodesData[0].inflowId },
        });
      }

      return await tx.taxingScheme.findUnique({
        where: { id: scheme.id },
        include: { taxCodes: true },
      });
    });

    return NextResponse.json(compiledScheme, { status: 201 });
  } catch (error) {
    console.error("Failed to create taxing scheme:", error);
    return NextResponse.json({ error: "Internal server database transaction failure." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, name, isActive, isDefault, calculateTax2OnTax1, 
      tax1Name, tax1OnShipping, tax2Name, tax2OnShipping, taxCodes 
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Target taxing scheme identifier is missing." }, { status: 400 });
    }

    const modifiedScheme = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.taxingScheme.updateMany({
          where: { NOT: { id }, isDefault: true },
          data: { isDefault: false }
        });
      }

      const scheme = await tx.taxingScheme.findUnique({
        where: { id },
        select: { inflowId: true }
      });

      if (!scheme) {
        throw new Error("Taxing Scheme not found.");
      }

      // Drop historic children elements safely 
      // NOTE: Consider switching to an upside upsert/update strategy if inflowId is leveraged as a foreign key downstream!
      await tx.taxCode.deleteMany({ where: { taxingSchemeId: scheme.inflowId } });

      let defaultTaxCodeId: string | null = null;

      if (taxCodes && Array.isArray(taxCodes) && taxCodes.length > 0) {
        const taxCodesData = taxCodes.map((tc) => ({
          inflowId: crypto.randomUUID().toLowerCase(),
          taxingSchemeId: scheme.inflowId,
          name: tc.name.trim().toUpperCase(),
          isActive: tc.isActive ?? true,
          tax1Rate: tc.tax1Rate || 0,
          tax2Rate: tax2Name ? (tc.tax2Rate || 0) : 0,
        }));

        await tx.taxCode.createMany({
          data: taxCodesData,
        });

        defaultTaxCodeId = taxCodesData[0].inflowId;
      }

      return await tx.taxingScheme.update({
        where: { id },
        data: {
          name: name?.trim(),
          isActive,
          isDefault,
          calculateTax2OnTax1: tax2Name ? calculateTax2OnTax1 : false,
          tax1Name: tax1Name?.trim() || null,
          tax1OnShipping,
          tax2Name: tax2Name?.trim() || null,
          tax2OnShipping,
          defaultTaxCodeId,
        },
        include: { taxCodes: true }
      });
    });

    return NextResponse.json(modifiedScheme, { status: 200 });
  } catch (error) {
    console.error("Failed to update taxing scheme:", error);
    return NextResponse.json({ error: "Internal server database write transaction failure." }, { status: 500 });
  }
}
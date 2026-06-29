// app/api/admin/taxing-schemes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isActive, isDefault, calculateTax2OnTax1, tax1Name, tax1OnShipping, tax2Name, tax2OnShipping, taxCodes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Missing required taxing scheme display group name designation." }, { status: 400 });
    }

    const inflowId = crypto.randomUUID().toLowerCase();

    const compiledScheme = await prisma.$transaction(async (tx) => {
      // 1. If this new entry is flag-marked as system default, auto-disable previous entries defaults status to preserve system configuration balance rules
      if (isDefault) {
        await tx.taxingScheme.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });
      }

      // 2. Build foundational parent schema configuration data row sheet node
      const scheme = await tx.taxingScheme.create({
        data: {
          inflowId,
          name: name.trim(),
          isActive,
          isDefault,
          calculateTax2OnTax1: tax2Name ? calculateTax2OnTax1 : false,
          tax1Name: tax1Name?.trim() || null,
          tax1OnShipping,
          tax2Name: tax2Name?.trim() || null,
          tax2OnShipping,
        }
      });

      // 3. Hydrate dynamic structural child zones rates records mapping objects paths loop arrays
      if (taxCodes && taxCodes.length > 0) {
        await tx.taxCode.createMany({
          data: taxCodes.map((tc: any) => {
            const taxInflowId = crypto.randomUUID().toLowerCase();
            return ({
              inflowId: taxInflowId,
              taxingSchemeId: scheme.inflowId,
              name: tc.name.trim().toUpperCase(),
              isActive: tc.isActive,
              tax1Rate: tc.tax1Rate || 0,
              tax2Rate: tax2Name ? (tc.tax2Rate || 0) : 0,
            })
          })
        });

        // Set fallback first entry element as baseline default code parameters for scheme profile card context
        const firstInsertedCode = taxCodes[0];
        await tx.taxingScheme.update({
          where: { id: scheme.id },
          data: { defaultTaxCodeId: firstInsertedCode.inflowId }
        });
      }

      return scheme;
    });

    return NextResponse.json(compiledScheme, { status: 201 });
  } catch (error: any) {
    console.error("Critical server transaction failed deploying taxation metrics profile:", error);
    return NextResponse.json({ error: "Internal Database structure transaction abort exception." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { inflowId, name, isActive, isDefault, calculateTax2OnTax1, tax1Name, tax1OnShipping, tax2Name, tax2OnShipping, taxCodes } = body;

    if (!inflowId) {
      return NextResponse.json({ error: "Identity token verification query pointer target missing." }, { status: 400 });
    }

    const modifiedScheme = await prisma.$transaction(async (tx) => {
      // Balance systems-wide standard global rules checkboxes
      if (isDefault) {
        await tx.taxingScheme.updateMany({
          where: { NOT: { inflowId }, isDefault: true },
          data: { isDefault: false }
        });
      }

      // Drop historic children rates calculations elements entries lines cascade nodes explicitly to maintain atomic balance paths configurations trees parameters safety
      await tx.taxCode.deleteMany({ where: { taxingSchemeId: inflowId } });

      // Build updated data tracking values map objects arrays onto parent table card matrix
      const scheme = await tx.taxingScheme.update({
        where: { inflowId },
        data: {
          name: name.trim(),
          isActive,
          isDefault,
          calculateTax2OnTax1: tax2Name ? calculateTax2OnTax1 : false,
          tax1Name: tax1Name?.trim() || null,
          tax1OnShipping,
          tax2Name: tax2Name?.trim() || null,
          tax2OnShipping,
          defaultTaxCodeId: taxCodes && taxCodes.length > 0 ? taxCodes[0].inflowId : null
        }
      });

      // Write freshly modified clean dataset collection codes structures loops
      if (taxCodes && taxCodes.length > 0) {
        await tx.taxCode.createMany({
          data: taxCodes.map((tc: any) => ({
            inflowId: tc.inflowId,
            taxingSchemeId: inflowId,
            name: tc.name.trim().toUpperCase(),
            isActive: tc.isActive,
            tax1Rate: tc.tax1Rate || 0,
            tax2Rate: tax2Name ? (tc.tax2Rate || 0) : 0,
          }))
        });
      }

      return scheme;
    });

    return NextResponse.json(modifiedScheme, { status: 200 });
  } catch (error) {
    console.error("Failed adjusting corporate taxation tracking boundaries parameters configuration structures:", error);
    return NextResponse.json({ error: "Internal Database modification pipeline write transaction execution crash." }, { status: 500 });
  }
}
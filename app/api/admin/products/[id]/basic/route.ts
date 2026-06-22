// app/api/products/[inflowId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } =
      await params;

    if (!id) {
      return NextResponse.json(
        { error: "Product tracking identification token parameter is required." },
        { status: 400 }
      );
    }

    // Query product data with all related tables needed for the editing form schema
    const productProfile = await prisma.product.findFirst({
      where: { 
        id,
        deletedAt: null // Safeguard to ensure soft-deleted rows are hidden
      },
      include: {
        variant: {
          select: {
            productGroupId: true,
            signature: true
          }
        },
        purchasingUom: {
          include: {
            uom: { select: { code: true, name: true } }
          }
        },
        salesUom: {
          include: {
            uom: { select: { code: true, name: true } }
          }
        },
        barcodes: {
          select: {
            id: true,
            barcode: true
          },
          orderBy: { lineNum: "asc" }
        },
        images: {
          select: {
            id: true,
            originalUrl: true,
            position: true
          },
          orderBy: { position: "asc" }
        }
      }
    });

    // Handle missing records safely
    if (!productProfile) {
      return NextResponse.json(
        { error: "The targeted product SKU record could not be found inside active system catalogs." },
        { status: 404 }
      );
    }

    // Remap data types explicitly to clean up floating point numbers for standard text inputs
    const formattedPayload = {
      ...productProfile,
      weight: productProfile.weight ? Number(productProfile.weight) : null,
      width: productProfile.width ? Number(productProfile.width) : null,
      height: productProfile.height ? Number(productProfile.height) : null,
      length: productProfile.length ? Number(productProfile.length) : null,
      purchasingUom: productProfile.purchasingUom ? {
        name: productProfile.purchasingUom.uom?.code || productProfile.purchasingUom.uom?.name || "",
        standardQuantity: Number(productProfile.purchasingUom.standardQuantity),
        uomQuantity: Number(productProfile.purchasingUom.uomQuantity)
      } : null,
      salesUom: productProfile.salesUom ? {
        name: productProfile.salesUom.uom?.code || productProfile.salesUom.uom?.name || "",
        standardQuantity: Number(productProfile.salesUom.standardQuantity),
        uomQuantity: Number(productProfile.salesUom.uomQuantity)
      } : null
    };

    return NextResponse.json(formattedPayload, { status: 200 });
  } catch (error) {
    console.error("Critical error extracting SKU metadata parameters for modification:", error);
    return NextResponse.json(
      { error: "Internal Database query execution failure during entity parsing." },
      { status: 500 }
    );
  }
}
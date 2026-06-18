import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// =====================================================
// GET GROUP
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } =
      await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required product group identifier parameter." },
        { status: 400 }
      );
    }

    // Query the database pulling all multi-tiered relational layers
    const productGroup = await prisma.productGroup.findFirst({
      where: {
        OR: [
          { id: id },
          { slug: id }
        ]
      },
      include: {
        // Load the structural variation configuration rules
        options: {
          orderBy: { lineNum: "asc" },
          include: {
            attribute: {
              select: { name: true }
            },
            values: {
              orderBy: { lineNum: "asc" },
              include: {
                attributeValue: {
                  select: { value: true }
                }
              }
            }
          }
        },
        // Load actual generated inventory balance lines
        variants: {
          include: {
            product: {
              select: {
                inflowId: true,
                sku: true,
                name: true,
                isActive: true
              }
            }
          }
        },
        // Load technical specification meta maps
        features: {
          include: {
            feature: true,
            featureValue: {
              select: {
                value: true
              }
            }
          }
        },
        // Load discoverability lookup tags
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!productGroup) {
      return NextResponse.json(
        { error: "Requested product profile matrix not found within active catalog clusters." },
        { status: 404 }
      );
    }

    // 🎯 Flatten and normalize the payload so it satisfies your frontend form structure perfectly
    const formattedData = {
      id: productGroup.inflowId,
      name: productGroup.name,
      slug: productGroup.slug,
      description: productGroup.description,
      brandId: productGroup.brandId,
      categoryId: productGroup.categoryId,
      isActive: productGroup.isActive,
      
      // Map tags array to primitive array ["tag1", "tag2"]
      tags: productGroup.tags.map((pt) => pt.tag.name),
      
      // Map global specifications array
      features: productGroup.features.map((f) => ({
        key: f.feature.name,
        value: f.featureValue?.value
      })),
      
      // Standardize variant option arrays for sub-arrays loops
      options: productGroup.options.map((opt) => ({
        name: opt.attribute?.name || "",
        attributeId: opt.attributeId || "",
        values: opt.values.map((v) => ({
          value: v.attributeValue?.value || ""
        }))
      })),
      
      // Formulate active matrix inventory records for your VariantsManagerTable UI layout
      variants: productGroup.variants.map((v) => ({
        productId: v.productId,
        variantId: v.inflowId,
        sku: v.product.sku,
        name: v.product.name,
        defaultPrice: Number(v.defaultPrice),
        isExisting: true, // Prevents code thinking it is an inline delta change
        status: "active"  // Defaults lifecycle action track state
      }))
    };

    return NextResponse.json(formattedData, { status: 200 });
  } catch (error: any) {
    console.error("Failed to read matrix product group profile:", error);
    return NextResponse.json(
      { error: error.message || "Internal transaction layer execution crash." },
      { status: 500 }
    );
  }
}
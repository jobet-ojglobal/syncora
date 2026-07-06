import { prisma } from "@/lib/prisma";

export async function getProductGroupMetadata() {
  const [brands, attributesRaw] = await Promise.all([
    prisma.brand.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.attribute.findMany({
      include: {
        values: {
          select: { id: true, value: true, hexCode: true },
          orderBy: { value: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const attributes = attributesRaw.map((attr) => ({
    attributeId: attr.id,
    name: attr.name,
    options: attr.values.map((val) => ({
      valueId: val.id,
      label: val.value,
      meta: val.hexCode ? { hexCode: val.hexCode } : null,
    })),
  }));

  return { brands, attributes };
}


export async function getProductMetadata() {
  const [uoms, brands, groupsRaw] = await Promise.all([
    prisma.unitOfMeasure.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, category: true, }, orderBy: { code: "asc" } }),
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.productGroup.findMany({
      where: {
        deletedAt: null, 
      },
      select: {
        id: true,
        inflowId: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        brandId: true,
        categoryId: true,
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            inflowId: true,
            name: true,
          },
        },
        variants: {
          select: {
            inflowId: true,
            signature: true,
            productId: true,
            defaultPrice: true,
            isActive: true,
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
            selections: {
              select: {
                optionId: true,
                optionValueId: true,
                optionValue: {
                  select: {
                    attributeValue: {
                      select: {
                        id: true,
                        value: true, 
                      },
                    },
                  },
                },
              },
            },
          },
        },
        options: {
          orderBy: {
            lineNum: "asc",
          },
          select: {
            inflowId: true,
            lineNum: true,
            attribute: {
              select: {
                id: true,
                name: true,
              },
            },
            values: {
              orderBy: {
                lineNum: "asc",
              },
              select: {
                inflowId: true,
                lineNum: true,
                attributeValue: {
                  select: {
                    id: true,
                    value: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc", 
      },
    })
  ]);

  const groups = groupsRaw.map((group) => ({
    ...group,
    variants: group.variants.map((v) => ({
      ...v,
      // Cast the Prisma Decimal object securely to a native JavaScript number
      defaultPrice: Number(v.defaultPrice), 
    })),
  }));

  return { uoms, brands, groups };
}
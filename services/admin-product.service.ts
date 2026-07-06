import { prisma } from "@/lib/prisma";
import { CreateProductInput } from "@/schemas/product.schema";
import { CreateProductGroupInput } from "@/schemas/product-group.schema";
// import { createProductGroup } from "@/lib/inflow/data/product-group";
import { syncProductGroup } from "@/lib/inflow/services/product-group-sync";

export class AdminProductService {
  async fetchAll() {
    return prisma.product.findMany({
      include: {
        brand: true,
        purchasingUom: true,
        salesUom: true,
        features: {
          include: {
            feature: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        variant: {
          select: {
            defaultPrice: true,
            group: {
              select: {
                isActive: true,
                name: true,
                category:true
              }
            },
          }
        },
        
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  

  // async createProduct(input: CreateProductGroupInput) {
  //   // Generate a globally unique identifier (GUID/UUID) for the inFlow ecosystem entity
  //   const generatedGroupGuid = crypto.randomUUID();

  //   return await prisma.productGroup.create({
  //     data: {
  //       inflowProdGroupId: generatedGroupGuid,
  //       name: input.name,
  //       isActive: input.isActive,
  //       // Establishing relational connection map to Category
  //       category: {
  //         connect: {
  //           inflowCategoryId: input.categoryId,
  //         },
  //       },
  //     },
  //     include: {
  //       category: true, // Verification tracking confirm payload
  //     },
  //   });
  // }

  // async createVariant(input: CreateProductInput) {
  //   const generatedProductId = crypto.randomUUID();
  //   const generatedVariantId = crypto.randomUUID();

  //   return await prisma.product.create({
  //     data: {
  //       inflowProductId: generatedProductId,
  //       name: input.name,
  //       sku: input.sku,
  //       description: input.description,
  //       brandId: input.brandId || null,
  //       weight: input.weight,
  //       width: input.width,
  //       height: input.height,
  //       length: input.length,
  //       isActive: input.isActive,
  //       trackExpiry: input.trackExpiry,
  //       trackLots: input.trackLots,
  //       trackSerials: input.trackSerials,
        
  //       // Nested write creates the linked ProductVariant row instantly
  //       variant: {
  //         create: {
  //           inflowVariantId: generatedVariantId,
  //           defaultPrice: input.defaultPrice,
  //           // Binds variant directly to the existing Product Group's alternative natural unique key
  //           group: {
  //             connect: {
  //               inflowProdGroupId: input.productGroupId,
  //             },
  //           },
  //         },
  //       },
  //     },
  //     // Returns nested variant layout info back to client service if desired
  //     include: {
  //       variant: true,
  //     },
  //   });
  // }

  // async findMany() {
  //   return prisma.product.findMany({
  //     include: {
  //       brand: true,
  //       images: true,
  //     },
  //   });
  // }

  // async findById(
  //   inflowProductId: string
  // ) {
  //   return prisma.product.findUnique({
  //     where: {
  //       inflowProductId,
  //     },

  //     include: {
  //       brand: true,
  //       images: true,
  //       variant: true,
  //     },
  //   });
  // }
}

export const adminProductService =
  new AdminProductService();


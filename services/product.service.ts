import { prisma } from "@/lib/prisma";

export class AdminProductService {
  async getProducts() {
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
}

export const adminProductService =
  new AdminProductService();
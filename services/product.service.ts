import { prisma } from "@/lib/prisma";

export class ProductService {
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export const productService =
  new ProductService();
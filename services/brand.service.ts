'use server only';

import {prisma} from "@/lib/prisma";


export class BrandService {
  /**
   * Create a new brand
   */
  static async createBrand(data: {
      name: string; 
      description?: string;
      logoUrl?: string; 
      websiteUrl?: string 
    }) {
    return await prisma.brand.create({
      data,
    });
  }

  static async getBasicBrands() {
    return prisma.brand.findMany({
      select: { id: true, name: true},
      orderBy: {
        name: "asc",
      },
    });
  }

  static async getBasicBrand(
    id: string
  ) {
    return prisma.brand.findUnique({
      where: {
        id,
      },
      select: { 
        id: true,
        name: true, 
        description: true, 
        websiteUrl: true,
        logoUrl: true
      },
    });
  }

  static async nameConflictCheck(
    name: string,
    id: string | null
  ) {
    return prisma.brand.findFirst({
      where: {
        name,
        ...(id && {
          NOT: {
            id,
          },
        }),
      },
    });
  }

  /**
   * Get all brands with optional product count
   */
  static async getBrands() {
    return prisma.brand.findMany({
      where: { deletedAt: null }, // Safeguard against soft-deleted flags if utilized
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
        _count: {
          select: {
            products: true, // Count of individual product items/skus
            groups: true,   // Count of parent product variations groupings
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get a single brand by ID with its products
   */
  static async getBrandById(id: string) {
    return await prisma.brand.findUnique({
      where: { id },
      include: {
        products: true
      }
    });
  }

  /**
   * Update brand details
   */
  static async updateBrand(id: string, data: {
      name: string; 
      description?: string;
      logoUrl?: string; 
      websiteUrl?: string 
    }) {
    return await prisma.brand.update({
      where: { id },
      data,
    });
  }
  // static async updateBrand(id: string, data: Partial<Omit<Brand, 'id'>>) {
  //   return await prisma.brand.update({
  //     where: { id },
  //     data,
  //   });
  // }

  /**
   * Delete a brand
   * @throws Error if brand has associated products
   */
  static async deleteBrand(id: string) {
    // 1. Check if products are still linked
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true, groups: true } } }
    });

    if (brand?._count.groups && brand._count.groups > 0) {
      throw new Error(`Cannot delete brand "${brand.name}" because it is linked to ${brand._count.groups} product groups.`);
    }

    if (brand?._count.products && brand._count.products > 0) {
      throw new Error(`Cannot delete brand "${brand.name}" because it is linked to ${brand._count.products} products.`);
    }

    return await prisma.brand.delete({
      where: { id },
    });
  }

  static async softDelete(id: string) {
    return await prisma.brand.update({
      where: { id },
      data: {
        deletedAt: new Date()
      },
    });
  }

  /**
   * Search brands by name
   */
  static async searchBrands(query: string) {
    return await prisma.brand.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      }
    });
  }
};
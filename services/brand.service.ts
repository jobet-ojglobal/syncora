'use server only';

import { Brand } from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";

export const BrandService = {
  /**
   * Create a new brand
   */
  async createBrand(data: { name: string; logoUrl?: string; websiteUrl?: string }) {
    return await prisma.brand.create({
      data,
    });
  },

  async getBasicBrands() {
    return prisma.brand.findMany({
      select: { id: true, name: true},
      orderBy: {
        name: "asc",
      },
    });
  },

  /**
   * Get all brands with optional product count
   */
  async getAllBrands() {
    return await prisma.brand.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  },

  /**
   * Get a single brand by ID with its products
   */
  async getBrandById(id: string) {
    return await prisma.brand.findUnique({
      where: { id },
      include: {
        products: true
      }
    });
  },

  /**
   * Update brand details
   */
  async updateBrand(id: string, data: Partial<Omit<Brand, 'id'>>) {
    return await prisma.brand.update({
      where: { id },
      data,
    });
  },

  /**
   * Delete a brand
   * @throws Error if brand has associated products
   */
  async deleteBrand(id: string) {
    // 1. Check if products are still linked
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } }
    });

    if (brand?._count.products && brand._count.products > 0) {
      throw new Error(`Cannot delete brand "${brand.name}" because it is linked to ${brand._count.products} products.`);
    }

    return await prisma.brand.delete({
      where: { id },
    });
  },

  /**
   * Search brands by name
   */
  async searchBrands(query: string) {
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
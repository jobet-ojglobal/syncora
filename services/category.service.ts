import { Prisma } from "@/generated/prisma/client";
import { genUniqueSlug } from "@/helpers/genUniqueSlug";
import {prisma} from "@/lib/prisma";

export class CategoryService {

  static async getBasicCategories() {
    return prisma.category.findMany({
      select: { id: true, inflowId: true, name: true},
      orderBy: {
        name: "asc",
      },
    });
  }

  static async getBasicInflowCategories() {
    return prisma.category.findMany({
      select: { inflowId: true, name: true},
      orderBy: {
        name: "asc",
      },
    });
  }

  static async getBasicCategory(
    id: string
  ) {
    return prisma.category.findUnique({
      where: {
        id,
      },
      select: { 
        id: true,
        inflowId: true, 
        parentId: true, 
        name: true, 
        description: true, 
        imageUrl: true 
      },
    });
  }

  static async nameConflictCheck(
    name: string,
    id: string | null
  ) {
    return prisma.category.findFirst({
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

  // =====================================================
  // GET ALL CATEGORIES
  // =====================================================

  static async getCategories() {
    return prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        inflowId: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        parentId: true,
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  // =====================================================
  // GET CATEGORY BY ID
  // =====================================================

  static async getCategoryById(
    id: string
  ) {
    return prisma.category.findUnique({
      where: {
        id,
      },
      include: {
        parent: true,
        children: true,
        productGroups: {
          include: {
            brand: true,
          },
          take: 10,
        },
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });
  }

  /**
   * Create a category with automated slug generation
   */
  static async createCategory(data: {
    name: string;
    parentId?: string | null;
    description?: string | null;
    imageUrl?: string;
  }) {
    const slug = await genUniqueSlug(data.name, prisma.category);
    const computedInflowId = crypto.randomUUID().toString();

    console.log(computedInflowId, slug)

    return await prisma.category.create({
      data: {
        inflowId: computedInflowId,
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        parentId: data.parentId || null, // Resolves structural reference key paths safely
      },
    });
  }

  /**
   * Create a category with automated slug generation
   */
  static async updateCategory(data: {
    id: string;
    name: string;
    parentId?: string | null;
    description?: string | null;
    imageUrl?: string;
  }) {
    const slug = await genUniqueSlug(data.name, prisma.category, data.id);

    return await prisma.category.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        parentId: data.parentId || null, // Resolves structural reference key paths safely
      },
    });
  }
 
  /**
   * Delete a category
   * Note: You may want to handle children categories or products before deleting
   */
  static async deleteCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productGroups: true,
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    const blockers: string[] = [];

    if (category._count.productGroups > 0) {
      blockers.push(`${category._count.productGroups} product groups`);
    }

    if (category._count.products > 0) {
      blockers.push(`${category._count.products} products`);
    }

    if (blockers.length > 0) {
      throw new Error(
        `Cannot delete category "${category.name}" because it is linked to ${blockers.join(" and ")}.`
      );
    }

    // return prisma.category.update({
    //   where: { id },
    //   data: {
    //     deletedAt: new Date(),
    //   },
    // });

    return prisma.category.delete({
      where: { id },
    });
  }
  // static async deleteCategory(id: string) {
  //   const category = await prisma.category.findUnique({
  //     where: { id },
  //     include: { _count: { select: { productGroups: true, products: true } } }
  //   });

  //   if (category?._count.productGroups && category._count.productGroups > 0) {
  //     throw new Error(`Cannot delete category "${category.name}" because it is linked to ${category._count.productGroups} product groups.`);
  //   }

  //    return await prisma.category.delete({
  //     where: { id },
  //   });
  // }


  /**
   * Helper: Generate a URL-friendly slug
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-") // Turn spaces/special chars to hyphens
      .replace(/(^-|-$)/g, "");    // Clear trailing dashes
  }

  /**
   * Fetch Category Tree (Nested hierarchy)
   * Useful for navigation menus or nested selection
   */
  static async getCategoryTree() {
    const allCategories = await prisma.category.findMany({
      include: {
        _count: { select: { productGroups: true } }
      }
    });

    // Build a recursive tree structure
    const buildTree = (parentId: string | null = null): any[] => {
      return allCategories
        .filter(cat => cat.parentId === parentId)
        .map(cat => ({
          ...cat,
          children: buildTree(cat.id)
        }));
    };

    return buildTree(null);
  }
}
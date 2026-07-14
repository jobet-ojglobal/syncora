// lib/softDeleteRepository.ts
import { prisma } from './prisma';

/*
    // Instead of: await prisma.user.findMany()
    await SoftDeleteRepository.findMany('user'); // Auto-excludes deleted

    // Get deleted records too:
    await SoftDeleteRepository.findMany('user', { includeDeleted: true });

    // Soft delete:
    await SoftDeleteRepository.softDelete('user', userId);

    // Restore:
    await SoftDeleteRepository.restore('user', userId);

    // With filters (still excludes deleted by default):
    await SoftDeleteRepository.findMany('user', {
    where: { email: 'test@example.com' },
    include: { posts: true },
    });
*/

export type ModelName = 
    'user' | 'attribute' | 'category' | 'currency' | 'taxingScheme' | 'pricingScheme' | 'paymentTerm' | 'product' 
    | 'brand' | 'customer' | 'vendor' | 'productGroup' | 'location' | 'uom' | "teamMember" ; 

export class SoftDeleteRepository {
  static async softDelete<T = any>(
    model: ModelName,
    id: string | number,
    extraFields?: Record<string, any>
  ): Promise<T> {
    return (prisma as any)[model].update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isDefault: false,
        isActive: false,
        ...extraFields,
      },
    }).catch((err: any) => {
      if (err.code === 'P2025') throw err;
      return (prisma as any)[model].update({
        where: { id },
        data: { deletedAt: new Date(), ...extraFields },
      });
    }) as Promise<T>;
  }

  static async restore<T = any>(
    model: ModelName,
    id: string | number
  ): Promise<T> {
    return (prisma as any)[model].update({
      where: { id },
      data: { deletedAt: null, isActive: true, },
    }) as Promise<T>;
  }

  static async findMany<T = any>(
    model: ModelName,
    args?: any & { includeDeleted?: boolean }
  ): Promise<T[]> {
    const { includeDeleted = false, ...queryArgs } = args || {};
    
    if (includeDeleted) {
      return (prisma as any)[model].findMany(queryArgs) as Promise<T[]>;
    }

    const where = queryArgs.where || {};
    return (prisma as any)[model].findMany({
      ...queryArgs,
      where: {
        ...where,
        deletedAt: null,
      },
    }) as Promise<T[]>;
  }

  static async findFirst<T = any>(
    model: ModelName,
    args?: any & { includeDeleted?: boolean }
  ): Promise<T | null> {
    const { includeDeleted = false, ...queryArgs } = args || {};
    
    if (includeDeleted) {
      return (prisma as any)[model].findFirst(queryArgs) as Promise<T | null>;
    }

    const where = queryArgs.where || {};
    return (prisma as any)[model].findFirst({
      ...queryArgs,
      where: {
        ...where,
        deletedAt: null,
      },
    }) as Promise<T | null>;
  }

  static async findUnique<T = any>(
    model: ModelName,
    args: any & { includeDeleted?: boolean }
  ): Promise<T | null> {
    const { includeDeleted = false, ...queryArgs } = args;
    
    if (includeDeleted) {
      return (prisma as any)[model].findUnique(queryArgs) as Promise<T | null>;
    }

    const where = queryArgs.where || {};
    return (prisma as any)[model].findUnique({
      ...queryArgs,
      where: {
        ...where,
        deletedAt: null,
      },
    }) as Promise<T | null>;
  }

  static async count(
    model: ModelName,
    args?: any & { includeDeleted?: boolean }
  ): Promise<number> {
    const { includeDeleted = false, ...queryArgs } = args || {};
    
    if (includeDeleted) {
      return (prisma as any)[model].count(queryArgs) as Promise<number>;
    }

    const where = queryArgs.where || {};
    return (prisma as any)[model].count({
      ...queryArgs,
      where: {
        ...where,
        deletedAt: null,
      },
    }) as Promise<number>;
  }

  static async permanentDelete<T = any>(
    model: string,
    id: string | number
  ): Promise<T> {
    return (prisma as any)[model].delete({
        where: { id },
    }) as Promise<T>;
  }
}



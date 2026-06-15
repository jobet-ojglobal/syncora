'use server only';

import { prisma } from "@/lib/prisma";

export class LocationService {
  static async softDelete(id: string) {
     return await prisma.location.update({
        where: { id },
        data: {
          deletedAt: new Date()
      },
    });
  }

  static async getBasicLocations(id: string) {
    return prisma.location.findUnique({
      where: {
        id,
      },
      include: {
        address: true,
        sublocations: {
           select: {
              id: true,
              name: true,
            },
            orderBy: { name: "asc" }
        }
      }
    });
  }
}
'use server only';

import { prisma } from "@/lib/prisma";


export class AttributeService {

  static async getBasicAttribute(
    id: string
  ) {
    return prisma.attribute.findUnique({
      where: {
        id,
      },
      include: {
        values: true
      }
    });
  }


}
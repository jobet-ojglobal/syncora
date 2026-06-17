'use server only';

import { prisma } from "@/lib/prisma";


export class TagService {

  static async getBasicTag(
    id: string
  ) {
    return prisma.tag.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true
      }
    });
  }

  static async delete(id: string) {
     return await prisma.tag.delete({
        where: { id }
    });
  }


}
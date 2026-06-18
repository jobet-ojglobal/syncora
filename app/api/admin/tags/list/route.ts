import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Collect taxonomy options combined with direct dynamic sub-query product counters
    const tagsWithRelations = await prisma.tag.findMany({
      orderBy: {
        name: "asc"
      },
      include: {
        _count: {
          select: {
            products: true // Pull count directly from ProductTag dynamic map relations
          }
        }
      }
    });

    return NextResponse.json(tagsWithRelations, { status: 200 });
  } catch (error) {
    console.error("Critical error building administrative taxonomy index mappings:", error);
    return NextResponse.json(
      { error: "Database internal collection matrix parsing sequence failed." }, 
      { status: 500 }
    );
  }
}
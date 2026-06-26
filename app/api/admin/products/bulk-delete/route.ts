import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    // Guard Clause validation checklist entries
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload parameters. A valid array of ID string items is required." },
        { status: 400 }
      );
    }

    // 🟢 Perform atomic batch soft-delete updates across the targeted ID parameters
    // const batchSummary = await prisma.product.updateMany({
    //   where: {
    //     id: {
    //       in: ids,
    //     },
    //     deletedAt: null, // Only touch items that haven't already been flagged
    //   },
    //   data: {
    //     deletedAt: new Date(),
    //     isActive: false, // Ensure they are deactivated immediately inside the dashboard view models
    //   },
    // })

    const batchSummary = await prisma.product.deleteMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null, // Only touch items that haven't already been flagged
      },
    })

    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully processed soft-delete execution across batch targets.`,
        count: batchSummary.count 
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error("Critical bulk batch soft-delete transaction process failure:", error)
    return NextResponse.json(
      { 
        error: "Internal product management pipeline database batch update execution failure.", 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
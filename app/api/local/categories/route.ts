import { getCategories } from "@/lib/locations/data/category";
import { NextResponse } from "next/server";

export async function GET() {
  try {

    const data = await getCategories("http://100.85.147.26:8000");
    return NextResponse.json({
      success: true,
      message: "Connected to inFlow Local",
      total: data.length,
      data,
    });
 
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}



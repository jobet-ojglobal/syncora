import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarUrl } = body;

    if (avatarUrl && !avatarUrl.startsWith("http")) {
      return NextResponse.json(
        { error: "Invalid URL string format" }, 
        { status: 400 }
      );
    }

    // --- Database operation goes here ---
    // Example: 
    // await prisma.user.update({ where: { id: session.user.id }, data: { image: avatarUrl } })
    
    // Artificial latency delay mock
    await new Promise((resolve) => setTimeout(resolve, 800));

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Database Processing Failed" }, 
      { status: 500 }
    );
  }
}
import { TagService } from "@/services/tag.service";
import {
  NextRequest,
  NextResponse,
} from "next/server";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// =====================================================
// DELETE TAG
// =====================================================

export async function DELETE(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;
    const tag = await TagService.delete(id);

    if (!tag) {
      return NextResponse.json({ error: "Tag not found." }, { status: 400 });
    }

    return NextResponse.json(tag, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}
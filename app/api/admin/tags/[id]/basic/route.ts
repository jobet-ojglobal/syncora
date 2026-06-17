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
// GET TAG
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } =
      await params;

    const tag =
      await TagService.getBasicTag(
        id
      );

    if (!tag) {
      return NextResponse.json({ error: "Tag not found." }, { status: 400 });
    }

    return NextResponse.json(
      tag
    , { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch tag" }, { status: 500 });
  }
}
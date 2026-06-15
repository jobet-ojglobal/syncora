import { AttributeService } from "@/services/attribute.service";
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
// GET ATTRIBUTE
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } =
      await params;

    const attribute =
      await AttributeService.getBasicAttribute(
        id
      );

    if (!attribute) {
      return NextResponse.json({ error: "Attribute not found." }, { status: 400 });
    }

    return NextResponse.json(
      attribute
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch attribute" }, { status: 500 });
  }
}
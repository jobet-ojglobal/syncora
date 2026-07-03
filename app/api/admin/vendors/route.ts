import { NextRequest, NextResponse } from "next/server";
import { vendorFormSchema } from "@/schemas/vendor.schema";
import { VendorService } from "@/services/vendor.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = vendorFormSchema.parse(body);

    const vendor = await VendorService.create(validatedData);
    return NextResponse.json(vendor, { status: 201 });
  } catch (error: any) {
    console.error("[VENDOR_POST_ERROR]:", error);
    
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid form schema variables.", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process vendor creation pipeline." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing Target Vendor Identifier." }, { status: 400 });
    }

    const validatedData = vendorFormSchema.parse(body);
    const updatedVendor = await VendorService.update(id, validatedData);

    return NextResponse.json(updatedVendor, { status: 200 });
  } catch (error: any) {
    console.error("[VENDOR_PATCH_ERROR]:", error);

    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid validation schema configurations.", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to modify vendor sequence configuration." }, { status: 500 });
  }
}
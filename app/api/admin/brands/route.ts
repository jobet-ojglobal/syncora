// app/api/brands/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BrandService } from "@/services/brand.service";

// ======================================================
// GET ALL BRANDS
// ======================================================

export async function GET() {
  try {
    const brands = await BrandService.getBrands();

    const formattedBrands = brands.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      logoUrl: b.logoUrl,
      websiteUrl: b.websiteUrl,
      productsCount: b._count.products,
      groupsCount: b._count.groups,
    }));

    return NextResponse.json(formattedBrands, { status: 200 });
  } catch (error) {
    console.error("Failed to query systems brands array:", error);
    return NextResponse.json({ error: "Internal Database processing error." }, { status: 500 });
  }
}
/**
 * 🟢 CREATE NEW BRAND PROFILE
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, logoUrl, websiteUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Brand identifier name is required." }, { status: 400 });
    }

    // Explicit unique verification pre-flight test check
    const existing = await BrandService.nameConflictCheck(name, null);
    if (existing) {
      return NextResponse.json({ error: `A brand catalog profile titled "${name.trim()}" already exists.` }, { status: 409 });
    }
    
    const brand =
          await BrandService.createBrand({
            name, description, logoUrl, websiteUrl
          });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("Brand creation error runtime failure:", error);
    return NextResponse.json({ error: "Internal Database insertion engine breakdown error." }, { status: 500 });
  }
}


/**
 * 🟡 MODIFY EXISTING BRAND PROFILE
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, logoUrl, websiteUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "Target structural database ID pointer is missing." }, { status: 400 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: "Brand reference naming label is mandatory." }, { status: 400 });
    }

    // Verify name availability if mutating to an alternative identity string signature block
    const conflictCheck = await BrandService.nameConflictCheck(name, id);
    if (conflictCheck) {
      return NextResponse.json({ error: `Naming label "${name.trim()}" is already claimed by another active profile.` }, { status: 409 });
    }

    const updatedBrand = await BrandService.updateBrand(id, {
      name, description, logoUrl, websiteUrl
    });

    return NextResponse.json(updatedBrand, { status: 200 });
  } catch (error) {
    console.error("Brand update modification layer failure:", error);
    return NextResponse.json({ error: "Internal Database record transaction update operation failure." }, { status: 500 });
  }
}
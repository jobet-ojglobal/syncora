
export const dynamic = "force-dynamic";

export async function getBrands() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/brands/basic`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading brands data:", error);
    return null;
  }
}

export async function getCategories() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/categories/basic`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading categories data:", error);
    return null;
  }
}

export async function getAttributes() {
  try {
     const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/attributes/basic`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading attributes data:", error);
    return null;
  }
}
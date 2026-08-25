import { put } from "@vercel/blob";

export async function storeBlobImage(
  productId: string,
  rawName: string,
  base64Data: string
): Promise<string | null> {
  try {
    // 1. Extract image type extension and raw base64 data
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const rawExt = matches[1].toLowerCase();
    const fileExt = rawExt === "jpeg" ? "jpg" : rawExt;
    const base64String = matches[2];

    // 2. Convert base64 data to Buffer
    const buffer = Buffer.from(base64String, "base64");

    // 3. Trim productId to get only the first segment before the hyphen
    const shortId = productId.split("-")[0];

    // 4. Format safe filename and blob path
    const safeName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    const blobPath = `products/[${shortId}]-${safeName}.${fileExt}`;

    // 5. Upload to Vercel Blob Storage
    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: `image/${rawExt}`,
      addRandomSuffix: false,
    });

    return blob.url;
  } catch (error) {
    console.error(`Failed to save product image for product ID ${productId}:`, error);
    return null;
  }
}
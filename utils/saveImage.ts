import { mkdir } from "fs";
import fs from "fs/promises";
import { access, writeFile } from "fs/promises";
import path from "path";

/**
 * Ensures public/product/images directory exists and saves the base64 image file
 */
export async function saveProductImage(
  productId: string,
  productName: string,
  base64Data: string
): Promise<string | null> {
  try {
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const fileExt = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");

    // 1. Define target path
    const targetDir = path.join(process.cwd(), "public", "images", "products");

    // 2. Check & Create folder if it doesn't exist
    await fs.mkdir(targetDir, { recursive: true });

    // 3. Format filename & write file
    const safeName = productName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const fileName = `[${productId}]-${safeName}.${fileExt}`;
    const filePath = path.join(targetDir, fileName);

    await fs.writeFile(filePath, buffer);

    return `/images/products/${fileName}`;
  } catch (error) {
    console.error(`Failed to save product image for ${productId}:`, error);
    return null;
  }
}

export async function saveCheckProductImage(
  productId: string,
  rawName: string,
  base64Data: string
): Promise<string | null> {
  try {
    // 1. Extract image type extension and raw base64 data
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const siteUrl = process.env.SITE_URL || "";

    const rawExt = matches[1].toLowerCase();
    const fileExt = rawExt === "jpeg" ? "jpg" : rawExt;
    const base64String = matches[2];

    // 2. Ensure target directory exists
    const targetDir = path.join(process.cwd(), "public", "images", "products");
    await fs.mkdir(targetDir, { recursive: true });

    // 3. Format safe filename
    const safeName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    const fileName = `${safeName}.${fileExt}`;

    const relativePath = `/images/products/${fileName}`;
    const absolutePath = path.join(targetDir, fileName);

    // 4. Check if file already exists
    try {
      await access(absolutePath);
      console.log(`[Cache Hit] Image already exists at ${relativePath}`);
      return `${siteUrl}${relativePath}`; // Early return on cache hit
    } catch {
      // File does not exist -> proceed to create/write
    }

    // 5. Write buffer to disk
    const buffer = Buffer.from(base64String, "base64");
    await writeFile(absolutePath, buffer);

    return `${siteUrl}${relativePath}`;
  } catch (error) {
    console.error(`Failed to save product image for product ID ${productId}:`, error);
    return null;
  }
}
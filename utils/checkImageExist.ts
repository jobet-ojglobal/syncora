import { access } from "fs/promises";
import path from "path";

export async function checkIfImageExists(productId: string, safeName: string, fileExt: string): Promise<boolean> {
  const fileName = `[${productId}]-${safeName}.${fileExt}`;
  const filePath = path.join(process.cwd(), "public", "images", "products", fileName);

  try {
    await access(filePath);
    return true; // File exists
  } catch {
    return false; // File does not exist
  }
}
import cloudinary from "@/lib/cloudinary";

export async function storeImageToCloudinary(
  productId: string,
  rawName: string,
  base64Data: string
): Promise<string | null> {
  try {
    // 1. Validate Base64 image format
    if (!/^data:image\/[a-zA-Z0-9]+;base64,/.test(base64Data)) {
      return null;
    }

    // 2. Format safe public_id (filename in Cloudinary)
    const safeName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    const publicId = `[${productId}]-${safeName}`;

    // 3. Upload directly to Cloudinary
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: "products", // Saves inside 'products' folder in Cloudinary
      public_id: publicId,
      overwrite: true, // Overwrites if an image with the same public_id exists
      resource_type: "image",
    });

    // 4. Return the secure HTTPS URL
    return result.secure_url;
  } catch (error) {
    console.error(`Failed to save product image to Cloudinary for product ID ${productId}:`, error);
    return null;
  }
}
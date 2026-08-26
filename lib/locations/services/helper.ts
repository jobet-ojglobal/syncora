import { Prisma } from "@/generated/prisma/client";
import { InflowProduct } from "@/lib/inflow/types";
import { storeImageToCloudinary } from "@/utils/cloudinaryStoreImage";
import { saveCheckProductImage } from "@/utils/saveImage";

type Tx = Prisma.TransactionClient;

export async function patchProductCategory(
  tx: Tx,
  inflowId: string,
  categoryId: string
) {
  return await tx.product.update({
    where: { inflowId },
    data: { categoryId },
    select: { inflowId: true, isLocalSynced: true },
  });
}

export async function patchProductVendor(
  tx: Tx,
  inflowId: string,
  lastVendorId: string
) {
  return await tx.product.update({
    where: { inflowId },
    data: { lastVendorId },
    select: { inflowId: true, isLocalSynced: true },
  });
}

// export async function syncProductImageOnlyToCloud(
//   tx: Tx,
//   product: {
//     productId: string;
//     image: string;
//   }
// ) {
//   let imageUrl: string | null = null;

//   // 1. Upload base64 image to Cloudinary if available
//   if (product.image && product.image.startsWith("data:image")) {
//     imageUrl = await storeImageToCloudinary(
//       product.productId,
//       product.name || "unnamed",
//       product.image
//     );
//   } else if (product.images?.[0]?.originalUrl) {
//     imageUrl = product.images[0].originalUrl;
//   }

//   // 2. Direct database image table update/sync
//   if (imageUrl) {
//     const preparedProduct: InflowProduct = {
//       ...product,
//       images: [
//         {
//           imageId: crypto.randomUUID().toLowerCase(),
//           originalUrl: imageUrl,
//           largeUrl: null,
//           mediumUncroppedUrl: null,
//           mediumUrl: null,
//           smallUrl: null,
//           thumbUrl: null,
//         },
//       ],
//     };

//     // Reuses your existing image relation sync function
//     await syncImages(tx, preparedProduct);
//   }
// }

type PartialProductType = {
  productId: string;
  name: string;
  images: InflowProductImage[]
}

export interface InflowProductImage {
  imageId: string;
  largeUrl: string | null;
  mediumUncroppedUrl: string | null;
  mediumUrl: string | null;
  originalUrl: string | null;
  smallUrl: string | null;
  thumbUrl: string | null;
}

export async function syncProductImageOnlyToLocal(
  tx: Tx,
  image: string,
  product: PartialProductType
) {
  let imageUrl: string | null = null;

  // 1. Upload base64 image to Cloudinary if available
  if (image && image.startsWith("data:image")) {
    imageUrl = await saveCheckProductImage(
      product.productId,
      product.name || "unnamed",
      image
    );
  } 

  // 2. Direct database image table update/sync
  if (imageUrl) {
    const preparedProduct: PartialProductType = {
      ...product,
      images: [
        {
          imageId: crypto.randomUUID().toLowerCase(),
          originalUrl: imageUrl,
          largeUrl: null,
          mediumUncroppedUrl: null,
          mediumUrl: null,
          smallUrl: null,
          thumbUrl: null,
        },
      ],
    };

    // Reuses your existing image relation sync function
    await syncImages(tx, preparedProduct);
  }
}


export async function syncImages(
  tx: Tx,
  product: PartialProductType
) {
  // 1. Wipe old images assigned to this group to drop any removed images
  await tx.productImage.deleteMany({
    where: { productId: product.productId },
  });

  // 2. Perform a bulk save if new images exist
  if (product.images && product.images.length > 0) {
    await tx.productImage.createMany({
      data: product.images.map((image, index) => {
        return {
          inflowId: image.imageId,
          groupId: null,
          productId: product.productId, 
          position: index,
          largeUrl: image.largeUrl || image.originalUrl || null,
          mediumUncroppedUrl: image.mediumUncroppedUrl || image.originalUrl || null,
          mediumUrl: image.mediumUrl || image.originalUrl || null,
          originalUrl: image.originalUrl || null,
          smallUrl: image.smallUrl || image.originalUrl || null,
          thumbUrl: image.thumbUrl || image.originalUrl || null,
        };
      }),
      skipDuplicates: true,
    });
  }
}


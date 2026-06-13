/*
  Warnings:

  - You are about to drop the column `inflowCategoryId` on the `category` table. All the data in the column will be lost.
  - You are about to drop the column `isDefault` on the `category` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `category` table. All the data in the column will be lost.
  - You are about to drop the column `inflowProductId` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `inflowProductBarcodeId` on the `product_barcode` table. All the data in the column will be lost.
  - You are about to drop the column `inflowProdGroupId` on the `product_group` table. All the data in the column will be lost.
  - You are about to drop the column `inflowImageId` on the `product_image` table. All the data in the column will be lost.
  - You are about to drop the column `inflowVariantId` on the `product_variant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[inflowId]` on the table `category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inflowId]` on the table `product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inflowId]` on the table `product_barcode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inflowId]` on the table `product_group` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inflowId]` on the table `product_image` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inflowId]` on the table `product_variant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `inflowId` to the `category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inflowId` to the `product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inflowId` to the `product_barcode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inflowId` to the `product_group` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inflowId` to the `product_image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inflowId` to the `product_variant` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "category" DROP CONSTRAINT "category_parentId_fkey";

-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_productId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_bin" DROP CONSTRAINT "inventory_bin_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_barcode" DROP CONSTRAINT "product_barcode_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_feature" DROP CONSTRAINT "product_feature_groupId_fkey";

-- DropForeignKey
ALTER TABLE "product_feature" DROP CONSTRAINT "product_feature_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_group" DROP CONSTRAINT "product_group_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "product_group_option" DROP CONSTRAINT "product_group_option_productGroupId_fkey";

-- DropForeignKey
ALTER TABLE "product_image" DROP CONSTRAINT "product_image_groupId_fkey";

-- DropForeignKey
ALTER TABLE "product_image" DROP CONSTRAINT "product_image_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_sales_uom" DROP CONSTRAINT "product_sales_uom_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_tag" DROP CONSTRAINT "product_tag_groupId_fkey";

-- DropForeignKey
ALTER TABLE "product_tag" DROP CONSTRAINT "product_tag_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_uom" DROP CONSTRAINT "product_uom_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_variant" DROP CONSTRAINT "product_variant_productGroupId_fkey";

-- DropForeignKey
ALTER TABLE "product_variant" DROP CONSTRAINT "product_variant_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_variant_selection" DROP CONSTRAINT "product_variant_selection_variantId_fkey";

-- DropIndex
DROP INDEX "category_inflowCategoryId_key";

-- DropIndex
DROP INDEX "product_inflowProductId_key";

-- DropIndex
DROP INDEX "product_barcode_inflowProductBarcodeId_key";

-- DropIndex
DROP INDEX "product_group_inflowProdGroupId_key";

-- DropIndex
DROP INDEX "product_image_inflowImageId_key";

-- DropIndex
DROP INDEX "product_variant_inflowVariantId_key";

-- AlterTable
ALTER TABLE "brand" ADD COLUMN     "description" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "category" DROP COLUMN "inflowCategoryId",
DROP COLUMN "isDefault",
DROP COLUMN "timestamp",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "inflowId" TEXT NOT NULL,
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product" DROP COLUMN "inflowProductId",
ADD COLUMN     "inflowId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product_barcode" DROP COLUMN "inflowProductBarcodeId",
ADD COLUMN     "inflowId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product_group" DROP COLUMN "inflowProdGroupId",
ADD COLUMN     "inflowId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product_image" DROP COLUMN "inflowImageId",
ADD COLUMN     "inflowId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product_variant" DROP COLUMN "inflowVariantId",
ADD COLUMN     "inflowId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "category_inflowId_key" ON "category"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_inflowId_key" ON "product"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_inflowId_key" ON "product_barcode"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_inflowId_key" ON "product_group"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_image_inflowId_key" ON "product_image"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_inflowId_key" ON "product_variant"("inflowId");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group" ADD CONSTRAINT "product_group_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_group"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcode" ADD CONSTRAINT "product_barcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_uom" ADD CONSTRAINT "product_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales_uom" ADD CONSTRAINT "product_sales_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_group"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option" ADD CONSTRAINT "product_group_option_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_group"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_selection" ADD CONSTRAINT "product_variant_selection_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_feature" ADD CONSTRAINT "product_feature_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_group"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_feature" ADD CONSTRAINT "product_feature_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_group"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_bin" ADD CONSTRAINT "inventory_bin_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

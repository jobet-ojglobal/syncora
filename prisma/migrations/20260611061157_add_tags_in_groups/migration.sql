/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `product_group` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `product_group` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product_feature" ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "product_group" ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product_tag" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_slug_key" ON "product_group"("slug");

-- AddForeignKey
ALTER TABLE "product_group" ADD CONSTRAINT "product_group_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_feature" ADD CONSTRAINT "product_feature_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_group"("inflowProdGroupId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_group"("inflowProdGroupId") ON DELETE SET NULL ON UPDATE CASCADE;

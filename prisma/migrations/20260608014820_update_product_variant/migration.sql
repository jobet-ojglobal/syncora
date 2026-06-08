/*
  Warnings:

  - A unique constraint covering the columns `[productId]` on the table `product_variant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "product_variant_productId_key" ON "product_variant"("productId");

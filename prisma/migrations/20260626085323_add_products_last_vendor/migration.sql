/*
  Warnings:

  - You are about to drop the column `sku` on the `product_variant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product_variant" DROP COLUMN "sku";

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_lastVendorId_fkey" FOREIGN KEY ("lastVendorId") REFERENCES "vendor"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

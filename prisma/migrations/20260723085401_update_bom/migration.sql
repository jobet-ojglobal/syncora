/*
  Warnings:

  - You are about to drop the `product_bom` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_bom" DROP CONSTRAINT "product_bom_childProductId_fkey";

-- DropForeignKey
ALTER TABLE "product_bom" DROP CONSTRAINT "product_bom_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_bom_location_map" DROP CONSTRAINT "product_bom_location_map_productBomId_fkey";

-- AlterTable
ALTER TABLE "business_partner_address" ALTER COLUMN "localId" DROP NOT NULL;

-- DropTable
DROP TABLE "product_bom";

-- CreateTable
CREATE TABLE "product_boms" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "child_product_id" TEXT NOT NULL,
    "standardQuantity" DECIMAL(12,4) NOT NULL,
    "uomQuantity" DECIMAL(12,4) NOT NULL,
    "uom" TEXT,
    "serialNumbers" TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_boms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_boms_inflowId_key" ON "product_boms"("inflowId");

-- CreateIndex
CREATE INDEX "product_boms_product_id_idx" ON "product_boms"("product_id");

-- CreateIndex
CREATE INDEX "product_boms_child_product_id_idx" ON "product_boms"("child_product_id");

-- AddForeignKey
ALTER TABLE "product_boms" ADD CONSTRAINT "product_boms_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_boms" ADD CONSTRAINT "product_boms_child_product_id_fkey" FOREIGN KEY ("child_product_id") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom_location_map" ADD CONSTRAINT "product_bom_location_map_productBomId_fkey" FOREIGN KEY ("productBomId") REFERENCES "product_boms"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

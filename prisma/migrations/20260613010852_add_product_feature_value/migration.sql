/*
  Warnings:

  - Added the required column `value` to the `product_feature` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_feature" ADD COLUMN     "value" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "product_barcode" (
    "id" TEXT NOT NULL,
    "inflowProductBarcodeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "lineNum" INTEGER NOT NULL,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_barcode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_inflowProductBarcodeId_key" ON "product_barcode"("inflowProductBarcodeId");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_barcode_key" ON "product_barcode"("barcode");

-- CreateIndex
CREATE INDEX "product_barcode_productId_idx" ON "product_barcode"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_productId_lineNum_key" ON "product_barcode"("productId", "lineNum");

-- AddForeignKey
ALTER TABLE "product_barcode" ADD CONSTRAINT "product_barcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowProductId") ON DELETE RESTRICT ON UPDATE CASCADE;

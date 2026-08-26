/*
  Warnings:

  - You are about to drop the `product_sales_uom` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_uom` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_sales_uom" DROP CONSTRAINT "product_sales_uom_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_sales_uom" DROP CONSTRAINT "product_sales_uom_uomId_fkey";

-- DropForeignKey
ALTER TABLE "product_uom" DROP CONSTRAINT "product_uom_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_uom" DROP CONSTRAINT "product_uom_uomId_fkey";

-- DropTable
DROP TABLE "product_sales_uom";

-- DropTable
DROP TABLE "product_uom";

-- CreateTable
CREATE TABLE "produc_uom" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "uomId" TEXT NOT NULL,
    "standardQuantity" DECIMAL(18,4) NOT NULL,
    "uomQuantity" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "produc_uom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_uom" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "uomId" TEXT NOT NULL,
    "standardQuantity" DECIMAL(18,4) NOT NULL,
    "uomQuantity" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "sales_uom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "produc_uom_productId_key" ON "produc_uom"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_uom_productId_key" ON "sales_uom"("productId");

-- AddForeignKey
ALTER TABLE "produc_uom" ADD CONSTRAINT "produc_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produc_uom" ADD CONSTRAINT "produc_uom_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "unit_of_measure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_uom" ADD CONSTRAINT "sales_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_uom" ADD CONSTRAINT "sales_uom_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "unit_of_measure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

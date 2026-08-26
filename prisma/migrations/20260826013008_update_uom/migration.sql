/*
  Warnings:

  - You are about to drop the `produc_uom` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "produc_uom" DROP CONSTRAINT "produc_uom_productId_fkey";

-- DropForeignKey
ALTER TABLE "produc_uom" DROP CONSTRAINT "produc_uom_uomId_fkey";

-- DropTable
DROP TABLE "produc_uom";

-- CreateTable
CREATE TABLE "purchasing_uom" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "uomId" TEXT NOT NULL,
    "standardQuantity" DECIMAL(18,4) NOT NULL,
    "uomQuantity" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "purchasing_uom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchasing_uom_productId_key" ON "purchasing_uom"("productId");

-- AddForeignKey
ALTER TABLE "purchasing_uom" ADD CONSTRAINT "purchasing_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing_uom" ADD CONSTRAINT "purchasing_uom_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "unit_of_measure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

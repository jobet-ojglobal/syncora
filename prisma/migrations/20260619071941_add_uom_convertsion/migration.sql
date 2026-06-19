/*
  Warnings:

  - You are about to drop the column `name` on the `product_sales_uom` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `product_uom` table. All the data in the column will be lost.
  - Added the required column `uomId` to the `product_sales_uom` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uomId` to the `product_uom` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UomCategory" AS ENUM ('COUNT', 'WEIGHT', 'VOLUME', 'LENGTH', 'AREA');

-- AlterTable
ALTER TABLE "product_sales_uom" DROP COLUMN "name",
ADD COLUMN     "uomId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product_uom" DROP COLUMN "name",
ADD COLUMN     "uomId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "unit_of_measure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "UomCategory" NOT NULL,
    "baseFactor" DECIMAL(18,6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_conversion" (
    "id" TEXT NOT NULL,
    "fromUomId" TEXT NOT NULL,
    "toUomId" TEXT NOT NULL,
    "factor" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "unit_conversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unit_of_measure_code_key" ON "unit_of_measure"("code");

-- CreateIndex
CREATE UNIQUE INDEX "unit_conversion_fromUomId_toUomId_key" ON "unit_conversion"("fromUomId", "toUomId");

-- AddForeignKey
ALTER TABLE "product_uom" ADD CONSTRAINT "product_uom_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales_uom" ADD CONSTRAINT "product_sales_uom_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_conversion" ADD CONSTRAINT "unit_conversion_fromUomId_fkey" FOREIGN KEY ("fromUomId") REFERENCES "unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_conversion" ADD CONSTRAINT "unit_conversion_toUomId_fkey" FOREIGN KEY ("toUomId") REFERENCES "unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

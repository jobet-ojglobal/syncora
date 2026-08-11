/*
  Warnings:

  - A unique constraint covering the columns `[inflowId]` on the table `inventory_adjustment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inflowId]` on the table `inventory_adjustment_line` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `inflowId` to the `inventory_adjustment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inflowId` to the `inventory_adjustment_line` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "inventory_adjustment_line" DROP CONSTRAINT "inventory_adjustment_line_adjustmentId_fkey";

-- AlterTable
ALTER TABLE "inventory_adjustment" ADD COLUMN     "inflowId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "inventory_adjustment_line" ADD COLUMN     "inflowId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "inventory_adjustment_inflowId_key" ON "inventory_adjustment"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_adjustment_line_inflowId_key" ON "inventory_adjustment_line"("inflowId");

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "inventory_adjustment"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `sublocationId` on the `inventory_adjustment_line` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventory_adjustment_line" DROP CONSTRAINT "inventory_adjustment_line_sublocationId_fkey";

-- DropIndex
DROP INDEX "inventory_adjustment_line_sublocationId_idx";

-- AlterTable
ALTER TABLE "inventory_adjustment_line" DROP COLUMN "sublocationId",
ADD COLUMN     "inventoryBinId" TEXT;

-- CreateIndex
CREATE INDEX "inventory_adjustment_line_inventoryBinId_idx" ON "inventory_adjustment_line"("inventoryBinId");

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_inventoryBinId_fkey" FOREIGN KEY ("inventoryBinId") REFERENCES "inventory_bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

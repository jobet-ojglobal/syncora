/*
  Warnings:

  - You are about to drop the `InventoryAdjustmentLineBin` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InventoryAdjustmentLineBin" DROP CONSTRAINT "InventoryAdjustmentLineBin_adjustmentLineId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryAdjustmentLineBin" DROP CONSTRAINT "InventoryAdjustmentLineBin_sublocationId_fkey";

-- DropTable
DROP TABLE "InventoryAdjustmentLineBin";

-- CreateTable
CREATE TABLE "inventory_adjustment_line_bin" (
    "id" TEXT NOT NULL,
    "adjustmentLineId" TEXT NOT NULL,
    "sublocationId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "inventory_adjustment_line_bin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_adjustment_line_bin_adjustmentLineId_idx" ON "inventory_adjustment_line_bin"("adjustmentLineId");

-- CreateIndex
CREATE INDEX "inventory_adjustment_line_bin_sublocationId_idx" ON "inventory_adjustment_line_bin"("sublocationId");

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line_bin" ADD CONSTRAINT "inventory_adjustment_line_bin_adjustmentLineId_fkey" FOREIGN KEY ("adjustmentLineId") REFERENCES "inventory_adjustment_line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line_bin" ADD CONSTRAINT "inventory_adjustment_line_bin_sublocationId_fkey" FOREIGN KEY ("sublocationId") REFERENCES "sublocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "inventory_adjustment_line" ADD COLUMN     "inventoryBinId" TEXT;

-- CreateIndex
CREATE INDEX "inventory_adjustment_line_inventoryBinId_idx" ON "inventory_adjustment_line"("inventoryBinId");

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_inventoryBinId_fkey" FOREIGN KEY ("inventoryBinId") REFERENCES "inventory_bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

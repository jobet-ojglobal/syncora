-- AlterTable
ALTER TABLE "inventory_adjustment_serial" ADD COLUMN     "draftBinId" TEXT;

-- CreateIndex
CREATE INDEX "inventory_adjustment_serial_draftBinId_idx" ON "inventory_adjustment_serial"("draftBinId");

-- AddForeignKey
ALTER TABLE "inventory_adjustment_serial" ADD CONSTRAINT "inventory_adjustment_serial_draftBinId_fkey" FOREIGN KEY ("draftBinId") REFERENCES "inventory_adjustment_line_bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

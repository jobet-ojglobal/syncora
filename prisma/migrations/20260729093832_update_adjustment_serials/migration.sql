/*
  Warnings:

  - You are about to drop the column `inventoryItemId` on the `inventory_adjustment_serial` table. All the data in the column will be lost.
  - Added the required column `action` to the `inventory_adjustment_serial` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InventorySerialAdjustmentAction" AS ENUM ('ADD', 'REMOVE', 'MOVE', 'VERIFY');

-- DropForeignKey
ALTER TABLE "inventory_adjustment_serial" DROP CONSTRAINT "inventory_adjustment_serial_inventoryItemId_fkey";

-- AlterTable
ALTER TABLE "inventory_adjustment_serial" DROP COLUMN "inventoryItemId",
ADD COLUMN     "action" "InventorySerialAdjustmentAction" NOT NULL,
ADD COLUMN     "fromInventoryBinId" TEXT,
ADD COLUMN     "inventoryBinItemId" TEXT,
ADD COLUMN     "toInventoryBinId" TEXT;

-- CreateIndex
CREATE INDEX "inventory_adjustment_serial_inventoryBinItemId_idx" ON "inventory_adjustment_serial"("inventoryBinItemId");

-- CreateIndex
CREATE INDEX "inventory_adjustment_serial_fromInventoryBinId_idx" ON "inventory_adjustment_serial"("fromInventoryBinId");

-- CreateIndex
CREATE INDEX "inventory_adjustment_serial_toInventoryBinId_idx" ON "inventory_adjustment_serial"("toInventoryBinId");

-- AddForeignKey
ALTER TABLE "inventory_adjustment_serial" ADD CONSTRAINT "inventory_adjustment_serial_inventoryBinItemId_fkey" FOREIGN KEY ("inventoryBinItemId") REFERENCES "inventory_bin_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_serial" ADD CONSTRAINT "inventory_adjustment_serial_fromInventoryBinId_fkey" FOREIGN KEY ("fromInventoryBinId") REFERENCES "inventory_bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_serial" ADD CONSTRAINT "inventory_adjustment_serial_toInventoryBinId_fkey" FOREIGN KEY ("toInventoryBinId") REFERENCES "inventory_bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

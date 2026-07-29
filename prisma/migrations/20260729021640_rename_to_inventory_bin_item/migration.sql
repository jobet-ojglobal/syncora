/*
  Warnings:

  - You are about to drop the column `inventoryItemId` on the `inventory_ledger` table. All the data in the column will be lost.
  - You are about to drop the `inventory_item` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventory_adjustment_serial" DROP CONSTRAINT "inventory_adjustment_serial_inventoryItemId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_item" DROP CONSTRAINT "inventory_item_inventoryBinId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_item" DROP CONSTRAINT "inventory_item_locationId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_item" DROP CONSTRAINT "inventory_item_productId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_ledger" DROP CONSTRAINT "inventory_ledger_inventoryItemId_fkey";

-- AlterTable
ALTER TABLE "inventory_ledger" DROP COLUMN "inventoryItemId",
ADD COLUMN     "inventoryBinItemId" TEXT;

-- DropTable
DROP TABLE "inventory_item";

-- CreateTable
CREATE TABLE "inventory_bin_item" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "inventoryBinId" TEXT,
    "serialNumber" TEXT NOT NULL,
    "status" "SerialStatus" NOT NULL DEFAULT 'IN_STOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_bin_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_bin_item_serialNumber_key" ON "inventory_bin_item"("serialNumber");

-- CreateIndex
CREATE INDEX "inventory_bin_item_productId_locationId_idx" ON "inventory_bin_item"("productId", "locationId");

-- AddForeignKey
ALTER TABLE "inventory_bin_item" ADD CONSTRAINT "inventory_bin_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_bin_item" ADD CONSTRAINT "inventory_bin_item_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_bin_item" ADD CONSTRAINT "inventory_bin_item_inventoryBinId_fkey" FOREIGN KEY ("inventoryBinId") REFERENCES "inventory_bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_serial" ADD CONSTRAINT "inventory_adjustment_serial_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_bin_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_inventoryBinItemId_fkey" FOREIGN KEY ("inventoryBinItemId") REFERENCES "inventory_bin_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `sublocationId` on the `inventory_item` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventory_item" DROP CONSTRAINT "inventory_item_sublocationId_fkey";

-- AlterTable
ALTER TABLE "inventory_item" DROP COLUMN "sublocationId",
ADD COLUMN     "inventoryBinId" TEXT;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_inventoryBinId_fkey" FOREIGN KEY ("inventoryBinId") REFERENCES "inventory_bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

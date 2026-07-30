/*
  Warnings:

  - You are about to drop the column `inventoryBinId` on the `inventory_adjustment_line` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventory_adjustment_line" DROP CONSTRAINT "inventory_adjustment_line_inventoryBinId_fkey";

-- DropIndex
DROP INDEX "inventory_adjustment_line_inventoryBinId_idx";

-- AlterTable
ALTER TABLE "inventory_adjustment_line" DROP COLUMN "inventoryBinId";

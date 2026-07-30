/*
  Warnings:

  - You are about to drop the column `notes` on the `inventory_adjustment` table. All the data in the column will be lost.
  - The `reason` column on the `inventory_adjustment_line` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InventoryAdjustmentLineReason" AS ENUM ('STOCK_COUNT', 'DAMAGE', 'LOSS', 'THEFT', 'EXPIRED', 'RETURN', 'CORRECTION', 'MANUAL');

-- AlterTable
ALTER TABLE "inventory_adjustment" DROP COLUMN "notes",
ADD COLUMN     "lastModifiedById" TEXT,
ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "inventory_adjustment_line" DROP COLUMN "reason",
ADD COLUMN     "reason" "InventoryAdjustmentLineReason";

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

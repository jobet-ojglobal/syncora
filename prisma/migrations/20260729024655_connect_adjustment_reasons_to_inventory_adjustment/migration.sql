/*
  Warnings:

  - You are about to drop the column `reason` on the `inventory_adjustment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inventory_adjustment" DROP COLUMN "reason",
ADD COLUMN     "adjustmentReasonId" TEXT;

-- DropEnum
DROP TYPE "InventoryAdjustmentReason";

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_adjustmentReasonId_fkey" FOREIGN KEY ("adjustmentReasonId") REFERENCES "adjustment_reason"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

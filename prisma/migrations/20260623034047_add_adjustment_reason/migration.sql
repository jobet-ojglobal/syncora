/*
  Warnings:

  - Changed the type of `reason` on the `inventory_adjustment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "InventoryAdjustmentReason" AS ENUM ('STOCK_COUNT', 'DAMAGE', 'LOSS', 'THEFT', 'EXPIRED', 'RETURN', 'CORRECTION', 'MANUAL');

-- AlterTable
ALTER TABLE "inventory_adjustment" DROP COLUMN "reason",
ADD COLUMN     "reason" "InventoryAdjustmentReason" NOT NULL;

-- DropEnum
DROP TYPE "AdjustmentReason";

-- CreateTable
CREATE TABLE "adjustment_reason" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "adjustment_reason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adjustment_reason_inflowId_key" ON "adjustment_reason"("inflowId");

-- CreateIndex
CREATE INDEX "adjustment_reason_name_idx" ON "adjustment_reason"("name");

/*
  Warnings:

  - You are about to drop the `inventoryLedger` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `inventory_adjustment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "inventoryLedger" DROP CONSTRAINT "inventoryLedger_inventoryItemId_fkey";

-- DropForeignKey
ALTER TABLE "inventoryLedger" DROP CONSTRAINT "inventoryLedger_locationId_fkey";

-- DropForeignKey
ALTER TABLE "inventoryLedger" DROP CONSTRAINT "inventoryLedger_performedById_fkey";

-- DropForeignKey
ALTER TABLE "inventoryLedger" DROP CONSTRAINT "inventoryLedger_productId_fkey";

-- DropForeignKey
ALTER TABLE "inventoryLedger" DROP CONSTRAINT "inventoryLedger_sublocationId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_adjustment" DROP CONSTRAINT "inventory_adjustment_performedById_fkey";

-- DropForeignKey
ALTER TABLE "inventory_adjustment_line" DROP CONSTRAINT "inventory_adjustment_line_locationId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_adjustment_line" DROP CONSTRAINT "inventory_adjustment_line_productId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_adjustment_line" DROP CONSTRAINT "inventory_adjustment_line_sublocationId_fkey";

-- AlterTable
ALTER TABLE "inventory_adjustment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- DropTable
DROP TABLE "inventoryLedger";

-- CreateTable
CREATE TABLE "inventory_adjustment_serial" (
    "id" TEXT NOT NULL,
    "adjustmentLineId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "serialNumber" TEXT NOT NULL,

    CONSTRAINT "inventory_adjustment_serial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_ledger" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sublocationId" TEXT,
    "transactionType" "InventoryTransactionType" NOT NULL,
    "referenceType" "InventoryReferenceType",
    "referenceId" TEXT,
    "performedById" TEXT,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "fromSublocationId" TEXT,
    "toSublocationId" TEXT,
    "batchNumber" TEXT,
    "inventoryItemId" TEXT,
    "uomName" TEXT,
    "quantityChange" DECIMAL(18,4) NOT NULL,
    "quantityBefore" DECIMAL(18,4) NOT NULL,
    "quantityAfter" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,5),
    "totalCost" DECIMAL(18,5),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_adjustment_serial_adjustmentLineId_idx" ON "inventory_adjustment_serial"("adjustmentLineId");

-- CreateIndex
CREATE INDEX "inventory_adjustment_serial_serialNumber_idx" ON "inventory_adjustment_serial"("serialNumber");

-- CreateIndex
CREATE INDEX "inventory_ledger_productId_createdAt_idx" ON "inventory_ledger"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_ledger_locationId_createdAt_idx" ON "inventory_ledger"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_ledger_referenceType_referenceId_idx" ON "inventory_ledger"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "inventory_ledger_transactionType_idx" ON "inventory_ledger"("transactionType");

-- CreateIndex
CREATE INDEX "inventory_ledger_createdAt_idx" ON "inventory_ledger"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_ledger_productId_locationId_createdAt_idx" ON "inventory_ledger"("productId", "locationId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_ledger_sublocationId_idx" ON "inventory_ledger"("sublocationId");

-- CreateIndex
CREATE INDEX "inventory_adjustment_line_adjustmentId_idx" ON "inventory_adjustment_line"("adjustmentId");

-- CreateIndex
CREATE INDEX "inventory_adjustment_line_sublocationId_idx" ON "inventory_adjustment_line"("sublocationId");

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "team_member"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_sublocationId_fkey" FOREIGN KEY ("sublocationId") REFERENCES "sublocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_serial" ADD CONSTRAINT "inventory_adjustment_serial_adjustmentLineId_fkey" FOREIGN KEY ("adjustmentLineId") REFERENCES "inventory_adjustment_line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_serial" ADD CONSTRAINT "inventory_adjustment_serial_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_sublocationId_fkey" FOREIGN KEY ("sublocationId") REFERENCES "sublocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('STOCK_COUNT', 'DAMAGE', 'LOSS', 'THEFT', 'EXPIRED', 'RETURN', 'CORRECTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'PURCHASE', 'SALE', 'RETURN');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustment" (
    "id" TEXT NOT NULL,
    "adjustmentNumber" TEXT NOT NULL,
    "reason" "AdjustmentReason" NOT NULL,
    "notes" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustment_line" (
    "id" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sublocationId" TEXT,
    "quantityBefore" DECIMAL(18,4) NOT NULL,
    "quantityAdjusted" DECIMAL(18,4) NOT NULL,
    "quantityAfter" DECIMAL(18,4) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustment_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLedger" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sublocationId" TEXT,
    "transactionType" "InventoryTransactionType" NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "quantityChange" DECIMAL(18,4) NOT NULL,
    "quantityBefore" DECIMAL(18,4) NOT NULL,
    "quantityAfter" DECIMAL(18,4) NOT NULL,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_adjustment_adjustmentNumber_key" ON "inventory_adjustment"("adjustmentNumber");

-- CreateIndex
CREATE INDEX "inventory_adjustment_line_productId_idx" ON "inventory_adjustment_line"("productId");

-- CreateIndex
CREATE INDEX "inventory_adjustment_line_locationId_idx" ON "inventory_adjustment_line"("locationId");

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "inventory_adjustment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_sublocationId_fkey" FOREIGN KEY ("sublocationId") REFERENCES "sublocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

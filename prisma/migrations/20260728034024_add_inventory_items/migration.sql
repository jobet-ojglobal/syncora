/*
  Warnings:

  - You are about to drop the column `serialNumber` on the `inventoryLedger` table. All the data in the column will be lost.
  - You are about to alter the column `unitCost` on the `inventoryLedger` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,5)`.
  - You are about to drop the column `serialNumber` on the `inventory_bin` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SerialStatus" AS ENUM ('IN_STOCK', 'RESERVED', 'SOLD', 'DAMAGED');

-- AlterTable
ALTER TABLE "inventoryLedger" DROP COLUMN "serialNumber",
ADD COLUMN     "fromLocationId" TEXT,
ADD COLUMN     "fromSublocationId" TEXT,
ADD COLUMN     "inventoryItemId" TEXT,
ADD COLUMN     "toLocationId" TEXT,
ADD COLUMN     "toSublocationId" TEXT,
ADD COLUMN     "totalCost" DECIMAL(18,5),
ADD COLUMN     "uomName" TEXT,
ALTER COLUMN "unitCost" SET DATA TYPE DECIMAL(18,5);

-- AlterTable
ALTER TABLE "inventory_bin" DROP COLUMN "serialNumber";

-- AlterTable
ALTER TABLE "transfer_order_line" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "inventory_item" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sublocationId" TEXT,
    "serialNumber" TEXT NOT NULL,
    "status" "SerialStatus" NOT NULL DEFAULT 'IN_STOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_serialNumber_key" ON "inventory_item"("serialNumber");

-- CreateIndex
CREATE INDEX "inventory_item_productId_locationId_idx" ON "inventory_item"("productId", "locationId");

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_sublocationId_fkey" FOREIGN KEY ("sublocationId") REFERENCES "sublocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventoryLedger" ADD CONSTRAINT "inventoryLedger_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

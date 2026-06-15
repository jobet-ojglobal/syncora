/*
  Warnings:

  - You are about to drop the `LocationAddress` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TransferOrderStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "LocationAddress" DROP CONSTRAINT "LocationAddress_locationId_fkey";

-- DropTable
DROP TABLE "LocationAddress";

-- CreateTable
CREATE TABLE "location_address" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "remarks" TEXT,
    "addressType" TEXT,

    CONSTRAINT "location_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "targetLocationId" TEXT NOT NULL,
    "status" "TransferOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "transferredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order_line" (
    "id" TEXT NOT NULL,
    "transferOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceSublocationId" TEXT,
    "targetSublocationId" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_order_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_address_locationId_key" ON "location_address"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_order_transferNumber_key" ON "transfer_order"("transferNumber");

-- CreateIndex
CREATE INDEX "transfer_order_sourceLocationId_idx" ON "transfer_order"("sourceLocationId");

-- CreateIndex
CREATE INDEX "transfer_order_targetLocationId_idx" ON "transfer_order"("targetLocationId");

-- CreateIndex
CREATE INDEX "transfer_order_line_transferOrderId_idx" ON "transfer_order_line"("transferOrderId");

-- CreateIndex
CREATE INDEX "transfer_order_line_productId_idx" ON "transfer_order_line"("productId");

-- AddForeignKey
ALTER TABLE "location_address" ADD CONSTRAINT "location_address_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_targetLocationId_fkey" FOREIGN KEY ("targetLocationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_transferOrderId_fkey" FOREIGN KEY ("transferOrderId") REFERENCES "transfer_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_sourceSublocationId_fkey" FOREIGN KEY ("sourceSublocationId") REFERENCES "sublocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_targetSublocationId_fkey" FOREIGN KEY ("targetSublocationId") REFERENCES "sublocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

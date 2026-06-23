/*
  Warnings:

  - You are about to drop the column `timestamp` on the `currency` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `currency_conversion` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `pricing_scheme` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `product_price` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "currency" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "currency_conversion" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "pricing_scheme" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "product_price" DROP COLUMN "timestamp";

-- CreateTable
CREATE TABLE "product_cost_adjustment" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lastModifiedById" TEXT,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "serial" TEXT,
    "unitCost" DECIMAL(18,5) NOT NULL,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_cost_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_cost_adjustment_inflowId_key" ON "product_cost_adjustment"("inflowId");

-- CreateIndex
CREATE INDEX "product_cost_adjustment_productId_idx" ON "product_cost_adjustment"("productId");

-- CreateIndex
CREATE INDEX "product_cost_adjustment_lastModifiedById_idx" ON "product_cost_adjustment"("lastModifiedById");

-- CreateIndex
CREATE INDEX "product_cost_adjustment_dateTime_idx" ON "product_cost_adjustment"("dateTime");

-- AddForeignKey
ALTER TABLE "product_cost_adjustment" ADD CONSTRAINT "product_cost_adjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_adjustment" ADD CONSTRAINT "product_cost_adjustment_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

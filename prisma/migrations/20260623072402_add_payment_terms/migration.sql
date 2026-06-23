/*
  Warnings:

  - You are about to drop the column `timestamp` on the `product_cost_adjustment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product_cost_adjustment" DROP COLUMN "timestamp";

-- CreateTable
CREATE TABLE "payment_terms" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysDue" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_terms_inflowId_key" ON "payment_terms"("inflowId");

-- CreateIndex
CREATE INDEX "payment_terms_name_idx" ON "payment_terms"("name");

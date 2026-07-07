/*
  Warnings:

  - A unique constraint covering the columns `[localId]` on the table `business_partner_address` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[localId]` on the table `customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[localId]` on the table `customer_balance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[localId]` on the table `customer_credit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[localId]` on the table `customer_due` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `localId` to the `customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `localId` to the `customer_balance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `localId` to the `customer_credit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `localId` to the `customer_due` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "business_partner_address" ADD COLUMN     "localId" TEXT;

-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "localId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "customer_balance" ADD COLUMN     "localId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "customer_credit" ADD COLUMN     "localId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "customer_due" ADD COLUMN     "localId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "business_partner_address_localId_key" ON "business_partner_address"("localId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_localId_key" ON "customer"("localId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_balance_localId_key" ON "customer_balance"("localId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_credit_localId_key" ON "customer_credit"("localId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_due_localId_key" ON "customer_due"("localId");

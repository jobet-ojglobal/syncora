/*
  Warnings:

  - A unique constraint covering the columns `[locationId]` on the table `location_webhook` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "business_partner_address" ALTER COLUMN "localId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "location_webhook_locationId_key" ON "location_webhook"("locationId");

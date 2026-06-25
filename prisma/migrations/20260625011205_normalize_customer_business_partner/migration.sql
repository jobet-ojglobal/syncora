/*
  Warnings:

  - You are about to drop the column `contactName` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `fax` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the `customer_address` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[businessPartnerId]` on the table `customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `businessPartnerId` to the `customer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "customer_address" DROP CONSTRAINT "customer_address_customerId_fkey";

-- DropIndex
DROP INDEX "customer_name_idx";

-- AlterTable
ALTER TABLE "customer" DROP COLUMN "contactName",
DROP COLUMN "email",
DROP COLUMN "fax",
DROP COLUMN "isActive",
DROP COLUMN "name",
DROP COLUMN "phone",
DROP COLUMN "remarks",
DROP COLUMN "website",
ADD COLUMN     "businessPartnerId" TEXT NOT NULL;

-- DropTable
DROP TABLE "customer_address";

-- CreateTable
CREATE TABLE "business_partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "website" TEXT,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "business_partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_partner_address" (
    "id" TEXT NOT NULL,
    "businessPartnerId" TEXT NOT NULL,
    "inflowId" TEXT,
    "name" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "remarks" TEXT,
    "addressType" TEXT,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_partner_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor" (
    "id" TEXT NOT NULL,
    "businessPartnerId" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "currencyId" TEXT,
    "defaultAddressId" TEXT,
    "defaultCarrier" TEXT,
    "defaultPaymentMethod" TEXT,
    "defaultPaymentTermsId" TEXT,
    "discount" DECIMAL(10,2),
    "isTaxInclusivePricing" BOOLEAN NOT NULL DEFAULT false,
    "leadTimeDays" INTEGER,
    "taxingSchemeId" TEXT,
    "lastModifiedById" TEXT,
    "lastModifiedDttm" TIMESTAMP(3),
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_partner_name_idx" ON "business_partner"("name");

-- CreateIndex
CREATE UNIQUE INDEX "business_partner_address_inflowId_key" ON "business_partner_address"("inflowId");

-- CreateIndex
CREATE INDEX "business_partner_address_businessPartnerId_idx" ON "business_partner_address"("businessPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_businessPartnerId_key" ON "vendor"("businessPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_inflowId_key" ON "vendor"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_businessPartnerId_key" ON "customer"("businessPartnerId");

-- AddForeignKey
ALTER TABLE "business_partner_address" ADD CONSTRAINT "business_partner_address_businessPartnerId_fkey" FOREIGN KEY ("businessPartnerId") REFERENCES "business_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_businessPartnerId_fkey" FOREIGN KEY ("businessPartnerId") REFERENCES "business_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_defaultBillingAddressId_fkey" FOREIGN KEY ("defaultBillingAddressId") REFERENCES "business_partner_address"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_defaultShippingAddressId_fkey" FOREIGN KEY ("defaultShippingAddressId") REFERENCES "business_partner_address"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_businessPartnerId_fkey" FOREIGN KEY ("businessPartnerId") REFERENCES "business_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_defaultPaymentTermsId_fkey" FOREIGN KEY ("defaultPaymentTermsId") REFERENCES "payment_terms"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_taxingSchemeId_fkey" FOREIGN KEY ("taxingSchemeId") REFERENCES "taxing_scheme"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

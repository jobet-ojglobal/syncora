/*
  Warnings:

  - You are about to drop the column `timestamp` on the `location` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "location" DROP COLUMN "timestamp";

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "website" TEXT,
    "remarks" TEXT,
    "taxExemptNumber" TEXT,
    "defaultCarrier" TEXT,
    "defaultPaymentMethod" TEXT,
    "discount" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultLocationId" TEXT,
    "defaultPaymentTermsId" TEXT,
    "pricingSchemeId" TEXT,
    "taxingSchemeId" TEXT,
    "defaultSalesRepTeamMemberId" TEXT,
    "lastModifiedById" TEXT,
    "lastModifiedDttm" TIMESTAMP(3),
    "defaultBillingAddressId" TEXT,
    "defaultShippingAddressId" TEXT,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_address" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
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

    CONSTRAINT "customer_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_due" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "amountCurrent" DECIMAL(18,5) NOT NULL,
    "amount1To30" DECIMAL(18,5) NOT NULL,
    "amount31To60" DECIMAL(18,5) NOT NULL,
    "amount61Plus" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_due_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_balance" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "balance" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_credit" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "credit" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_credit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_inflowId_key" ON "customer"("inflowId");

-- CreateIndex
CREATE INDEX "customer_name_idx" ON "customer"("name");

-- CreateIndex
CREATE INDEX "customer_pricingSchemeId_idx" ON "customer"("pricingSchemeId");

-- CreateIndex
CREATE INDEX "customer_taxingSchemeId_idx" ON "customer"("taxingSchemeId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_address_inflowId_key" ON "customer_address"("inflowId");

-- CreateIndex
CREATE INDEX "customer_address_customerId_idx" ON "customer_address"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_due_inflowId_key" ON "customer_due"("inflowId");

-- CreateIndex
CREATE INDEX "customer_due_customerId_idx" ON "customer_due"("customerId");

-- CreateIndex
CREATE INDEX "customer_due_currencyId_idx" ON "customer_due"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_due_customerId_currencyId_key" ON "customer_due"("customerId", "currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_balance_inflowId_key" ON "customer_balance"("inflowId");

-- CreateIndex
CREATE INDEX "customer_balance_customerId_idx" ON "customer_balance"("customerId");

-- CreateIndex
CREATE INDEX "customer_balance_currencyId_idx" ON "customer_balance"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_balance_customerId_currencyId_key" ON "customer_balance"("customerId", "currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_credit_inflowId_key" ON "customer_credit"("inflowId");

-- CreateIndex
CREATE INDEX "customer_credit_customerId_idx" ON "customer_credit"("customerId");

-- CreateIndex
CREATE INDEX "customer_credit_currencyId_idx" ON "customer_credit"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_credit_customerId_currencyId_key" ON "customer_credit"("customerId", "currencyId");

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_defaultLocationId_fkey" FOREIGN KEY ("defaultLocationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_defaultPaymentTermsId_fkey" FOREIGN KEY ("defaultPaymentTermsId") REFERENCES "payment_terms"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_pricingSchemeId_fkey" FOREIGN KEY ("pricingSchemeId") REFERENCES "pricing_scheme"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_taxingSchemeId_fkey" FOREIGN KEY ("taxingSchemeId") REFERENCES "taxing_scheme"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_defaultSalesRepTeamMemberId_fkey" FOREIGN KEY ("defaultSalesRepTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_address" ADD CONSTRAINT "customer_address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_due" ADD CONSTRAINT "customer_due_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_due" ADD CONSTRAINT "customer_due_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_balance" ADD CONSTRAINT "customer_balance_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_balance" ADD CONSTRAINT "customer_balance_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credit" ADD CONSTRAINT "customer_credit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credit" ADD CONSTRAINT "customer_credit_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

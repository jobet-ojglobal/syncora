-- CreateEnum
CREATE TYPE "CurrencyNegativeType" AS ENUM ('Leading', 'Trailing', 'Parentheses');

-- CreateTable
CREATE TABLE "currency" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "symbol" TEXT,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "decimalSeparator" TEXT,
    "thousandsSeparator" TEXT,
    "isSymbolFirst" BOOLEAN NOT NULL DEFAULT true,
    "negativeType" "CurrencyNegativeType",
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_conversion" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "exchangeRate" DECIMAL(18,8) NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_conversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currency_inflowId_key" ON "currency"("inflowId");

-- CreateIndex
CREATE INDEX "currency_isoCode_idx" ON "currency"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "currency_conversion_inflowId_key" ON "currency_conversion"("inflowId");

-- CreateIndex
CREATE INDEX "currency_conversion_currencyId_idx" ON "currency_conversion"("currencyId");

-- AddForeignKey
ALTER TABLE "currency_conversion" ADD CONSTRAINT "currency_conversion_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ProductPriceType" AS ENUM ('fixedPrice', 'markup', 'margin');

-- CreateTable
CREATE TABLE "product_price" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "pricingSchemeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceType" "ProductPriceType" NOT NULL,
    "unitPrice" DECIMAL(18,5),
    "fixedMarkup" DECIMAL(18,5),
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_scheme" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isTaxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pricing_scheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_price_inflowId_key" ON "product_price"("inflowId");

-- CreateIndex
CREATE INDEX "product_price_pricingSchemeId_idx" ON "product_price"("pricingSchemeId");

-- CreateIndex
CREATE INDEX "product_price_productId_idx" ON "product_price"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_price_pricingSchemeId_productId_key" ON "product_price"("pricingSchemeId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_scheme_inflowId_key" ON "pricing_scheme"("inflowId");

-- CreateIndex
CREATE INDEX "pricing_scheme_currencyId_idx" ON "pricing_scheme"("currencyId");

-- AddForeignKey
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_pricingSchemeId_fkey" FOREIGN KEY ("pricingSchemeId") REFERENCES "pricing_scheme"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_scheme" ADD CONSTRAINT "pricing_scheme_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

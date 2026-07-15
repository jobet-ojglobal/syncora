/*
  Warnings:

  - The values [fixedPrice,markup,margin] on the enum `ProductPriceType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProductPriceType_new" AS ENUM ('FixedPrice', 'FixedMarkup', 'Dynamic', 'Tiered');
ALTER TABLE "product_price" ALTER COLUMN "priceType" TYPE "ProductPriceType_new" USING ("priceType"::text::"ProductPriceType_new");
ALTER TYPE "ProductPriceType" RENAME TO "ProductPriceType_old";
ALTER TYPE "ProductPriceType_new" RENAME TO "ProductPriceType";
DROP TYPE "public"."ProductPriceType_old";
COMMIT;

-- CreateTable
CREATE TABLE "product_price_tier" (
    "id" TEXT NOT NULL,
    "productPriceId" TEXT NOT NULL,
    "minQuantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,5) NOT NULL,

    CONSTRAINT "product_price_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sublocation_location_map" (
    "id" TEXT NOT NULL,
    "sublocationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "sublocation_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_price_tier_productPriceId_idx" ON "product_price_tier"("productPriceId");

-- CreateIndex
CREATE INDEX "sublocation_location_map_locationId_localId_idx" ON "sublocation_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "sublocation_location_map_sublocationId_locationId_key" ON "sublocation_location_map"("sublocationId", "locationId");

-- AddForeignKey
ALTER TABLE "product_price_tier" ADD CONSTRAINT "product_price_tier_productPriceId_fkey" FOREIGN KEY ("productPriceId") REFERENCES "product_price"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sublocation_location_map" ADD CONSTRAINT "sublocation_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sublocation_location_map" ADD CONSTRAINT "sublocation_location_map_sublocationId_fkey" FOREIGN KEY ("sublocationId") REFERENCES "sublocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

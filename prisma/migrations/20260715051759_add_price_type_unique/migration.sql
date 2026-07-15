/*
  Warnings:

  - The values [Dynamic,Tiered] on the enum `ProductPriceType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[pricingSchemeId,productId,priceType]` on the table `product_price` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProductPriceType_new" AS ENUM ('FixedPrice', 'FixedMarkup');
ALTER TABLE "product_price" ALTER COLUMN "priceType" TYPE "ProductPriceType_new" USING ("priceType"::text::"ProductPriceType_new");
ALTER TYPE "ProductPriceType" RENAME TO "ProductPriceType_old";
ALTER TYPE "ProductPriceType_new" RENAME TO "ProductPriceType";
DROP TYPE "public"."ProductPriceType_old";
COMMIT;

-- DropIndex
DROP INDEX "product_price_pricingSchemeId_productId_key";

-- CreateIndex
CREATE UNIQUE INDEX "product_price_pricingSchemeId_productId_priceType_key" ON "product_price"("pricingSchemeId", "productId", "priceType");

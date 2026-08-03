/*
  Warnings:

  - You are about to alter the column `exchangeRate` on the `purchase_order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,10)`.
  - You are about to alter the column `exchangeRate` on the `sales_order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,10)`.

*/
-- AlterTable
ALTER TABLE "purchase_order" ALTER COLUMN "exchangeRate" SET DATA TYPE DECIMAL(18,10);

-- AlterTable
ALTER TABLE "sales_order" ALTER COLUMN "exchangeRate" SET DATA TYPE DECIMAL(18,10);

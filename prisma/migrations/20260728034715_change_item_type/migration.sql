/*
  Warnings:

  - The `itemType` column on the `product` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('StockedProduct', 'NonstockedProduct', 'Service');

-- AlterTable
ALTER TABLE "product" DROP COLUMN "itemType",
ADD COLUMN     "itemType" "ProductType";

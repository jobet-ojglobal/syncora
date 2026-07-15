/*
  Warnings:

  - Made the column `sku` on table `product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "product" ALTER COLUMN "sku" SET NOT NULL;

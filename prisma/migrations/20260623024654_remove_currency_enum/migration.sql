/*
  Warnings:

  - The `negativeType` column on the `currency` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "currency" DROP COLUMN "negativeType",
ADD COLUMN     "negativeType" TEXT;

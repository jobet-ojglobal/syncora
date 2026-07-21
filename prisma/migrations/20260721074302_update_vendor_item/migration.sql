/*
  Warnings:

  - The `leadTimeDays` column on the `vendor_item` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `lineNum` column on the `vendor_item` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "vendor_item" DROP COLUMN "leadTimeDays",
ADD COLUMN     "leadTimeDays" INTEGER,
DROP COLUMN "lineNum",
ADD COLUMN     "lineNum" INTEGER;

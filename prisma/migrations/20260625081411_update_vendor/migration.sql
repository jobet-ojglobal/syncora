/*
  Warnings:

  - You are about to drop the column `timestamp` on the `business_partner_address` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `product_barcode` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `tax_code` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `taxing_scheme` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `vendor` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `vendor_attachment` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `vendor_item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "business_partner_address" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "customer" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "product" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "product_barcode" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "tax_code" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "taxing_scheme" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "vendor" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "vendor_attachment" DROP COLUMN "timestamp";

-- AlterTable
ALTER TABLE "vendor_item" DROP COLUMN "timestamp";

/*
  Warnings:

  - Changed the type of `reorderMethod` on the `product_reorder_setting` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ReorderSettingMethod" AS ENUM ('PurchaseOrder', 'StockTransfer');

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "customFields" JSONB;

-- AlterTable
ALTER TABLE "product_reorder_setting" DROP COLUMN "reorderMethod",
ADD COLUMN     "reorderMethod" "ReorderSettingMethod" NOT NULL;

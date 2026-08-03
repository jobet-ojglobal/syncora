/*
  Warnings:

  - Changed the type of `paymentStatus` on the `purchase_order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `inventoryStatus` on the `purchase_order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `paymentStatus` on the `sales_order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `inventoryStatus` on the `sales_order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SalesOrderPaymentStatus" AS ENUM ('OWING', 'UNINVOICED', 'INVOICED', 'QUOTE', 'PAID');

-- CreateEnum
CREATE TYPE "SalesOrderInventoryStatus" AS ENUM ('STARTED', 'UNFULFILLED', 'FULFILLED', 'QUOTE');

-- CreateEnum
CREATE TYPE "PurchaseOrderPaymentStatus" AS ENUM ('OWING', 'UNPAID', 'PAID', 'PARTIAL', 'QUOTE');

-- CreateEnum
CREATE TYPE "PurchaseOrderInventoryStatus" AS ENUM ('STARTED', 'UNFULFILLED', 'FULFILLED', 'QUOTE');

-- AlterTable
ALTER TABLE "purchase_order" DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "PurchaseOrderPaymentStatus" NOT NULL,
DROP COLUMN "inventoryStatus",
ADD COLUMN     "inventoryStatus" "PurchaseOrderInventoryStatus" NOT NULL;

-- AlterTable
ALTER TABLE "sales_order" DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "SalesOrderPaymentStatus" NOT NULL,
DROP COLUMN "inventoryStatus",
ADD COLUMN     "inventoryStatus" "SalesOrderInventoryStatus" NOT NULL;

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "SalesOrderStatus";

-- CreateIndex
CREATE INDEX "purchase_order_paymentStatus_idx" ON "purchase_order"("paymentStatus");

-- CreateIndex
CREATE INDEX "sales_order_paymentStatus_idx" ON "sales_order"("paymentStatus");

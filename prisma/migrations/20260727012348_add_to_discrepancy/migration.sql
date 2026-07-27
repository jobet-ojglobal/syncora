-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransferOrderStatus" ADD VALUE 'PARTIALLY_RECEIVED';
ALTER TYPE "TransferOrderStatus" ADD VALUE 'RECEIVED_DISCREPANCY';

-- AlterTable
ALTER TABLE "transfer_order_line" ADD COLUMN     "discrepancyQuantity" DECIMAL(18,4),
ADD COLUMN     "discrepancyReason" TEXT;

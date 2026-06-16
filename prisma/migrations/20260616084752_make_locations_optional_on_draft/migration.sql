-- DropForeignKey
ALTER TABLE "transfer_order" DROP CONSTRAINT "transfer_order_sourceLocationId_fkey";

-- DropForeignKey
ALTER TABLE "transfer_order" DROP CONSTRAINT "transfer_order_targetLocationId_fkey";

-- AlterTable
ALTER TABLE "transfer_order" ALTER COLUMN "sourceLocationId" DROP NOT NULL,
ALTER COLUMN "targetLocationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_targetLocationId_fkey" FOREIGN KEY ("targetLocationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

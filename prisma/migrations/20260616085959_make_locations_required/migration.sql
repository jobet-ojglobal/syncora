/*
  Warnings:

  - Made the column `sourceLocationId` on table `transfer_order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `targetLocationId` on table `transfer_order` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "transfer_order" DROP CONSTRAINT "transfer_order_sourceLocationId_fkey";

-- DropForeignKey
ALTER TABLE "transfer_order" DROP CONSTRAINT "transfer_order_targetLocationId_fkey";

-- AlterTable
ALTER TABLE "transfer_order" ALTER COLUMN "sourceLocationId" SET NOT NULL,
ALTER COLUMN "targetLocationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_targetLocationId_fkey" FOREIGN KEY ("targetLocationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

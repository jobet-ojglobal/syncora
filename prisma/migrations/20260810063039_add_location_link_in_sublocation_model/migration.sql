-- AlterTable
ALTER TABLE "sublocation" ADD COLUMN     "linkedLocationId" TEXT;

-- AddForeignKey
ALTER TABLE "sublocation" ADD CONSTRAINT "sublocation_linkedLocationId_fkey" FOREIGN KEY ("linkedLocationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

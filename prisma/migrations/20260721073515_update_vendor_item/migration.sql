-- AlterTable
ALTER TABLE "business_partner_address" ALTER COLUMN "localId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vendor_item" ADD COLUMN     "leadTimeDays" TEXT,
ADD COLUMN     "lineNum" TEXT;

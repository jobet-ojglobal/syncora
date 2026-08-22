/*
  Warnings:

  - You are about to drop the column `url` on the `location` table. All the data in the column will be lost.
  - You are about to drop the column `addressType` on the `location_address` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'STORE', 'FULFILLMENT_CENTER', 'TRANSIT');

-- AlterTable
ALTER TABLE "business_partner_address" ALTER COLUMN "localId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "location" DROP COLUMN "url",
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "locationType" "LocationType" NOT NULL DEFAULT 'STORE';

-- AlterTable
ALTER TABLE "location_address" DROP COLUMN "addressType";

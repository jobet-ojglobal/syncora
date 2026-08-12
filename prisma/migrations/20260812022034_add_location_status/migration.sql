-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "location" ADD COLUMN     "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE';

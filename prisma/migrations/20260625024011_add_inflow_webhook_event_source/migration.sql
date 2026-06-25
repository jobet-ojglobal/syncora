-- CreateEnum
CREATE TYPE "InflowSource" AS ENUM ('Cloud', 'Local');

-- AlterTable
ALTER TABLE "inflow_webhook_event" ADD COLUMN     "source" "InflowSource" NOT NULL DEFAULT 'Cloud';

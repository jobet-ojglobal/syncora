-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "isAutoReorderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredSourceLocationId" TEXT,
ADD COLUMN     "reorderQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
ADD COLUMN     "reorderThreshold" DECIMAL(18,4) NOT NULL DEFAULT 0.0000;

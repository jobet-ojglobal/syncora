/*
  Warnings:

  - You are about to drop the column `localId` on the `tax_code` table. All the data in the column will be lost.
  - You are about to drop the column `localId` on the `taxing_scheme` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tax_code_localId_key";

-- DropIndex
DROP INDEX "taxing_scheme_localId_key";

-- AlterTable
ALTER TABLE "tax_code" DROP COLUMN "localId";

-- AlterTable
ALTER TABLE "taxing_scheme" DROP COLUMN "localId";

-- CreateTable
CREATE TABLE "taxing_scheme_location_map" (
    "id" TEXT NOT NULL,
    "taxingSchemeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "taxing_scheme_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_code_location_map" (
    "id" TEXT NOT NULL,
    "taxCodeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "tax_code_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taxing_scheme_location_map_locationId_localId_idx" ON "taxing_scheme_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "taxing_scheme_location_map_taxingSchemeId_locationId_key" ON "taxing_scheme_location_map"("taxingSchemeId", "locationId");

-- CreateIndex
CREATE INDEX "tax_code_location_map_locationId_localId_idx" ON "tax_code_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_code_location_map_taxCodeId_locationId_key" ON "tax_code_location_map"("taxCodeId", "locationId");

-- AddForeignKey
ALTER TABLE "taxing_scheme_location_map" ADD CONSTRAINT "taxing_scheme_location_map_taxingSchemeId_fkey" FOREIGN KEY ("taxingSchemeId") REFERENCES "taxing_scheme"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_code_location_map" ADD CONSTRAINT "tax_code_location_map_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "tax_code"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - A unique constraint covering the columns `[inventoryId,sublocationId]` on the table `inventory_bin` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "inventory_bin_inventoryId_idx" ON "inventory_bin"("inventoryId");

-- CreateIndex
CREATE INDEX "inventory_bin_sublocationId_idx" ON "inventory_bin"("sublocationId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_bin_inventoryId_sublocationId_key" ON "inventory_bin"("inventoryId", "sublocationId");

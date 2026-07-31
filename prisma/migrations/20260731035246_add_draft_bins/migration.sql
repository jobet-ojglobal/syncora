-- CreateTable
CREATE TABLE "InventoryAdjustmentLineBin" (
    "id" TEXT NOT NULL,
    "adjustmentLineId" TEXT NOT NULL,
    "sublocationId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "InventoryAdjustmentLineBin_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventoryAdjustmentLineBin" ADD CONSTRAINT "InventoryAdjustmentLineBin_adjustmentLineId_fkey" FOREIGN KEY ("adjustmentLineId") REFERENCES "inventory_adjustment_line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustmentLineBin" ADD CONSTRAINT "InventoryAdjustmentLineBin_sublocationId_fkey" FOREIGN KEY ("sublocationId") REFERENCES "sublocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "inventory_adjustment_line" DROP CONSTRAINT "inventory_adjustment_line_locationId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_ledger" DROP CONSTRAINT "inventory_ledger_locationId_fkey";

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

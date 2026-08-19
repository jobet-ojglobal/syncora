-- DropForeignKey
ALTER TABLE "inventory_adjustment_line" DROP CONSTRAINT "inventory_adjustment_line_productId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_ledger" DROP CONSTRAINT "inventory_ledger_productId_fkey";

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

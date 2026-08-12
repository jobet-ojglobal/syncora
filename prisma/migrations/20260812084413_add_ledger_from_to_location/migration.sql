-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

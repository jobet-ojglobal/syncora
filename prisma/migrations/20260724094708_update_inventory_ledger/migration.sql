-- DropForeignKey
ALTER TABLE "inventoryLedger" DROP CONSTRAINT "inventoryLedger_performedById_fkey";

-- AddForeignKey
ALTER TABLE "inventoryLedger" ADD CONSTRAINT "inventoryLedger_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

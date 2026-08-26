-- DropForeignKey
ALTER TABLE "inventory_adjustment" DROP CONSTRAINT "inventory_adjustment_performedById_fkey";

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "team_member"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

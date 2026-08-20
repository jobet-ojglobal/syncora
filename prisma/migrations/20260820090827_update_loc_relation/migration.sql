-- DropForeignKey
ALTER TABLE "product_reorder_setting" DROP CONSTRAINT "product_reorder_setting_locationId_fkey";

-- AddForeignKey
ALTER TABLE "product_reorder_setting" ADD CONSTRAINT "product_reorder_setting_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

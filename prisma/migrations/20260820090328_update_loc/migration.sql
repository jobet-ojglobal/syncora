-- DropForeignKey
ALTER TABLE "purchase_order" DROP CONSTRAINT "purchase_order_locationId_fkey";

-- DropForeignKey
ALTER TABLE "sales_order" DROP CONSTRAINT "sales_order_locationId_fkey";

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

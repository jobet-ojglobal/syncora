-- DropForeignKey
ALTER TABLE "AttributeValue" DROP CONSTRAINT "AttributeValue_attributeId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_adjustment_line" DROP CONSTRAINT "inventory_adjustment_line_adjustmentId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_bin" DROP CONSTRAINT "inventory_bin_inventoryId_fkey";

-- DropForeignKey
ALTER TABLE "product_variant" DROP CONSTRAINT "product_variant_productGroupId_fkey";

-- DropForeignKey
ALTER TABLE "sublocation" DROP CONSTRAINT "sublocation_locationId_fkey";

-- DropForeignKey
ALTER TABLE "transfer_order_line" DROP CONSTRAINT "transfer_order_line_transferOrderId_fkey";

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_group"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeValue" ADD CONSTRAINT "AttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sublocation" ADD CONSTRAINT "sublocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_bin" ADD CONSTRAINT "inventory_bin_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "inventory_adjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_transferOrderId_fkey" FOREIGN KEY ("transferOrderId") REFERENCES "transfer_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "StockAdjustment" DROP CONSTRAINT "StockAdjustment_locationId_fkey";

-- DropForeignKey
ALTER TABLE "category_location_map" DROP CONSTRAINT "category_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "currency_location_map" DROP CONSTRAINT "currency_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "customer_balance_location_map" DROP CONSTRAINT "customer_balance_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "customer_credit_location_map" DROP CONSTRAINT "customer_credit_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "customer_due_location_map" DROP CONSTRAINT "customer_due_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "customer_location_map" DROP CONSTRAINT "customer_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "operation_type_location_map" DROP CONSTRAINT "operation_type_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "payment_term_location_map" DROP CONSTRAINT "payment_term_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "pricing_scheme_location_map" DROP CONSTRAINT "pricing_scheme_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_attachment_location_map" DROP CONSTRAINT "product_attachment_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_barcode_location_map" DROP CONSTRAINT "product_barcode_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_bom_location_map" DROP CONSTRAINT "product_bom_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_cost_adjustment_location_map" DROP CONSTRAINT "product_cost_adjustment_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_cost_location_map" DROP CONSTRAINT "product_cost_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_group_location_map" DROP CONSTRAINT "product_group_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_group_option_location_map" DROP CONSTRAINT "product_group_option_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_group_option_value_location_map" DROP CONSTRAINT "product_group_option_value_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_image_location_map" DROP CONSTRAINT "product_image_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_location_map" DROP CONSTRAINT "product_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_operation_location_map" DROP CONSTRAINT "product_operation_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_price_location_map" DROP CONSTRAINT "product_price_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "product_variant_location_map" DROP CONSTRAINT "product_variant_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "purchase_order" DROP CONSTRAINT "purchase_order_locationId_fkey";

-- DropForeignKey
ALTER TABLE "purchase_order_location_map" DROP CONSTRAINT "purchase_order_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "reorder_setting_location_map" DROP CONSTRAINT "reorder_setting_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "sales_order" DROP CONSTRAINT "sales_order_locationId_fkey";

-- DropForeignKey
ALTER TABLE "sales_order_location_map" DROP CONSTRAINT "sales_order_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "tax_code_location_map" DROP CONSTRAINT "tax_code_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "taxing_scheme_location_map" DROP CONSTRAINT "taxing_scheme_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "team_member_location_map_extended" DROP CONSTRAINT "team_member_location_map_extended_locationId_fkey";

-- DropForeignKey
ALTER TABLE "vendor_attachment_location_map" DROP CONSTRAINT "vendor_attachment_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "vendor_balance_location_map" DROP CONSTRAINT "vendor_balance_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "vendor_credit_location_map" DROP CONSTRAINT "vendor_credit_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "vendor_due_location_map" DROP CONSTRAINT "vendor_due_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "vendor_item_location_map" DROP CONSTRAINT "vendor_item_location_map_locationId_fkey";

-- DropForeignKey
ALTER TABLE "vendor_location_map" DROP CONSTRAINT "vendor_location_map_locationId_fkey";

-- AddForeignKey
ALTER TABLE "category_location_map" ADD CONSTRAINT "category_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_location_map" ADD CONSTRAINT "product_group_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_location_map" ADD CONSTRAINT "product_variant_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_location_map" ADD CONSTRAINT "product_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_location_map" ADD CONSTRAINT "product_price_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_adjustment_location_map" ADD CONSTRAINT "product_cost_adjustment_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcode_location_map" ADD CONSTRAINT "product_barcode_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_operation_location_map" ADD CONSTRAINT "product_operation_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_type_location_map" ADD CONSTRAINT "operation_type_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attachment_location_map" ADD CONSTRAINT "product_attachment_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_location_map" ADD CONSTRAINT "product_cost_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_setting_location_map" ADD CONSTRAINT "reorder_setting_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom_location_map" ADD CONSTRAINT "product_bom_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image_location_map" ADD CONSTRAINT "product_image_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option_location_map" ADD CONSTRAINT "product_group_option_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option_value_location_map" ADD CONSTRAINT "product_group_option_value_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_location_map_extended" ADD CONSTRAINT "team_member_location_map_extended_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_location_map" ADD CONSTRAINT "customer_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_due_location_map" ADD CONSTRAINT "customer_due_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_balance_location_map" ADD CONSTRAINT "customer_balance_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credit_location_map" ADD CONSTRAINT "customer_credit_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_location_map" ADD CONSTRAINT "vendor_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_attachment_location_map" ADD CONSTRAINT "vendor_attachment_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_item_location_map" ADD CONSTRAINT "vendor_item_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_due_location_map" ADD CONSTRAINT "vendor_due_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_balance_location_map" ADD CONSTRAINT "vendor_balance_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_credit_location_map" ADD CONSTRAINT "vendor_credit_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxing_scheme_location_map" ADD CONSTRAINT "taxing_scheme_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_code_location_map" ADD CONSTRAINT "tax_code_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_location_map" ADD CONSTRAINT "currency_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_scheme_location_map" ADD CONSTRAINT "pricing_scheme_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_term_location_map" ADD CONSTRAINT "payment_term_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_location_map" ADD CONSTRAINT "sales_order_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_location_map" ADD CONSTRAINT "purchase_order_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

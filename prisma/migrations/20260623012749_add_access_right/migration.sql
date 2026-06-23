/*
  Warnings:

  - Changed the type of `rightName` on the `team_member_access_right` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AccessRight" AS ENUM ('SalesOrderView', 'SalesOrderEdit', 'SalesOrderPick', 'SalesOrderPrioritization', 'CustomerView', 'CustomerEdit', 'SalesPriceEdit', 'PurchaseOrderView', 'PurchaseOrderEdit', 'PurchaseOrderReceive', 'VendorView', 'VendorEdit', 'ReorderStock', 'CountSheetView', 'CountSheetEdit', 'CountSheetOnly', 'TransferStockView', 'TransferStockEdit', 'AdjustStockView', 'AdjustStockEdit', 'CurrentStockView', 'MovementHistoryView', 'ProductView', 'ProductEdit', 'ProductCostingView', 'ProductCostingEdit', 'ProductCategoryEdit', 'ManufacturingOrderView', 'ManufacturingOrderEdit', 'ManufacturingOrderPrioritization', 'StockroomScanView', 'StockroomScanEdit', 'EstimatedLaborHoursView', 'EstimatedLaborHoursEdit', 'ActualLaborHoursView', 'ActualLaborHoursEdit', 'CurrentOperationsView', 'CurrentOperationsEdit', 'SettingsView', 'SettingsEdit', 'ImportData', 'ExportData', 'BackupData', 'PrintSettingsView', 'PrintSettingsEdit', 'ResetAllData', 'Integrations', 'Reports');

-- AlterTable
ALTER TABLE "team_member_access_right" DROP COLUMN "rightName",
ADD COLUMN     "rightName" "AccessRight" NOT NULL;

-- CreateIndex
CREATE INDEX "team_member_access_right_rightName_idx" ON "team_member_access_right"("rightName");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_access_right_teamMemberId_rightName_key" ON "team_member_access_right"("teamMemberId", "rightName");

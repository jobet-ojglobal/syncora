-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Admin', 'StoreManager', 'Customer', 'InventoryClerk', 'SalesAssociate', 'Cashier', 'WarehouseStaff', 'Auditor', 'SupportStaff');

-- CreateEnum
CREATE TYPE "ProductPriceType" AS ENUM ('fixedPrice', 'markup', 'margin');

-- CreateEnum
CREATE TYPE "UomCategory" AS ENUM ('COUNT', 'WEIGHT', 'VOLUME', 'LENGTH', 'AREA');

-- CreateEnum
CREATE TYPE "InventoryAdjustmentReason" AS ENUM ('STOCK_COUNT', 'DAMAGE', 'LOSS', 'THEFT', 'EXPIRED', 'RETURN', 'CORRECTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'PURCHASE', 'SALE', 'RETURN');

-- CreateEnum
CREATE TYPE "TransferOrderStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccessRight" AS ENUM ('SalesOrderView', 'SalesOrderEdit', 'SalesOrderPick', 'SalesOrderPrioritization', 'CustomerView', 'CustomerEdit', 'SalesPriceEdit', 'PurchaseOrderView', 'PurchaseOrderEdit', 'PurchaseOrderReceive', 'VendorView', 'VendorEdit', 'ReorderStock', 'CountSheetView', 'CountSheetEdit', 'CountSheetOnly', 'TransferStockView', 'TransferStockEdit', 'AdjustStockView', 'AdjustStockEdit', 'CurrentStockView', 'MovementHistoryView', 'ProductView', 'ProductEdit', 'ProductCostingView', 'ProductCostingEdit', 'ProductCategoryEdit', 'ManufacturingOrderView', 'ManufacturingOrderEdit', 'ManufacturingOrderPrioritization', 'StockroomScanView', 'StockroomScanEdit', 'EstimatedLaborHoursView', 'EstimatedLaborHoursEdit', 'ActualLaborHoursView', 'ActualLaborHoursEdit', 'CurrentOperationsView', 'CurrentOperationsEdit', 'SettingsView', 'SettingsEdit', 'ImportData', 'ExportData', 'BackupData', 'PrintSettingsView', 'PrintSettingsEdit', 'ResetAllData', 'Integrations', 'Reports');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('Commercial', 'Residential');

-- CreateEnum
CREATE TYPE "CurrencyNegativeType" AS ENUM ('Leading', 'Trailing', 'Parentheses');

-- CreateTable
CREATE TABLE "sync_job" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inflow_webhook" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "consecutiveFailureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inflow_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inflow_webhook_event" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inflow_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_webhook" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "consecutiveFailureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_webhook_event" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'Customer',
    "teamMemberId" TEXT,
    "inflowCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_location_map" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "category_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_group" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "brandId" TEXT,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_group_location_map" (
    "id" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_group_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "defaultPrice" DECIMAL(18,5) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "signature" TEXT NOT NULL,
    "variantCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant_location_map" (
    "id" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_variant_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "itemType" TEXT,
    "autoAssemble" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isManufacturable" BOOLEAN NOT NULL DEFAULT false,
    "includeQuantityBuildable" BOOLEAN NOT NULL DEFAULT false,
    "standardUomName" TEXT,
    "trackExpiry" BOOLEAN NOT NULL DEFAULT false,
    "trackLots" BOOLEAN NOT NULL DEFAULT false,
    "trackSerials" BOOLEAN NOT NULL DEFAULT false,
    "shelfLifeDays" INTEGER,
    "sellBeforeExpiryDays" INTEGER,
    "expiryNotificationDays" INTEGER,
    "weight" DECIMAL(12,4),
    "width" DECIMAL(12,4),
    "height" DECIMAL(12,4),
    "length" DECIMAL(12,4),
    "originCountry" TEXT,
    "hsTariffNumber" TEXT,
    "remarks" TEXT,
    "lastVendorId" TEXT,
    "lastModifiedById" TEXT,
    "createdDttm" TIMESTAMP(3),
    "lastModifiedDateTime" TIMESTAMP(3),
    "brandId" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_location_map" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "pricingSchemeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceType" "ProductPriceType" NOT NULL,
    "unitPrice" DECIMAL(18,5),
    "fixedMarkup" DECIMAL(18,5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_location_map" (
    "id" TEXT NOT NULL,
    "productPriceId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_price_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cost_adjustment" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lastModifiedById" TEXT,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "serial" TEXT,
    "unitCost" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_cost_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cost_adjustment_location_map" (
    "id" TEXT NOT NULL,
    "productCostAdjustmentId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_cost_adjustment_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_barcode" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "lineNum" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_barcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_barcode_location_map" (
    "id" TEXT NOT NULL,
    "productBarcodeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_barcode_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_operation" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "operationTypeId" TEXT NOT NULL,
    "lineNum" INTEGER NOT NULL,
    "cost" DECIMAL(12,4) NOT NULL,
    "estimatedPerHourCost" DECIMAL(12,4) NOT NULL,
    "estimatedSeconds" DECIMAL(12,4) NOT NULL,
    "instructions" TEXT,
    "trackTime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_operation_location_map" (
    "id" TEXT NOT NULL,
    "productOperationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_operation_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_type" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedPerHourCost" DECIMAL(12,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "trackTime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_type_location_map" (
    "id" TEXT NOT NULL,
    "operationTypeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "operation_type_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tax_code" (
    "id" TEXT NOT NULL,
    "productTaxCodeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "taxCodeId" TEXT NOT NULL,
    "taxingSchemeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_tax_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attachment" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attachmentUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "lastModDttm" TIMESTAMP(3),
    "lastModifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attachment_location_map" (
    "id" TEXT NOT NULL,
    "productAttachmentId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_attachment_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cost" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cost" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_cost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cost_location_map" (
    "id" TEXT NOT NULL,
    "productCostId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_cost_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reorder_setting" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "vendorId" TEXT,
    "defaultSublocation" TEXT,
    "enableReordering" BOOLEAN NOT NULL DEFAULT true,
    "reorderMethod" TEXT NOT NULL DEFAULT 'PurchaseOrder',
    "reorderPoint" DECIMAL(12,4) NOT NULL,
    "reorderQuantity" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reorder_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_setting_location_map" (
    "id" TEXT NOT NULL,
    "reorderSettingId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "reorder_setting_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bom" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "childProductId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_bom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bom_location_map" (
    "id" TEXT NOT NULL,
    "productBomId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_bom_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_uom" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "uomId" TEXT NOT NULL,
    "standardQuantity" DECIMAL(18,4) NOT NULL,
    "uomQuantity" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "product_uom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sales_uom" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "uomId" TEXT NOT NULL,
    "standardQuantity" DECIMAL(18,4) NOT NULL,
    "uomQuantity" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "product_sales_uom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_of_measure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "UomCategory" NOT NULL,
    "baseFactor" DECIMAL(18,6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_conversion" (
    "id" TEXT NOT NULL,
    "fromUomId" TEXT NOT NULL,
    "toUomId" TEXT NOT NULL,
    "factor" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "unit_conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_image" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "groupId" TEXT,
    "productId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "largeUrl" TEXT,
    "mediumUncroppedUrl" TEXT,
    "mediumUrl" TEXT,
    "originalUrl" TEXT,
    "smallUrl" TEXT,
    "thumbUrl" TEXT,

    CONSTRAINT "product_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_image_location_map" (
    "id" TEXT NOT NULL,
    "productImageId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_image_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeValue" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "hexCode" TEXT,
    "attributeId" TEXT NOT NULL,

    CONSTRAINT "AttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant_selection" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "optionValueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variant_selection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_group_option" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "lineNum" INTEGER NOT NULL,
    "attributeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_group_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_group_option_location_map" (
    "id" TEXT NOT NULL,
    "productGroupOptionId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_group_option_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_group_option_value" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "lineNum" INTEGER NOT NULL,
    "attributeValueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_group_option_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_group_option_value_location_map" (
    "id" TEXT NOT NULL,
    "productGroupOptionValueId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "product_group_option_value_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_value" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "feature_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_feature" (
    "groupId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "featureValueId" TEXT NOT NULL,

    CONSTRAINT "group_feature_pkey" PRIMARY KEY ("groupId","featureId")
);

-- CreateTable
CREATE TABLE "product_feature" (
    "productId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "featureValueId" TEXT NOT NULL,

    CONSTRAINT "product_feature_pkey" PRIMARY KEY ("productId","featureId")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_tag" (
    "groupId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "group_tag_pkey" PRIMARY KEY ("groupId","tagId")
);

-- CreateTable
CREATE TABLE "product_tag" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "product_tag_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "location" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_address" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "remarks" TEXT,
    "addressType" TEXT,

    CONSTRAINT "location_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sublocation" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sublocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_webhook" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "consecutiveFailureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_webhook_event" (
    "id" TEXT NOT NULL,
    "locationWebhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "errorMessage" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(18,4) NOT NULL,
    "quantityAvailable" DECIMAL(18,4),
    "quantityReserved" DECIMAL(18,4),
    "reorderThreshold" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "reorderQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "isAutoReorderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "preferredSourceLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_bin" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sublocationId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_bin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustment" (
    "id" TEXT NOT NULL,
    "adjustmentNumber" TEXT NOT NULL,
    "reason" "InventoryAdjustmentReason" NOT NULL,
    "notes" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustment_line" (
    "id" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sublocationId" TEXT,
    "quantityBefore" DECIMAL(18,4) NOT NULL,
    "quantityAdjusted" DECIMAL(18,4) NOT NULL,
    "quantityAfter" DECIMAL(18,4) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustment_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjustment_reason" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "adjustment_reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjustment_reason_location_map" (
    "id" TEXT NOT NULL,
    "adjustmentReasonId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "adjustment_reason_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLedger" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sublocationId" TEXT,
    "transactionType" "InventoryTransactionType" NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "quantityChange" DECIMAL(18,4) NOT NULL,
    "quantityBefore" DECIMAL(18,4) NOT NULL,
    "quantityAfter" DECIMAL(18,4) NOT NULL,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "targetLocationId" TEXT NOT NULL,
    "status" "TransferOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "transferredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order_line" (
    "id" TEXT NOT NULL,
    "transferOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceSublocationId" TEXT,
    "targetSublocationId" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_order_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canBeSalesRep" BOOLEAN NOT NULL DEFAULT false,
    "accessAllLocations" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member_location_map_extended" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "team_member_location_map_extended_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member_access_right" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "rightName" "AccessRight" NOT NULL,

    CONSTRAINT "team_member_access_right_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member_location" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "locationInflowId" TEXT NOT NULL,

    CONSTRAINT "team_member_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "website" TEXT,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "business_partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_partner_address" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT,
    "localId" SERIAL,
    "businessPartnerId" TEXT NOT NULL,
    "name" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "remarks" TEXT,
    "addressType" "AddressType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "business_partner_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "businessPartnerId" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "taxExemptNumber" TEXT,
    "defaultCarrier" TEXT,
    "defaultPaymentMethod" TEXT,
    "discount" DECIMAL(10,2),
    "defaultLocationId" TEXT,
    "defaultPaymentTermsId" TEXT,
    "pricingSchemeId" TEXT,
    "taxingSchemeId" TEXT,
    "defaultSalesRepTeamMemberId" TEXT,
    "lastModifiedById" TEXT,
    "lastModifiedDttm" TIMESTAMP(3),
    "defaultBillingAddressId" TEXT,
    "defaultShippingAddressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_location_map" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "customer_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_due" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "amountCurrent" DECIMAL(18,5) NOT NULL,
    "amount1To30" DECIMAL(18,5) NOT NULL,
    "amount31To60" DECIMAL(18,5) NOT NULL,
    "amount61Plus" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_due_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_due_location_map" (
    "id" TEXT NOT NULL,
    "customerDueId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "customer_due_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_balance" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "balance" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_balance_location_map" (
    "id" TEXT NOT NULL,
    "customerBalanceId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "customer_balance_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_credit" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "credit" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_credit_location_map" (
    "id" TEXT NOT NULL,
    "customerCreditId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "customer_credit_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "businessPartnerId" TEXT NOT NULL,
    "defaultCarrier" TEXT,
    "defaultPaymentMethod" TEXT,
    "discount" DECIMAL(10,2),
    "isTaxInclusivePricing" BOOLEAN NOT NULL DEFAULT false,
    "leadTimeDays" INTEGER,
    "currencyId" TEXT,
    "defaultAddressId" TEXT,
    "defaultPaymentTermsId" TEXT,
    "taxingSchemeId" TEXT,
    "lastModifiedById" TEXT,
    "lastModifiedDttm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_location_map" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "vendor_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_attachment" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "contentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_attachment_location_map" (
    "id" TEXT NOT NULL,
    "vendorAttachmentId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "vendor_attachment_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_item" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorSku" TEXT,
    "unitCost" DECIMAL(18,5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_item_location_map" (
    "id" TEXT NOT NULL,
    "vendorItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "vendor_item_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_due" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "amountCurrent" DECIMAL(18,5) NOT NULL,
    "amount1To30" DECIMAL(18,5) NOT NULL,
    "amount31To60" DECIMAL(18,5) NOT NULL,
    "amount61Plus" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_due_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_due_location_map" (
    "id" TEXT NOT NULL,
    "vendorDueId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "vendor_due_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_balance" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "balance" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_balance_location_map" (
    "id" TEXT NOT NULL,
    "vendorBalanceId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "vendor_balance_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_credit" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "credit" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_credit_location_map" (
    "id" TEXT NOT NULL,
    "vendorCreditId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "vendor_credit_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxing_scheme" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "calculateTax2OnTax1" BOOLEAN NOT NULL DEFAULT false,
    "tax1Name" TEXT,
    "tax1OnShipping" BOOLEAN NOT NULL DEFAULT false,
    "tax2Name" TEXT,
    "tax2OnShipping" BOOLEAN NOT NULL DEFAULT false,
    "defaultTaxCodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "taxing_scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_code" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "taxingSchemeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tax1Rate" DECIMAL(10,4),
    "tax2Rate" DECIMAL(10,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tax_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxing_scheme_location_map" (
    "id" TEXT NOT NULL,
    "taxingSchemeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "taxing_scheme_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_code_location_map" (
    "id" TEXT NOT NULL,
    "taxCodeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "tax_code_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "symbol" TEXT,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "decimalSeparator" TEXT,
    "thousandsSeparator" TEXT,
    "isSymbolFirst" BOOLEAN NOT NULL DEFAULT true,
    "negativeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_location_map" (
    "id" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "currency_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_conversion" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "exchangeRate" DECIMAL(18,8) NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_scheme" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isTaxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pricing_scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_scheme_location_map" (
    "id" TEXT NOT NULL,
    "pricingSchemeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "pricing_scheme_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_terms" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysDue" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_term_location_map" (
    "id" TEXT NOT NULL,
    "paymentTermId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "payment_term_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "localId" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "poNumber" TEXT,
    "externalId" TEXT,
    "source" TEXT,
    "subTotal" DECIMAL(18,5) NOT NULL,
    "total" DECIMAL(18,5) NOT NULL,
    "amountPaid" DECIMAL(18,5) NOT NULL,
    "balance" DECIMAL(18,5) NOT NULL,
    "orderFreight" DECIMAL(18,5) NOT NULL,
    "returnFee" DECIMAL(18,5) NOT NULL,
    "returnFreight" DECIMAL(18,5) NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "exchangeRateAutoPulled" TIMESTAMP(3),
    "paymentStatus" TEXT NOT NULL,
    "inventoryStatus" TEXT NOT NULL,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isFullyPicked" BOOLEAN NOT NULL DEFAULT false,
    "isInvoiced" BOOLEAN NOT NULL DEFAULT false,
    "isPicking" BOOLEAN NOT NULL DEFAULT false,
    "isPrioritized" BOOLEAN NOT NULL DEFAULT false,
    "isQuote" BOOLEAN NOT NULL DEFAULT false,
    "isTaxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "needsConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "orderDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "invoicedDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "requestedShipDate" TIMESTAMP(3),
    "shippedDate" TIMESTAMP(3),
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "orderRemarks" TEXT,
    "packRemarks" TEXT,
    "pickRemarks" TEXT,
    "restockRemarks" TEXT,
    "returnRemarks" TEXT,
    "shipRemarks" TEXT,
    "shipToCompanyName" TEXT,
    "showShipping" BOOLEAN NOT NULL DEFAULT true,
    "billingAddress" JSONB,
    "shippingAddress" JSONB,
    "customFields" JSONB,
    "nonCustomerCost" JSONB,
    "sameBillingAndShipping" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT NOT NULL,
    "locationId" TEXT,
    "assignedToTeamMemberId" TEXT,
    "confirmerTeamMemberId" TEXT,
    "salesRepTeamMemberId" TEXT,
    "salesRep" TEXT,
    "paymentTermsId" TEXT,
    "pricingSchemeId" TEXT,
    "taxingSchemeId" TEXT,
    "currencyId" TEXT,
    "lastModifiedById" TEXT,
    "calculateTax2OnTax1" BOOLEAN NOT NULL DEFAULT false,
    "tax1" DECIMAL(18,5) NOT NULL,
    "tax1Name" TEXT,
    "tax1OnShipping" BOOLEAN NOT NULL DEFAULT false,
    "tax1Rate" DECIMAL(18,5) NOT NULL,
    "tax2" DECIMAL(18,5) NOT NULL,
    "tax2Name" TEXT,
    "tax2OnShipping" BOOLEAN NOT NULL DEFAULT false,
    "tax2Rate" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sales_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_location_map" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "sales_order_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_line" (
    "salesOrderLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT,
    "unitPrice" DECIMAL(18,5) NOT NULL,
    "subTotal" DECIMAL(18,5) NOT NULL,
    "discount" JSONB,
    "isDiscarded" BOOLEAN NOT NULL DEFAULT false,
    "serviceCompleted" BOOLEAN,
    "returnDate" TIMESTAMP(3),
    "quantity" JSONB NOT NULL,
    "tax1Rate" DECIMAL(18,5) NOT NULL,
    "tax2Rate" DECIMAL(18,5) NOT NULL,
    "taxCodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_order_line_pkey" PRIMARY KEY ("salesOrderLineId")
);

-- CreateTable
CREATE TABLE "sales_order_pack_line" (
    "salesOrderPackLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "containerNumber" TEXT,
    "description" TEXT,
    "quantity" JSONB NOT NULL,

    CONSTRAINT "sales_order_pack_line_pkey" PRIMARY KEY ("salesOrderPackLineId")
);

-- CreateTable
CREATE TABLE "sales_order_pick_line" (
    "salesOrderPickLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lineNum" TEXT,
    "locationId" TEXT,
    "sublocation" TEXT,
    "pickDate" TIMESTAMP(3),
    "description" TEXT,
    "quantity" JSONB NOT NULL,

    CONSTRAINT "sales_order_pick_line_pkey" PRIMARY KEY ("salesOrderPickLineId")
);

-- CreateTable
CREATE TABLE "sales_order_pick_allocation_line" (
    "salesOrderPickAllocationLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lineNum" TEXT,
    "locationId" TEXT,
    "sublocation" TEXT,
    "quantity" JSONB NOT NULL,

    CONSTRAINT "sales_order_pick_allocation_line_pkey" PRIMARY KEY ("salesOrderPickAllocationLineId")
);

-- CreateTable
CREATE TABLE "sales_order_pick_allocation_failure" (
    "salesOrderPickAllocationFailureId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lineNum" TEXT,
    "hasExpiredLotsInStock" BOOLEAN NOT NULL DEFAULT false,
    "quantity" JSONB NOT NULL,

    CONSTRAINT "sales_order_pick_allocation_failure_pkey" PRIMARY KEY ("salesOrderPickAllocationFailureId")
);

-- CreateTable
CREATE TABLE "sales_order_restock_line" (
    "salesOrderRestockLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT,
    "locationId" TEXT,
    "sublocation" TEXT,
    "restockDate" TIMESTAMP(3),
    "quantity" JSONB NOT NULL,

    CONSTRAINT "sales_order_restock_line_pkey" PRIMARY KEY ("salesOrderRestockLineId")
);

-- CreateTable
CREATE TABLE "sales_order_ship_line" (
    "salesOrderShipLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "shippedDate" TIMESTAMP(3),
    "easyPostShipmentId" TEXT,
    "easyPostShipmentStatus" TEXT,
    "easyPostConfirmationEmailAddress" TEXT,
    "containers" JSONB,

    CONSTRAINT "sales_order_ship_line_pkey" PRIMARY KEY ("salesOrderShipLineId")
);

-- CreateTable
CREATE TABLE "sales_order_payment_line" (
    "salesOrderPaymentHistoryLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "lineNum" INTEGER NOT NULL,
    "amount" DECIMAL(18,5) NOT NULL,
    "datePaid" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentType" TEXT,
    "referenceNumber" TEXT,
    "remarks" TEXT,

    CONSTRAINT "sales_order_payment_line_pkey" PRIMARY KEY ("salesOrderPaymentHistoryLineId")
);

-- CreateTable
CREATE TABLE "cost_of_goods_sold" (
    "salesOrderCostOfGoodsSoldId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "costOfGoodsSold" DECIMAL(18,5) NOT NULL,

    CONSTRAINT "cost_of_goods_sold_pkey" PRIMARY KEY ("salesOrderCostOfGoodsSoldId")
);

-- CreateTable
CREATE TABLE "sales_order_attachment" (
    "attachmentId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "attachmentUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" JSONB,
    "lastModDttm" TIMESTAMP(3),
    "lastModifiedById" TEXT,

    CONSTRAINT "sales_order_attachment_pkey" PRIMARY KEY ("attachmentId")
);

-- CreateTable
CREATE TABLE "purchase_order" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "vendorOrderNumber" TEXT,
    "subTotal" DECIMAL(18,5) NOT NULL,
    "total" DECIMAL(18,5) NOT NULL,
    "amountPaid" DECIMAL(18,5) NOT NULL,
    "balance" DECIMAL(18,5) NOT NULL,
    "freight" DECIMAL(18,5) NOT NULL,
    "returnFee" DECIMAL(18,5) NOT NULL,
    "returnExtra" DECIMAL(18,5) NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "exchangeRateAutoPulled" TIMESTAMP(3),
    "paymentStatus" TEXT NOT NULL,
    "inventoryStatus" TEXT NOT NULL,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isQuote" BOOLEAN NOT NULL DEFAULT false,
    "isTaxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "showShipping" BOOLEAN NOT NULL DEFAULT true,
    "carrier" TEXT,
    "orderDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "requestShipDate" TIMESTAMP(3),
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "orderRemarks" TEXT,
    "receiveRemarks" TEXT,
    "returnRemarks" TEXT,
    "unstockRemarks" TEXT,
    "shipToCompanyName" TEXT,
    "shipToAddress" JSONB,
    "vendorAddress" JSONB,
    "customFields" JSONB,
    "nonVendorCosts" JSONB,
    "vendorId" TEXT NOT NULL,
    "locationId" TEXT,
    "assignedToTeamMemberId" TEXT,
    "approverTeamMemberId" TEXT,
    "lastModifiedById" TEXT,
    "currencyId" TEXT,
    "paymentTermsId" TEXT,
    "taxingSchemeId" TEXT,
    "calculateTax2OnTax1" BOOLEAN NOT NULL DEFAULT false,
    "tax1" DECIMAL(18,5) NOT NULL,
    "tax1Name" TEXT,
    "tax1OnShipping" BOOLEAN NOT NULL DEFAULT false,
    "tax1Rate" DECIMAL(18,5) NOT NULL,
    "tax2" DECIMAL(18,5) NOT NULL,
    "tax2Name" TEXT,
    "tax2OnShipping" BOOLEAN NOT NULL DEFAULT false,
    "tax2Rate" DECIMAL(18,5) NOT NULL,

    CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_location_map" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localId" INTEGER NOT NULL,

    CONSTRAINT "purchase_order_location_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_line" (
    "purchaseOrderLineId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorItemCode" TEXT,
    "description" TEXT,
    "unitPrice" DECIMAL(18,5) NOT NULL,
    "subTotal" DECIMAL(18,5) NOT NULL,
    "discount" JSONB,
    "serviceCompleted" BOOLEAN NOT NULL DEFAULT false,
    "returnDate" TIMESTAMP(3),
    "quantity" JSONB NOT NULL,
    "productHeight" DECIMAL(10,4),
    "productLength" DECIMAL(10,4),
    "productWidth" DECIMAL(10,4),
    "productWeight" DECIMAL(10,4),
    "tax1Rate" DECIMAL(18,5) NOT NULL,
    "tax2Rate" DECIMAL(18,5) NOT NULL,
    "taxCodeId" TEXT,

    CONSTRAINT "purchase_order_line_pkey" PRIMARY KEY ("purchaseOrderLineId")
);

-- CreateTable
CREATE TABLE "purchase_order_receive_line" (
    "purchaseOrderReceiveLineId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT,
    "sublocation" TEXT,
    "receiveDate" TIMESTAMP(3),
    "description" TEXT,
    "vendorItemCode" TEXT,
    "quantity" JSONB NOT NULL,
    "productHeight" DECIMAL(10,4),
    "productLength" DECIMAL(10,4),
    "productWidth" DECIMAL(10,4),
    "productWeight" DECIMAL(10,4),

    CONSTRAINT "purchase_order_receive_line_pkey" PRIMARY KEY ("purchaseOrderReceiveLineId")
);

-- CreateTable
CREATE TABLE "purchase_order_unstock_line" (
    "purchaseOrderUnstockLineId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT,
    "sublocation" TEXT,
    "unstockDate" TIMESTAMP(3),
    "description" TEXT,
    "vendorItemCode" TEXT,
    "quantity" JSONB NOT NULL,

    CONSTRAINT "purchase_order_unstock_line_pkey" PRIMARY KEY ("purchaseOrderUnstockLineId")
);

-- CreateTable
CREATE TABLE "purchase_order_payment_line" (
    "purchaseOrderPaymentHistoryLineId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "amount" DECIMAL(18,5) NOT NULL,
    "datePaid" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentType" TEXT,
    "referenceNumber" TEXT,
    "remarks" TEXT,

    CONSTRAINT "purchase_order_payment_line_pkey" PRIMARY KEY ("purchaseOrderPaymentHistoryLineId")
);

-- CreateTable
CREATE TABLE "purchase_order_attachment" (
    "attachmentId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "attachmentUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" JSONB,
    "lastModDttm" TIMESTAMP(3),
    "lastModifiedById" TEXT,

    CONSTRAINT "purchase_order_attachment_pkey" PRIMARY KEY ("attachmentId")
);

-- CreateIndex
CREATE INDEX "sync_job_status_idx" ON "sync_job"("status");

-- CreateIndex
CREATE INDEX "sync_job_createdAt_idx" ON "sync_job"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inflow_webhook_url_key" ON "inflow_webhook"("url");

-- CreateIndex
CREATE INDEX "inflow_webhook_event_eventType_idx" ON "inflow_webhook_event"("eventType");

-- CreateIndex
CREATE INDEX "inflow_webhook_event_receivedAt_idx" ON "inflow_webhook_event"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_webhook_url_key" ON "partner_webhook"("url");

-- CreateIndex
CREATE INDEX "partner_webhook_event_eventType_idx" ON "partner_webhook_event"("eventType");

-- CreateIndex
CREATE INDEX "partner_webhook_event_receivedAt_idx" ON "partner_webhook_event"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_teamMemberId_key" ON "user"("teamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "user_inflowCustomerId_key" ON "user"("inflowCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "brand_name_key" ON "brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "category_inflowId_key" ON "category"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "category_location_map_locationId_localId_idx" ON "category_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "category_location_map_categoryId_locationId_key" ON "category_location_map"("categoryId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_inflowId_key" ON "product_group"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_slug_key" ON "product_group"("slug");

-- CreateIndex
CREATE INDEX "product_group_location_map_locationId_localId_idx" ON "product_group_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_location_map_productGroupId_locationId_key" ON "product_group_location_map"("productGroupId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_inflowId_key" ON "product_variant"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_productId_key" ON "product_variant"("productId");

-- CreateIndex
CREATE INDEX "product_variant_productGroupId_idx" ON "product_variant"("productGroupId");

-- CreateIndex
CREATE INDEX "product_variant_productId_idx" ON "product_variant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_productGroupId_productId_key" ON "product_variant"("productGroupId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_productGroupId_signature_key" ON "product_variant"("productGroupId", "signature");

-- CreateIndex
CREATE INDEX "product_variant_location_map_locationId_localId_idx" ON "product_variant_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_location_map_productVariantId_locationId_key" ON "product_variant_location_map"("productVariantId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_inflowId_key" ON "product"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX "product_location_map_locationId_localId_idx" ON "product_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_location_map_productId_locationId_key" ON "product_location_map"("productId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_price_inflowId_key" ON "product_price"("inflowId");

-- CreateIndex
CREATE INDEX "product_price_pricingSchemeId_idx" ON "product_price"("pricingSchemeId");

-- CreateIndex
CREATE INDEX "product_price_productId_idx" ON "product_price"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_price_pricingSchemeId_productId_key" ON "product_price"("pricingSchemeId", "productId");

-- CreateIndex
CREATE INDEX "product_price_location_map_locationId_localId_idx" ON "product_price_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_price_location_map_productPriceId_locationId_key" ON "product_price_location_map"("productPriceId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_cost_adjustment_inflowId_key" ON "product_cost_adjustment"("inflowId");

-- CreateIndex
CREATE INDEX "product_cost_adjustment_productId_idx" ON "product_cost_adjustment"("productId");

-- CreateIndex
CREATE INDEX "product_cost_adjustment_lastModifiedById_idx" ON "product_cost_adjustment"("lastModifiedById");

-- CreateIndex
CREATE INDEX "product_cost_adjustment_dateTime_idx" ON "product_cost_adjustment"("dateTime");

-- CreateIndex
CREATE INDEX "product_cost_adjustment_location_map_locationId_localId_idx" ON "product_cost_adjustment_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_cost_adjustment_location_map_productCostAdjustmentI_key" ON "product_cost_adjustment_location_map"("productCostAdjustmentId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_inflowId_key" ON "product_barcode"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_barcode_key" ON "product_barcode"("barcode");

-- CreateIndex
CREATE INDEX "product_barcode_productId_idx" ON "product_barcode"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_productId_lineNum_key" ON "product_barcode"("productId", "lineNum");

-- CreateIndex
CREATE INDEX "product_barcode_location_map_locationId_localId_idx" ON "product_barcode_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_location_map_productBarcodeId_locationId_key" ON "product_barcode_location_map"("productBarcodeId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_operation_inflowId_key" ON "product_operation"("inflowId");

-- CreateIndex
CREATE INDEX "product_operation_productId_idx" ON "product_operation"("productId");

-- CreateIndex
CREATE INDEX "product_operation_operationTypeId_idx" ON "product_operation"("operationTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "product_operation_productId_lineNum_key" ON "product_operation"("productId", "lineNum");

-- CreateIndex
CREATE INDEX "product_operation_location_map_locationId_localId_idx" ON "product_operation_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_operation_location_map_productOperationId_locationI_key" ON "product_operation_location_map"("productOperationId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "operation_type_inflowId_key" ON "operation_type"("inflowId");

-- CreateIndex
CREATE INDEX "operation_type_location_map_locationId_localId_idx" ON "operation_type_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "operation_type_location_map_operationTypeId_locationId_key" ON "operation_type_location_map"("operationTypeId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_tax_code_productTaxCodeId_key" ON "product_tax_code"("productTaxCodeId");

-- CreateIndex
CREATE INDEX "product_tax_code_productId_idx" ON "product_tax_code"("productId");

-- CreateIndex
CREATE INDEX "product_tax_code_taxCodeId_idx" ON "product_tax_code"("taxCodeId");

-- CreateIndex
CREATE INDEX "product_tax_code_taxingSchemeId_idx" ON "product_tax_code"("taxingSchemeId");

-- CreateIndex
CREATE UNIQUE INDEX "product_tax_code_productId_taxCodeId_key" ON "product_tax_code"("productId", "taxCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "product_attachment_inflowId_key" ON "product_attachment"("inflowId");

-- CreateIndex
CREATE INDEX "product_attachment_productId_idx" ON "product_attachment"("productId");

-- CreateIndex
CREATE INDEX "product_attachment_lastModifiedById_idx" ON "product_attachment"("lastModifiedById");

-- CreateIndex
CREATE INDEX "product_attachment_location_map_locationId_localId_idx" ON "product_attachment_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_attachment_location_map_productAttachmentId_locatio_key" ON "product_attachment_location_map"("productAttachmentId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_cost_inflowId_key" ON "product_cost"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_cost_productId_key" ON "product_cost"("productId");

-- CreateIndex
CREATE INDEX "product_cost_location_map_locationId_localId_idx" ON "product_cost_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_cost_location_map_productCostId_locationId_key" ON "product_cost_location_map"("productCostId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_reorder_setting_inflowId_key" ON "product_reorder_setting"("inflowId");

-- CreateIndex
CREATE INDEX "product_reorder_setting_productId_idx" ON "product_reorder_setting"("productId");

-- CreateIndex
CREATE INDEX "product_reorder_setting_locationId_idx" ON "product_reorder_setting"("locationId");

-- CreateIndex
CREATE INDEX "product_reorder_setting_fromLocationId_idx" ON "product_reorder_setting"("fromLocationId");

-- CreateIndex
CREATE INDEX "product_reorder_setting_vendorId_idx" ON "product_reorder_setting"("vendorId");

-- CreateIndex
CREATE INDEX "reorder_setting_location_map_locationId_localId_idx" ON "reorder_setting_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "reorder_setting_location_map_reorderSettingId_locationId_key" ON "reorder_setting_location_map"("reorderSettingId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_bom_inflowId_key" ON "product_bom"("inflowId");

-- CreateIndex
CREATE INDEX "product_bom_productId_idx" ON "product_bom"("productId");

-- CreateIndex
CREATE INDEX "product_bom_childProductId_idx" ON "product_bom"("childProductId");

-- CreateIndex
CREATE UNIQUE INDEX "product_bom_productId_childProductId_key" ON "product_bom"("productId", "childProductId");

-- CreateIndex
CREATE INDEX "product_bom_location_map_locationId_localId_idx" ON "product_bom_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_bom_location_map_productBomId_locationId_key" ON "product_bom_location_map"("productBomId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_uom_productId_key" ON "product_uom"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_sales_uom_productId_key" ON "product_sales_uom"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "unit_of_measure_code_key" ON "unit_of_measure"("code");

-- CreateIndex
CREATE UNIQUE INDEX "unit_conversion_fromUomId_toUomId_key" ON "unit_conversion"("fromUomId", "toUomId");

-- CreateIndex
CREATE UNIQUE INDEX "product_image_inflowId_key" ON "product_image"("inflowId");

-- CreateIndex
CREATE INDEX "product_image_groupId_position_idx" ON "product_image"("groupId", "position");

-- CreateIndex
CREATE INDEX "product_image_productId_position_idx" ON "product_image"("productId", "position");

-- CreateIndex
CREATE INDEX "product_image_location_map_locationId_localId_idx" ON "product_image_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_image_location_map_productImageId_locationId_key" ON "product_image_location_map"("productImageId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_name_key" ON "attribute"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeValue_attributeId_value_key" ON "AttributeValue"("attributeId", "value");

-- CreateIndex
CREATE INDEX "product_variant_selection_variantId_idx" ON "product_variant_selection"("variantId");

-- CreateIndex
CREATE INDEX "product_variant_selection_optionId_idx" ON "product_variant_selection"("optionId");

-- CreateIndex
CREATE INDEX "product_variant_selection_optionValueId_idx" ON "product_variant_selection"("optionValueId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_selection_variantId_optionId_key" ON "product_variant_selection"("variantId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_inflowId_key" ON "product_group_option"("inflowId");

-- CreateIndex
CREATE INDEX "product_group_option_productGroupId_idx" ON "product_group_option"("productGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_productGroupId_attributeId_key" ON "product_group_option"("productGroupId", "attributeId");

-- CreateIndex
CREATE INDEX "product_group_option_location_map_locationId_localId_idx" ON "product_group_option_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_location_map_productGroupOptionId_loca_key" ON "product_group_option_location_map"("productGroupOptionId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_value_inflowId_key" ON "product_group_option_value"("inflowId");

-- CreateIndex
CREATE INDEX "product_group_option_value_optionId_idx" ON "product_group_option_value"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_value_optionId_attributeValueId_key" ON "product_group_option_value"("optionId", "attributeValueId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_value_optionId_lineNum_key" ON "product_group_option_value"("optionId", "lineNum");

-- CreateIndex
CREATE INDEX "product_group_option_value_location_map_locationId_localId_idx" ON "product_group_option_value_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_value_location_map_productGroupOptionV_key" ON "product_group_option_value_location_map"("productGroupOptionValueId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_name_key" ON "feature"("name");

-- CreateIndex
CREATE UNIQUE INDEX "feature_value_featureId_value_key" ON "feature_value"("featureId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "tag_name_key" ON "tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "location_inflowId_key" ON "location"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "location_address_locationId_key" ON "location_address"("locationId");

-- CreateIndex
CREATE INDEX "sublocation_locationId_idx" ON "sublocation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "sublocation_locationId_name_key" ON "sublocation"("locationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "location_webhook_url_key" ON "location_webhook"("url");

-- CreateIndex
CREATE INDEX "location_webhook_event_eventType_idx" ON "location_webhook_event"("eventType");

-- CreateIndex
CREATE INDEX "location_webhook_event_receivedAt_idx" ON "location_webhook_event"("receivedAt");

-- CreateIndex
CREATE INDEX "inventory_productId_idx" ON "inventory"("productId");

-- CreateIndex
CREATE INDEX "inventory_locationId_idx" ON "inventory"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_locationId_key" ON "inventory"("productId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_bin_productId_sublocationId_key" ON "inventory_bin"("productId", "sublocationId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_adjustment_adjustmentNumber_key" ON "inventory_adjustment"("adjustmentNumber");

-- CreateIndex
CREATE INDEX "inventory_adjustment_line_productId_idx" ON "inventory_adjustment_line"("productId");

-- CreateIndex
CREATE INDEX "inventory_adjustment_line_locationId_idx" ON "inventory_adjustment_line"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "adjustment_reason_inflowId_key" ON "adjustment_reason"("inflowId");

-- CreateIndex
CREATE INDEX "adjustment_reason_name_idx" ON "adjustment_reason"("name");

-- CreateIndex
CREATE INDEX "adjustment_reason_location_map_locationId_localId_idx" ON "adjustment_reason_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "adjustment_reason_location_map_adjustmentReasonId_locationI_key" ON "adjustment_reason_location_map"("adjustmentReasonId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_order_transferNumber_key" ON "transfer_order"("transferNumber");

-- CreateIndex
CREATE INDEX "transfer_order_sourceLocationId_idx" ON "transfer_order"("sourceLocationId");

-- CreateIndex
CREATE INDEX "transfer_order_targetLocationId_idx" ON "transfer_order"("targetLocationId");

-- CreateIndex
CREATE INDEX "transfer_order_line_transferOrderId_idx" ON "transfer_order_line"("transferOrderId");

-- CreateIndex
CREATE INDEX "transfer_order_line_productId_idx" ON "transfer_order_line"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_inflowId_key" ON "team_member"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_email_key" ON "team_member"("email");

-- CreateIndex
CREATE INDEX "team_member_location_map_extended_locationId_localId_idx" ON "team_member_location_map_extended"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_location_map_extended_teamMemberId_locationId_key" ON "team_member_location_map_extended"("teamMemberId", "locationId");

-- CreateIndex
CREATE INDEX "team_member_access_right_rightName_idx" ON "team_member_access_right"("rightName");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_access_right_teamMemberId_rightName_key" ON "team_member_access_right"("teamMemberId", "rightName");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_location_teamMemberId_locationInflowId_key" ON "team_member_location"("teamMemberId", "locationInflowId");

-- CreateIndex
CREATE INDEX "business_partner_name_idx" ON "business_partner"("name");

-- CreateIndex
CREATE UNIQUE INDEX "business_partner_address_inflowId_key" ON "business_partner_address"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "business_partner_address_localId_key" ON "business_partner_address"("localId");

-- CreateIndex
CREATE INDEX "business_partner_address_businessPartnerId_idx" ON "business_partner_address"("businessPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_businessPartnerId_key" ON "customer"("businessPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_inflowId_key" ON "customer"("inflowId");

-- CreateIndex
CREATE INDEX "customer_pricingSchemeId_idx" ON "customer"("pricingSchemeId");

-- CreateIndex
CREATE INDEX "customer_taxingSchemeId_idx" ON "customer"("taxingSchemeId");

-- CreateIndex
CREATE INDEX "customer_location_map_locationId_localId_idx" ON "customer_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_location_map_customerId_locationId_key" ON "customer_location_map"("customerId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_due_inflowId_key" ON "customer_due"("inflowId");

-- CreateIndex
CREATE INDEX "customer_due_customerId_idx" ON "customer_due"("customerId");

-- CreateIndex
CREATE INDEX "customer_due_currencyId_idx" ON "customer_due"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_due_customerId_currencyId_key" ON "customer_due"("customerId", "currencyId");

-- CreateIndex
CREATE INDEX "customer_due_location_map_locationId_localId_idx" ON "customer_due_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_due_location_map_customerDueId_locationId_key" ON "customer_due_location_map"("customerDueId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_balance_inflowId_key" ON "customer_balance"("inflowId");

-- CreateIndex
CREATE INDEX "customer_balance_customerId_idx" ON "customer_balance"("customerId");

-- CreateIndex
CREATE INDEX "customer_balance_currencyId_idx" ON "customer_balance"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_balance_customerId_currencyId_key" ON "customer_balance"("customerId", "currencyId");

-- CreateIndex
CREATE INDEX "customer_balance_location_map_locationId_localId_idx" ON "customer_balance_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_balance_location_map_customerBalanceId_locationId_key" ON "customer_balance_location_map"("customerBalanceId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_credit_inflowId_key" ON "customer_credit"("inflowId");

-- CreateIndex
CREATE INDEX "customer_credit_customerId_idx" ON "customer_credit"("customerId");

-- CreateIndex
CREATE INDEX "customer_credit_currencyId_idx" ON "customer_credit"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_credit_customerId_currencyId_key" ON "customer_credit"("customerId", "currencyId");

-- CreateIndex
CREATE INDEX "customer_credit_location_map_locationId_localId_idx" ON "customer_credit_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_credit_location_map_customerCreditId_locationId_key" ON "customer_credit_location_map"("customerCreditId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_inflowId_key" ON "vendor"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_businessPartnerId_key" ON "vendor"("businessPartnerId");

-- CreateIndex
CREATE INDEX "vendor_location_map_locationId_localId_idx" ON "vendor_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_location_map_vendorId_locationId_key" ON "vendor_location_map"("vendorId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_attachment_inflowId_key" ON "vendor_attachment"("inflowId");

-- CreateIndex
CREATE INDEX "vendor_attachment_vendorId_idx" ON "vendor_attachment"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_attachment_location_map_locationId_localId_idx" ON "vendor_attachment_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_attachment_location_map_vendorAttachmentId_locationI_key" ON "vendor_attachment_location_map"("vendorAttachmentId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_item_inflowId_key" ON "vendor_item"("inflowId");

-- CreateIndex
CREATE INDEX "vendor_item_vendorId_idx" ON "vendor_item"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_item_productId_idx" ON "vendor_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_item_vendorId_productId_key" ON "vendor_item"("vendorId", "productId");

-- CreateIndex
CREATE INDEX "vendor_item_location_map_locationId_localId_idx" ON "vendor_item_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_item_location_map_vendorItemId_locationId_key" ON "vendor_item_location_map"("vendorItemId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_due_inflowId_key" ON "vendor_due"("inflowId");

-- CreateIndex
CREATE INDEX "vendor_due_vendorId_idx" ON "vendor_due"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_due_currencyId_idx" ON "vendor_due"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_due_vendorId_currencyId_key" ON "vendor_due"("vendorId", "currencyId");

-- CreateIndex
CREATE INDEX "vendor_due_location_map_locationId_localId_idx" ON "vendor_due_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_due_location_map_vendorDueId_locationId_key" ON "vendor_due_location_map"("vendorDueId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_balance_inflowId_key" ON "vendor_balance"("inflowId");

-- CreateIndex
CREATE INDEX "vendor_balance_vendorId_idx" ON "vendor_balance"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_balance_currencyId_idx" ON "vendor_balance"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_balance_vendorId_currencyId_key" ON "vendor_balance"("vendorId", "currencyId");

-- CreateIndex
CREATE INDEX "vendor_balance_location_map_locationId_localId_idx" ON "vendor_balance_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_balance_location_map_vendorBalanceId_locationId_key" ON "vendor_balance_location_map"("vendorBalanceId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_credit_inflowId_key" ON "vendor_credit"("inflowId");

-- CreateIndex
CREATE INDEX "vendor_credit_vendorId_idx" ON "vendor_credit"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_credit_currencyId_idx" ON "vendor_credit"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_credit_vendorId_currencyId_key" ON "vendor_credit"("vendorId", "currencyId");

-- CreateIndex
CREATE INDEX "vendor_credit_location_map_locationId_localId_idx" ON "vendor_credit_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_credit_location_map_vendorCreditId_locationId_key" ON "vendor_credit_location_map"("vendorCreditId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "taxing_scheme_inflowId_key" ON "taxing_scheme"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_code_inflowId_key" ON "tax_code"("inflowId");

-- CreateIndex
CREATE INDEX "tax_code_taxingSchemeId_idx" ON "tax_code"("taxingSchemeId");

-- CreateIndex
CREATE INDEX "taxing_scheme_location_map_locationId_localId_idx" ON "taxing_scheme_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "taxing_scheme_location_map_taxingSchemeId_locationId_key" ON "taxing_scheme_location_map"("taxingSchemeId", "locationId");

-- CreateIndex
CREATE INDEX "tax_code_location_map_locationId_localId_idx" ON "tax_code_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_code_location_map_taxCodeId_locationId_key" ON "tax_code_location_map"("taxCodeId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "currency_inflowId_key" ON "currency"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "currency_isoCode_key" ON "currency"("isoCode");

-- CreateIndex
CREATE INDEX "currency_isoCode_idx" ON "currency"("isoCode");

-- CreateIndex
CREATE INDEX "currency_location_map_locationId_localId_idx" ON "currency_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "currency_location_map_currencyId_locationId_key" ON "currency_location_map"("currencyId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "currency_conversion_inflowId_key" ON "currency_conversion"("inflowId");

-- CreateIndex
CREATE INDEX "currency_conversion_currencyId_idx" ON "currency_conversion"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_scheme_inflowId_key" ON "pricing_scheme"("inflowId");

-- CreateIndex
CREATE INDEX "pricing_scheme_currencyId_idx" ON "pricing_scheme"("currencyId");

-- CreateIndex
CREATE INDEX "pricing_scheme_location_map_locationId_localId_idx" ON "pricing_scheme_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_scheme_location_map_pricingSchemeId_locationId_key" ON "pricing_scheme_location_map"("pricingSchemeId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_terms_inflowId_key" ON "payment_terms"("inflowId");

-- CreateIndex
CREATE INDEX "payment_terms_name_idx" ON "payment_terms"("name");

-- CreateIndex
CREATE INDEX "payment_term_location_map_locationId_localId_idx" ON "payment_term_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_term_location_map_paymentTermId_locationId_key" ON "payment_term_location_map"("paymentTermId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_inflowId_key" ON "sales_order"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_localId_key" ON "sales_order"("localId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_orderNumber_key" ON "sales_order"("orderNumber");

-- CreateIndex
CREATE INDEX "sales_order_inflowId_idx" ON "sales_order"("inflowId");

-- CreateIndex
CREATE INDEX "sales_order_orderNumber_idx" ON "sales_order"("orderNumber");

-- CreateIndex
CREATE INDEX "sales_order_customerId_idx" ON "sales_order"("customerId");

-- CreateIndex
CREATE INDEX "sales_order_locationId_idx" ON "sales_order"("locationId");

-- CreateIndex
CREATE INDEX "sales_order_paymentStatus_idx" ON "sales_order"("paymentStatus");

-- CreateIndex
CREATE INDEX "sales_order_orderDate_idx" ON "sales_order"("orderDate");

-- CreateIndex
CREATE INDEX "sales_order_location_map_locationId_localId_idx" ON "sales_order_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_location_map_salesOrderId_locationId_key" ON "sales_order_location_map"("salesOrderId", "locationId");

-- CreateIndex
CREATE INDEX "sales_order_line_salesOrderId_idx" ON "sales_order_line"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_order_line_productId_idx" ON "sales_order_line"("productId");

-- CreateIndex
CREATE INDEX "sales_order_pack_line_salesOrderId_idx" ON "sales_order_pack_line"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_order_pack_line_productId_idx" ON "sales_order_pack_line"("productId");

-- CreateIndex
CREATE INDEX "sales_order_pick_line_salesOrderId_idx" ON "sales_order_pick_line"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_order_pick_line_productId_idx" ON "sales_order_pick_line"("productId");

-- CreateIndex
CREATE INDEX "sales_order_pick_allocation_line_salesOrderId_idx" ON "sales_order_pick_allocation_line"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_order_pick_allocation_line_productId_idx" ON "sales_order_pick_allocation_line"("productId");

-- CreateIndex
CREATE INDEX "sales_order_pick_allocation_failure_salesOrderId_idx" ON "sales_order_pick_allocation_failure"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_order_pick_allocation_failure_productId_idx" ON "sales_order_pick_allocation_failure"("productId");

-- CreateIndex
CREATE INDEX "sales_order_restock_line_salesOrderId_idx" ON "sales_order_restock_line"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_order_restock_line_productId_idx" ON "sales_order_restock_line"("productId");

-- CreateIndex
CREATE INDEX "sales_order_ship_line_salesOrderId_idx" ON "sales_order_ship_line"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_order_payment_line_salesOrderId_idx" ON "sales_order_payment_line"("salesOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "cost_of_goods_sold_salesOrderId_key" ON "cost_of_goods_sold"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_order_attachment_salesOrderId_idx" ON "sales_order_attachment"("salesOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_inflowId_key" ON "purchase_order"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_orderNumber_key" ON "purchase_order"("orderNumber");

-- CreateIndex
CREATE INDEX "purchase_order_inflowId_idx" ON "purchase_order"("inflowId");

-- CreateIndex
CREATE INDEX "purchase_order_orderNumber_idx" ON "purchase_order"("orderNumber");

-- CreateIndex
CREATE INDEX "purchase_order_vendorId_idx" ON "purchase_order"("vendorId");

-- CreateIndex
CREATE INDEX "purchase_order_locationId_idx" ON "purchase_order"("locationId");

-- CreateIndex
CREATE INDEX "purchase_order_paymentStatus_idx" ON "purchase_order"("paymentStatus");

-- CreateIndex
CREATE INDEX "purchase_order_orderDate_idx" ON "purchase_order"("orderDate");

-- CreateIndex
CREATE INDEX "purchase_order_location_map_locationId_localId_idx" ON "purchase_order_location_map"("locationId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_location_map_purchaseOrderId_locationId_key" ON "purchase_order_location_map"("purchaseOrderId", "locationId");

-- CreateIndex
CREATE INDEX "purchase_order_line_purchaseOrderId_idx" ON "purchase_order_line"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_line_productId_idx" ON "purchase_order_line"("productId");

-- CreateIndex
CREATE INDEX "purchase_order_receive_line_purchaseOrderId_idx" ON "purchase_order_receive_line"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_receive_line_productId_idx" ON "purchase_order_receive_line"("productId");

-- CreateIndex
CREATE INDEX "purchase_order_receive_line_locationId_idx" ON "purchase_order_receive_line"("locationId");

-- CreateIndex
CREATE INDEX "purchase_order_unstock_line_purchaseOrderId_idx" ON "purchase_order_unstock_line"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_unstock_line_productId_idx" ON "purchase_order_unstock_line"("productId");

-- CreateIndex
CREATE INDEX "purchase_order_unstock_line_locationId_idx" ON "purchase_order_unstock_line"("locationId");

-- CreateIndex
CREATE INDEX "purchase_order_payment_line_purchaseOrderId_idx" ON "purchase_order_payment_line"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_attachment_purchaseOrderId_idx" ON "purchase_order_attachment"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_inflowCustomerId_fkey" FOREIGN KEY ("inflowCustomerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_location_map" ADD CONSTRAINT "category_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_location_map" ADD CONSTRAINT "category_location_map_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group" ADD CONSTRAINT "product_group_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group" ADD CONSTRAINT "product_group_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_location_map" ADD CONSTRAINT "product_group_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_location_map" ADD CONSTRAINT "product_group_location_map_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_group"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_group"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_location_map" ADD CONSTRAINT "product_variant_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_location_map" ADD CONSTRAINT "product_variant_location_map_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_lastVendorId_fkey" FOREIGN KEY ("lastVendorId") REFERENCES "vendor"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_location_map" ADD CONSTRAINT "product_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_location_map" ADD CONSTRAINT "product_location_map_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_pricingSchemeId_fkey" FOREIGN KEY ("pricingSchemeId") REFERENCES "pricing_scheme"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_location_map" ADD CONSTRAINT "product_price_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_location_map" ADD CONSTRAINT "product_price_location_map_productPriceId_fkey" FOREIGN KEY ("productPriceId") REFERENCES "product_price"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_adjustment" ADD CONSTRAINT "product_cost_adjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_adjustment" ADD CONSTRAINT "product_cost_adjustment_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_adjustment_location_map" ADD CONSTRAINT "product_cost_adjustment_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_adjustment_location_map" ADD CONSTRAINT "product_cost_adjustment_location_map_productCostAdjustment_fkey" FOREIGN KEY ("productCostAdjustmentId") REFERENCES "product_cost_adjustment"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcode" ADD CONSTRAINT "product_barcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcode_location_map" ADD CONSTRAINT "product_barcode_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcode_location_map" ADD CONSTRAINT "product_barcode_location_map_productBarcodeId_fkey" FOREIGN KEY ("productBarcodeId") REFERENCES "product_barcode"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_operation" ADD CONSTRAINT "product_operation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_operation" ADD CONSTRAINT "product_operation_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_type"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_operation_location_map" ADD CONSTRAINT "product_operation_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_operation_location_map" ADD CONSTRAINT "product_operation_location_map_productOperationId_fkey" FOREIGN KEY ("productOperationId") REFERENCES "product_operation"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_type_location_map" ADD CONSTRAINT "operation_type_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_type_location_map" ADD CONSTRAINT "operation_type_location_map_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_type"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tax_code" ADD CONSTRAINT "product_tax_code_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tax_code" ADD CONSTRAINT "product_tax_code_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "tax_code"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tax_code" ADD CONSTRAINT "product_tax_code_taxingSchemeId_fkey" FOREIGN KEY ("taxingSchemeId") REFERENCES "taxing_scheme"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attachment" ADD CONSTRAINT "product_attachment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attachment" ADD CONSTRAINT "product_attachment_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attachment_location_map" ADD CONSTRAINT "product_attachment_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attachment_location_map" ADD CONSTRAINT "product_attachment_location_map_productAttachmentId_fkey" FOREIGN KEY ("productAttachmentId") REFERENCES "product_attachment"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost" ADD CONSTRAINT "product_cost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_location_map" ADD CONSTRAINT "product_cost_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_location_map" ADD CONSTRAINT "product_cost_location_map_productCostId_fkey" FOREIGN KEY ("productCostId") REFERENCES "product_cost"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reorder_setting" ADD CONSTRAINT "product_reorder_setting_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reorder_setting" ADD CONSTRAINT "product_reorder_setting_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reorder_setting" ADD CONSTRAINT "product_reorder_setting_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reorder_setting" ADD CONSTRAINT "product_reorder_setting_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_setting_location_map" ADD CONSTRAINT "reorder_setting_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_setting_location_map" ADD CONSTRAINT "reorder_setting_location_map_reorderSettingId_fkey" FOREIGN KEY ("reorderSettingId") REFERENCES "product_reorder_setting"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom" ADD CONSTRAINT "product_bom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom" ADD CONSTRAINT "product_bom_childProductId_fkey" FOREIGN KEY ("childProductId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom_location_map" ADD CONSTRAINT "product_bom_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom_location_map" ADD CONSTRAINT "product_bom_location_map_productBomId_fkey" FOREIGN KEY ("productBomId") REFERENCES "product_bom"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_uom" ADD CONSTRAINT "product_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_uom" ADD CONSTRAINT "product_uom_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales_uom" ADD CONSTRAINT "product_sales_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales_uom" ADD CONSTRAINT "product_sales_uom_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_conversion" ADD CONSTRAINT "unit_conversion_fromUomId_fkey" FOREIGN KEY ("fromUomId") REFERENCES "unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_conversion" ADD CONSTRAINT "unit_conversion_toUomId_fkey" FOREIGN KEY ("toUomId") REFERENCES "unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_group"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image_location_map" ADD CONSTRAINT "product_image_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image_location_map" ADD CONSTRAINT "product_image_location_map_productImageId_fkey" FOREIGN KEY ("productImageId") REFERENCES "product_image"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeValue" ADD CONSTRAINT "AttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_selection" ADD CONSTRAINT "product_variant_selection_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_selection" ADD CONSTRAINT "product_variant_selection_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_group_option"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_selection" ADD CONSTRAINT "product_variant_selection_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "product_group_option_value"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option" ADD CONSTRAINT "product_group_option_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option" ADD CONSTRAINT "product_group_option_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_group"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option_location_map" ADD CONSTRAINT "product_group_option_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option_location_map" ADD CONSTRAINT "product_group_option_location_map_productGroupOptionId_fkey" FOREIGN KEY ("productGroupOptionId") REFERENCES "product_group_option"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option_value" ADD CONSTRAINT "product_group_option_value_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "AttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option_value" ADD CONSTRAINT "product_group_option_value_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_group_option"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option_value_location_map" ADD CONSTRAINT "product_group_option_value_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option_value_location_map" ADD CONSTRAINT "product_group_option_value_location_map_productGroupOption_fkey" FOREIGN KEY ("productGroupOptionValueId") REFERENCES "product_group_option_value"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_value" ADD CONSTRAINT "feature_value_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_feature" ADD CONSTRAINT "group_feature_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_group"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_feature" ADD CONSTRAINT "group_feature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_feature" ADD CONSTRAINT "group_feature_featureValueId_fkey" FOREIGN KEY ("featureValueId") REFERENCES "feature_value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_feature" ADD CONSTRAINT "product_feature_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_feature" ADD CONSTRAINT "product_feature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_feature" ADD CONSTRAINT "product_feature_featureValueId_fkey" FOREIGN KEY ("featureValueId") REFERENCES "feature_value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_tag" ADD CONSTRAINT "group_tag_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_group"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_tag" ADD CONSTRAINT "group_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_address" ADD CONSTRAINT "location_address_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sublocation" ADD CONSTRAINT "sublocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_webhook" ADD CONSTRAINT "location_webhook_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_webhook_event" ADD CONSTRAINT "location_webhook_event_locationWebhookId_fkey" FOREIGN KEY ("locationWebhookId") REFERENCES "location_webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_bin" ADD CONSTRAINT "inventory_bin_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_bin" ADD CONSTRAINT "inventory_bin_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_bin" ADD CONSTRAINT "inventory_bin_sublocationId_fkey" FOREIGN KEY ("sublocationId") REFERENCES "sublocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "inventory_adjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_line" ADD CONSTRAINT "inventory_adjustment_line_sublocationId_fkey" FOREIGN KEY ("sublocationId") REFERENCES "sublocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_reason_location_map" ADD CONSTRAINT "adjustment_reason_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_reason_location_map" ADD CONSTRAINT "adjustment_reason_location_map_adjustmentReasonId_fkey" FOREIGN KEY ("adjustmentReasonId") REFERENCES "adjustment_reason"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order" ADD CONSTRAINT "transfer_order_targetLocationId_fkey" FOREIGN KEY ("targetLocationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_transferOrderId_fkey" FOREIGN KEY ("transferOrderId") REFERENCES "transfer_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_sourceSublocationId_fkey" FOREIGN KEY ("sourceSublocationId") REFERENCES "sublocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_line" ADD CONSTRAINT "transfer_order_line_targetSublocationId_fkey" FOREIGN KEY ("targetSublocationId") REFERENCES "sublocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_location_map_extended" ADD CONSTRAINT "team_member_location_map_extended_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_location_map_extended" ADD CONSTRAINT "team_member_location_map_extended_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_member"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_access_right" ADD CONSTRAINT "team_member_access_right_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_location" ADD CONSTRAINT "team_member_location_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_location" ADD CONSTRAINT "team_member_location_locationInflowId_fkey" FOREIGN KEY ("locationInflowId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_partner_address" ADD CONSTRAINT "business_partner_address_businessPartnerId_fkey" FOREIGN KEY ("businessPartnerId") REFERENCES "business_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_businessPartnerId_fkey" FOREIGN KEY ("businessPartnerId") REFERENCES "business_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_defaultLocationId_fkey" FOREIGN KEY ("defaultLocationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_defaultPaymentTermsId_fkey" FOREIGN KEY ("defaultPaymentTermsId") REFERENCES "payment_terms"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_pricingSchemeId_fkey" FOREIGN KEY ("pricingSchemeId") REFERENCES "pricing_scheme"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_taxingSchemeId_fkey" FOREIGN KEY ("taxingSchemeId") REFERENCES "taxing_scheme"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_defaultSalesRepTeamMemberId_fkey" FOREIGN KEY ("defaultSalesRepTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_defaultBillingAddressId_fkey" FOREIGN KEY ("defaultBillingAddressId") REFERENCES "business_partner_address"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_defaultShippingAddressId_fkey" FOREIGN KEY ("defaultShippingAddressId") REFERENCES "business_partner_address"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_location_map" ADD CONSTRAINT "customer_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_location_map" ADD CONSTRAINT "customer_location_map_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_due" ADD CONSTRAINT "customer_due_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_due" ADD CONSTRAINT "customer_due_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_due_location_map" ADD CONSTRAINT "customer_due_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_due_location_map" ADD CONSTRAINT "customer_due_location_map_customerDueId_fkey" FOREIGN KEY ("customerDueId") REFERENCES "customer_due"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_balance" ADD CONSTRAINT "customer_balance_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_balance" ADD CONSTRAINT "customer_balance_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_balance_location_map" ADD CONSTRAINT "customer_balance_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_balance_location_map" ADD CONSTRAINT "customer_balance_location_map_customerBalanceId_fkey" FOREIGN KEY ("customerBalanceId") REFERENCES "customer_balance"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credit" ADD CONSTRAINT "customer_credit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credit" ADD CONSTRAINT "customer_credit_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credit_location_map" ADD CONSTRAINT "customer_credit_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credit_location_map" ADD CONSTRAINT "customer_credit_location_map_customerCreditId_fkey" FOREIGN KEY ("customerCreditId") REFERENCES "customer_credit"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_businessPartnerId_fkey" FOREIGN KEY ("businessPartnerId") REFERENCES "business_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_defaultPaymentTermsId_fkey" FOREIGN KEY ("defaultPaymentTermsId") REFERENCES "payment_terms"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_taxingSchemeId_fkey" FOREIGN KEY ("taxingSchemeId") REFERENCES "taxing_scheme"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_defaultAddressId_fkey" FOREIGN KEY ("defaultAddressId") REFERENCES "business_partner_address"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_location_map" ADD CONSTRAINT "vendor_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_location_map" ADD CONSTRAINT "vendor_location_map_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_attachment" ADD CONSTRAINT "vendor_attachment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_attachment_location_map" ADD CONSTRAINT "vendor_attachment_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_attachment_location_map" ADD CONSTRAINT "vendor_attachment_location_map_vendorAttachmentId_fkey" FOREIGN KEY ("vendorAttachmentId") REFERENCES "vendor_attachment"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_item" ADD CONSTRAINT "vendor_item_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_item" ADD CONSTRAINT "vendor_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_item_location_map" ADD CONSTRAINT "vendor_item_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_item_location_map" ADD CONSTRAINT "vendor_item_location_map_vendorItemId_fkey" FOREIGN KEY ("vendorItemId") REFERENCES "vendor_item"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_due" ADD CONSTRAINT "vendor_due_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_due" ADD CONSTRAINT "vendor_due_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_due_location_map" ADD CONSTRAINT "vendor_due_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_due_location_map" ADD CONSTRAINT "vendor_due_location_map_vendorDueId_fkey" FOREIGN KEY ("vendorDueId") REFERENCES "vendor_due"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_balance" ADD CONSTRAINT "vendor_balance_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_balance" ADD CONSTRAINT "vendor_balance_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_balance_location_map" ADD CONSTRAINT "vendor_balance_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_balance_location_map" ADD CONSTRAINT "vendor_balance_location_map_vendorBalanceId_fkey" FOREIGN KEY ("vendorBalanceId") REFERENCES "vendor_balance"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_credit" ADD CONSTRAINT "vendor_credit_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_credit" ADD CONSTRAINT "vendor_credit_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_credit_location_map" ADD CONSTRAINT "vendor_credit_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_credit_location_map" ADD CONSTRAINT "vendor_credit_location_map_vendorCreditId_fkey" FOREIGN KEY ("vendorCreditId") REFERENCES "vendor_credit"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxing_scheme" ADD CONSTRAINT "taxing_scheme_defaultTaxCodeId_fkey" FOREIGN KEY ("defaultTaxCodeId") REFERENCES "tax_code"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_code" ADD CONSTRAINT "tax_code_taxingSchemeId_fkey" FOREIGN KEY ("taxingSchemeId") REFERENCES "taxing_scheme"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxing_scheme_location_map" ADD CONSTRAINT "taxing_scheme_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxing_scheme_location_map" ADD CONSTRAINT "taxing_scheme_location_map_taxingSchemeId_fkey" FOREIGN KEY ("taxingSchemeId") REFERENCES "taxing_scheme"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_code_location_map" ADD CONSTRAINT "tax_code_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_code_location_map" ADD CONSTRAINT "tax_code_location_map_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "tax_code"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_location_map" ADD CONSTRAINT "currency_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_location_map" ADD CONSTRAINT "currency_location_map_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_conversion" ADD CONSTRAINT "currency_conversion_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_scheme" ADD CONSTRAINT "pricing_scheme_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_scheme_location_map" ADD CONSTRAINT "pricing_scheme_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_scheme_location_map" ADD CONSTRAINT "pricing_scheme_location_map_pricingSchemeId_fkey" FOREIGN KEY ("pricingSchemeId") REFERENCES "pricing_scheme"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_term_location_map" ADD CONSTRAINT "payment_term_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_term_location_map" ADD CONSTRAINT "payment_term_location_map_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "payment_terms"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_assignedToTeamMemberId_fkey" FOREIGN KEY ("assignedToTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_confirmerTeamMemberId_fkey" FOREIGN KEY ("confirmerTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_salesRepTeamMemberId_fkey" FOREIGN KEY ("salesRepTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_paymentTermsId_fkey" FOREIGN KEY ("paymentTermsId") REFERENCES "payment_terms"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_location_map" ADD CONSTRAINT "sales_order_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_location_map" ADD CONSTRAINT "sales_order_location_map_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_pack_line" ADD CONSTRAINT "sales_order_pack_line_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_pack_line" ADD CONSTRAINT "sales_order_pack_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_pick_line" ADD CONSTRAINT "sales_order_pick_line_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_pick_line" ADD CONSTRAINT "sales_order_pick_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_pick_allocation_line" ADD CONSTRAINT "sales_order_pick_allocation_line_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_pick_allocation_line" ADD CONSTRAINT "sales_order_pick_allocation_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_pick_allocation_failure" ADD CONSTRAINT "sales_order_pick_allocation_failure_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_pick_allocation_failure" ADD CONSTRAINT "sales_order_pick_allocation_failure_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_restock_line" ADD CONSTRAINT "sales_order_restock_line_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_restock_line" ADD CONSTRAINT "sales_order_restock_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_ship_line" ADD CONSTRAINT "sales_order_ship_line_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_payment_line" ADD CONSTRAINT "sales_order_payment_line_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_of_goods_sold" ADD CONSTRAINT "cost_of_goods_sold_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_attachment" ADD CONSTRAINT "sales_order_attachment_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_assignedToTeamMemberId_fkey" FOREIGN KEY ("assignedToTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_approverTeamMemberId_fkey" FOREIGN KEY ("approverTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_location_map" ADD CONSTRAINT "purchase_order_location_map_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_location_map" ADD CONSTRAINT "purchase_order_location_map_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receive_line" ADD CONSTRAINT "purchase_order_receive_line_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receive_line" ADD CONSTRAINT "purchase_order_receive_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_unstock_line" ADD CONSTRAINT "purchase_order_unstock_line_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_unstock_line" ADD CONSTRAINT "purchase_order_unstock_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_payment_line" ADD CONSTRAINT "purchase_order_payment_line_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_attachment" ADD CONSTRAINT "purchase_order_attachment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

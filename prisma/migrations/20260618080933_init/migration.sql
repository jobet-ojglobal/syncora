-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('STOCK_COUNT', 'DAMAGE', 'LOSS', 'THEFT', 'EXPIRED', 'RETURN', 'CORRECTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'PURCHASE', 'SALE', 'RETURN');

-- CreateEnum
CREATE TYPE "TransferOrderStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "product_variant" (
    "id" TEXT NOT NULL,
    "sku" TEXT,
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
    "timestamp" TEXT,
    "brandId" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_barcode" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "lineNum" INTEGER NOT NULL,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_barcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_uom" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standardQuantity" DECIMAL(18,4) NOT NULL,
    "uomQuantity" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "product_uom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sales_uom" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standardQuantity" DECIMAL(18,4) NOT NULL,
    "uomQuantity" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "product_sales_uom_pkey" PRIMARY KEY ("id")
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
    "timestamp" TEXT,
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
    "reason" "AdjustmentReason" NOT NULL,
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
CREATE TABLE "inflow_integration" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT,
    "webhookUrl" TEXT,
    "secret" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inflow_integration_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "sync_job_status_idx" ON "sync_job"("status");

-- CreateIndex
CREATE INDEX "sync_job_createdAt_idx" ON "sync_job"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "brand_name_key" ON "brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "category_inflowId_key" ON "category"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_inflowId_key" ON "product_group"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_slug_key" ON "product_group"("slug");

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
CREATE UNIQUE INDEX "product_inflowId_key" ON "product"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_inflowId_key" ON "product_barcode"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_barcode_key" ON "product_barcode"("barcode");

-- CreateIndex
CREATE INDEX "product_barcode_productId_idx" ON "product_barcode"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcode_productId_lineNum_key" ON "product_barcode"("productId", "lineNum");

-- CreateIndex
CREATE UNIQUE INDEX "product_uom_productId_key" ON "product_uom"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_sales_uom_productId_key" ON "product_sales_uom"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_image_inflowId_key" ON "product_image"("inflowId");

-- CreateIndex
CREATE INDEX "product_image_groupId_position_idx" ON "product_image"("groupId", "position");

-- CreateIndex
CREATE INDEX "product_image_productId_position_idx" ON "product_image"("productId", "position");

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
CREATE UNIQUE INDEX "product_group_option_value_inflowId_key" ON "product_group_option_value"("inflowId");

-- CreateIndex
CREATE INDEX "product_group_option_value_optionId_idx" ON "product_group_option_value"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_value_optionId_attributeValueId_key" ON "product_group_option_value"("optionId", "attributeValueId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_value_optionId_lineNum_key" ON "product_group_option_value"("optionId", "lineNum");

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
CREATE UNIQUE INDEX "inflow_webhook_url_key" ON "inflow_webhook"("url");

-- CreateIndex
CREATE UNIQUE INDEX "inflow_integration_webhookId_key" ON "inflow_integration"("webhookId");

-- CreateIndex
CREATE INDEX "inflow_webhook_event_eventType_idx" ON "inflow_webhook_event"("eventType");

-- CreateIndex
CREATE INDEX "inflow_webhook_event_receivedAt_idx" ON "inflow_webhook_event"("receivedAt");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group" ADD CONSTRAINT "product_group_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group" ADD CONSTRAINT "product_group_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_group"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcode" ADD CONSTRAINT "product_barcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_uom" ADD CONSTRAINT "product_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales_uom" ADD CONSTRAINT "product_sales_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_group"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "product_group_option_value" ADD CONSTRAINT "product_group_option_value_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "AttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option_value" ADD CONSTRAINT "product_group_option_value_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_group_option"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

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

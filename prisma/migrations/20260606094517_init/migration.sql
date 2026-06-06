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
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "inflowCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_group" (
    "id" TEXT NOT NULL,
    "inflowProdGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "defaultProductId" TEXT,
    "defaultImageId" TEXT,
    "isActive" BOOLEAN NOT NULL,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant" (
    "id" TEXT NOT NULL,
    "inflowVariantId" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "defaultPrice" DECIMAL(18,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "inflowProductId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
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
    "inflowImageId" TEXT NOT NULL,
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
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_feature" (
    "productId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,

    CONSTRAINT "product_feature_pkey" PRIMARY KEY ("productId","featureId")
);

-- CreateTable
CREATE TABLE "product_tag" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "product_tag_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "product_group_option" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "lineNum" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
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
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_group_option_value_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "sync_job_status_idx" ON "sync_job"("status");

-- CreateIndex
CREATE INDEX "sync_job_createdAt_idx" ON "sync_job"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "category_inflowCategoryId_key" ON "category"("inflowCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_inflowProdGroupId_key" ON "product_group"("inflowProdGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_inflowVariantId_key" ON "product_variant"("inflowVariantId");

-- CreateIndex
CREATE INDEX "product_variant_productGroupId_idx" ON "product_variant"("productGroupId");

-- CreateIndex
CREATE INDEX "product_variant_productId_idx" ON "product_variant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_inflowProductId_key" ON "product"("inflowProductId");

-- CreateIndex
CREATE UNIQUE INDEX "product_uom_productId_key" ON "product_uom"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_sales_uom_productId_key" ON "product_sales_uom"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_image_inflowImageId_key" ON "product_image"("inflowImageId");

-- CreateIndex
CREATE INDEX "product_image_groupId_position_idx" ON "product_image"("groupId", "position");

-- CreateIndex
CREATE INDEX "product_image_productId_position_idx" ON "product_image"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "brand_name_key" ON "brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "feature_name_key" ON "feature"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tag_name_key" ON "tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_inflowId_key" ON "product_group_option"("inflowId");

-- CreateIndex
CREATE INDEX "product_group_option_productGroupId_idx" ON "product_group_option"("productGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_option_value_inflowId_key" ON "product_group_option_value"("inflowId");

-- CreateIndex
CREATE INDEX "product_group_option_value_optionId_idx" ON "product_group_option_value"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_selection_variantId_optionId_key" ON "product_variant_selection"("variantId", "optionId");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("inflowCategoryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group" ADD CONSTRAINT "product_group_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("inflowCategoryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_group"("inflowProdGroupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowProductId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_uom" ADD CONSTRAINT "product_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowProductId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales_uom" ADD CONSTRAINT "product_sales_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowProductId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_group"("inflowProdGroupId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowProductId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_feature" ADD CONSTRAINT "product_feature_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowProductId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_feature" ADD CONSTRAINT "product_feature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowProductId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option" ADD CONSTRAINT "product_group_option_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_group"("inflowProdGroupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_option_value" ADD CONSTRAINT "product_group_option_value_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_group_option"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_selection" ADD CONSTRAINT "product_variant_selection_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("inflowVariantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_selection" ADD CONSTRAINT "product_variant_selection_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_group_option"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_selection" ADD CONSTRAINT "product_variant_selection_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "product_group_option_value"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

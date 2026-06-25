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
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_operation_pkey" PRIMARY KEY ("id")
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
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tax_code" (
    "id" TEXT NOT NULL,
    "productTaxCodeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "taxCodeId" TEXT NOT NULL,
    "taxingSchemeId" TEXT NOT NULL,
    "timestamp" TEXT,
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
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reorder_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bom" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "childProductId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_bom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_operation_inflowId_key" ON "product_operation"("inflowId");

-- CreateIndex
CREATE INDEX "product_operation_productId_idx" ON "product_operation"("productId");

-- CreateIndex
CREATE INDEX "product_operation_operationTypeId_idx" ON "product_operation"("operationTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "product_operation_productId_lineNum_key" ON "product_operation"("productId", "lineNum");

-- CreateIndex
CREATE UNIQUE INDEX "operation_type_inflowId_key" ON "operation_type"("inflowId");

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
CREATE UNIQUE INDEX "product_cost_inflowId_key" ON "product_cost"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "product_cost_productId_key" ON "product_cost"("productId");

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
CREATE UNIQUE INDEX "product_bom_inflowId_key" ON "product_bom"("inflowId");

-- CreateIndex
CREATE INDEX "product_bom_productId_idx" ON "product_bom"("productId");

-- CreateIndex
CREATE INDEX "product_bom_childProductId_idx" ON "product_bom"("childProductId");

-- CreateIndex
CREATE UNIQUE INDEX "product_bom_productId_childProductId_key" ON "product_bom"("productId", "childProductId");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_operation" ADD CONSTRAINT "product_operation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_operation" ADD CONSTRAINT "product_operation_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_type"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "product_cost" ADD CONSTRAINT "product_cost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reorder_setting" ADD CONSTRAINT "product_reorder_setting_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reorder_setting" ADD CONSTRAINT "product_reorder_setting_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reorder_setting" ADD CONSTRAINT "product_reorder_setting_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reorder_setting" ADD CONSTRAINT "product_reorder_setting_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom" ADD CONSTRAINT "product_bom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bom" ADD CONSTRAINT "product_bom_childProductId_fkey" FOREIGN KEY ("childProductId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

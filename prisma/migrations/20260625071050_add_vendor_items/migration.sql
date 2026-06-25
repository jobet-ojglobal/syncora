-- CreateTable
CREATE TABLE "vendor_attachment" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "contentType" TEXT,
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_item" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorSku" TEXT,
    "unitCost" DECIMAL(18,5),
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_attachment_inflowId_key" ON "vendor_attachment"("inflowId");

-- CreateIndex
CREATE INDEX "vendor_attachment_vendorId_idx" ON "vendor_attachment"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_item_inflowId_key" ON "vendor_item"("inflowId");

-- CreateIndex
CREATE INDEX "vendor_item_vendorId_idx" ON "vendor_item"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_item_productId_idx" ON "vendor_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_item_vendorId_productId_key" ON "vendor_item"("vendorId", "productId");

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_defaultAddressId_fkey" FOREIGN KEY ("defaultAddressId") REFERENCES "business_partner_address"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_attachment" ADD CONSTRAINT "vendor_attachment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_item" ADD CONSTRAINT "vendor_item_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_item" ADD CONSTRAINT "vendor_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

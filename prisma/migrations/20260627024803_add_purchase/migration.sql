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
    "timestamp" TEXT NOT NULL,
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
    "timestamp" TEXT NOT NULL,

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
    "timestamp" TEXT NOT NULL,
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
    "timestamp" TEXT NOT NULL,

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
    "timestamp" TEXT NOT NULL,

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
CREATE UNIQUE INDEX "purchase_order_inflowId_key" ON "purchase_order"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_orderNumber_key" ON "purchase_order"("orderNumber");

-- AddForeignKey
ALTER TABLE "sales_order_attachment" ADD CONSTRAINT "sales_order_attachment_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_assignedToTeamMemberId_fkey" FOREIGN KEY ("assignedToTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_approverTeamMemberId_fkey" FOREIGN KEY ("approverTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

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

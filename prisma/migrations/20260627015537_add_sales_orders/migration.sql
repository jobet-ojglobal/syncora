-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
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
    "timestamp" TEXT NOT NULL,
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

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderLine" (
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
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("salesOrderLineId")
);

-- CreateTable
CREATE TABLE "SalesOrderPackLine" (
    "salesOrderPackLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "containerNumber" TEXT,
    "description" TEXT,
    "quantity" JSONB NOT NULL,
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "SalesOrderPackLine_pkey" PRIMARY KEY ("salesOrderPackLineId")
);

-- CreateTable
CREATE TABLE "SalesOrderPickLine" (
    "salesOrderPickLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lineNum" TEXT,
    "locationId" TEXT,
    "sublocation" TEXT,
    "pickDate" TIMESTAMP(3),
    "description" TEXT,
    "quantity" JSONB NOT NULL,
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "SalesOrderPickLine_pkey" PRIMARY KEY ("salesOrderPickLineId")
);

-- CreateTable
CREATE TABLE "SalesOrderPickAllocationLine" (
    "salesOrderPickAllocationLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lineNum" TEXT,
    "locationId" TEXT,
    "sublocation" TEXT,
    "quantity" JSONB NOT NULL,
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "SalesOrderPickAllocationLine_pkey" PRIMARY KEY ("salesOrderPickAllocationLineId")
);

-- CreateTable
CREATE TABLE "SalesOrderPickAllocationFailure" (
    "salesOrderPickAllocationFailureId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lineNum" TEXT,
    "hasExpiredLotsInStock" BOOLEAN NOT NULL DEFAULT false,
    "quantity" JSONB NOT NULL,
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "SalesOrderPickAllocationFailure_pkey" PRIMARY KEY ("salesOrderPickAllocationFailureId")
);

-- CreateTable
CREATE TABLE "SalesOrderRestockLine" (
    "salesOrderRestockLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT,
    "locationId" TEXT,
    "sublocation" TEXT,
    "restockDate" TIMESTAMP(3),
    "quantity" JSONB NOT NULL,
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "SalesOrderRestockLine_pkey" PRIMARY KEY ("salesOrderRestockLineId")
);

-- CreateTable
CREATE TABLE "SalesOrderShipLine" (
    "salesOrderShipLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "shippedDate" TIMESTAMP(3),
    "easyPostShipmentId" TEXT,
    "easyPostShipmentStatus" TEXT,
    "easyPostConfirmationEmailAddress" TEXT,
    "containers" JSONB,
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "SalesOrderShipLine_pkey" PRIMARY KEY ("salesOrderShipLineId")
);

-- CreateTable
CREATE TABLE "SalesOrderPaymentLine" (
    "salesOrderPaymentHistoryLineId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "lineNum" INTEGER NOT NULL,
    "amount" DECIMAL(18,5) NOT NULL,
    "datePaid" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentType" TEXT,
    "referenceNumber" TEXT,
    "remarks" TEXT,
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "SalesOrderPaymentLine_pkey" PRIMARY KEY ("salesOrderPaymentHistoryLineId")
);

-- CreateTable
CREATE TABLE "CostOfGoodsSold" (
    "salesOrderCostOfGoodsSoldId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "costOfGoodsSold" DECIMAL(18,5) NOT NULL,

    CONSTRAINT "CostOfGoodsSold_pkey" PRIMARY KEY ("salesOrderCostOfGoodsSoldId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_inflowId_key" ON "SalesOrder"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_orderNumber_key" ON "SalesOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CostOfGoodsSold_salesOrderId_key" ON "CostOfGoodsSold"("salesOrderId");

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_assignedToTeamMemberId_fkey" FOREIGN KEY ("assignedToTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_confirmerTeamMemberId_fkey" FOREIGN KEY ("confirmerTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_salesRepTeamMemberId_fkey" FOREIGN KEY ("salesRepTeamMemberId") REFERENCES "team_member"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_paymentTermsId_fkey" FOREIGN KEY ("paymentTermsId") REFERENCES "payment_terms"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderPackLine" ADD CONSTRAINT "SalesOrderPackLine_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderPackLine" ADD CONSTRAINT "SalesOrderPackLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderPickLine" ADD CONSTRAINT "SalesOrderPickLine_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderPickLine" ADD CONSTRAINT "SalesOrderPickLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderPickAllocationLine" ADD CONSTRAINT "SalesOrderPickAllocationLine_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderPickAllocationLine" ADD CONSTRAINT "SalesOrderPickAllocationLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderPickAllocationFailure" ADD CONSTRAINT "SalesOrderPickAllocationFailure_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderPickAllocationFailure" ADD CONSTRAINT "SalesOrderPickAllocationFailure_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderRestockLine" ADD CONSTRAINT "SalesOrderRestockLine_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderRestockLine" ADD CONSTRAINT "SalesOrderRestockLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderShipLine" ADD CONSTRAINT "SalesOrderShipLine_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderPaymentLine" ADD CONSTRAINT "SalesOrderPaymentLine_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostOfGoodsSold" ADD CONSTRAINT "CostOfGoodsSold_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

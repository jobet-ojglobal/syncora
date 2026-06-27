/*
  Warnings:

  - You are about to drop the `CostOfGoodsSold` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrderLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrderPackLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrderPaymentLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrderPickAllocationFailure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrderPickAllocationLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrderPickLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrderRestockLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrderShipLine` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CostOfGoodsSold" DROP CONSTRAINT "CostOfGoodsSold_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_assignedToTeamMemberId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_confirmerTeamMemberId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_customerId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_locationId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_paymentTermsId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_salesRepTeamMemberId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderLine" DROP CONSTRAINT "SalesOrderLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderLine" DROP CONSTRAINT "SalesOrderLine_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderPackLine" DROP CONSTRAINT "SalesOrderPackLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderPackLine" DROP CONSTRAINT "SalesOrderPackLine_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderPaymentLine" DROP CONSTRAINT "SalesOrderPaymentLine_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderPickAllocationFailure" DROP CONSTRAINT "SalesOrderPickAllocationFailure_productId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderPickAllocationFailure" DROP CONSTRAINT "SalesOrderPickAllocationFailure_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderPickAllocationLine" DROP CONSTRAINT "SalesOrderPickAllocationLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderPickAllocationLine" DROP CONSTRAINT "SalesOrderPickAllocationLine_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderPickLine" DROP CONSTRAINT "SalesOrderPickLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderPickLine" DROP CONSTRAINT "SalesOrderPickLine_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderRestockLine" DROP CONSTRAINT "SalesOrderRestockLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderRestockLine" DROP CONSTRAINT "SalesOrderRestockLine_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderShipLine" DROP CONSTRAINT "SalesOrderShipLine_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "sales_order_attachment" DROP CONSTRAINT "sales_order_attachment_salesOrderId_fkey";

-- DropTable
DROP TABLE "CostOfGoodsSold";

-- DropTable
DROP TABLE "SalesOrder";

-- DropTable
DROP TABLE "SalesOrderLine";

-- DropTable
DROP TABLE "SalesOrderPackLine";

-- DropTable
DROP TABLE "SalesOrderPaymentLine";

-- DropTable
DROP TABLE "SalesOrderPickAllocationFailure";

-- DropTable
DROP TABLE "SalesOrderPickAllocationLine";

-- DropTable
DROP TABLE "SalesOrderPickLine";

-- DropTable
DROP TABLE "SalesOrderRestockLine";

-- DropTable
DROP TABLE "SalesOrderShipLine";

-- CreateTable
CREATE TABLE "sales_order" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sales_order_pkey" PRIMARY KEY ("id")
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
    "timestamp" TEXT NOT NULL,
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
    "timestamp" TEXT NOT NULL,

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
    "timestamp" TEXT NOT NULL,

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
    "timestamp" TEXT NOT NULL,

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
    "timestamp" TEXT NOT NULL,

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
    "timestamp" TEXT NOT NULL,

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
    "timestamp" TEXT NOT NULL,

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
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "sales_order_payment_line_pkey" PRIMARY KEY ("salesOrderPaymentHistoryLineId")
);

-- CreateTable
CREATE TABLE "cost_of_goods_sold" (
    "salesOrderCostOfGoodsSoldId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "costOfGoodsSold" DECIMAL(18,5) NOT NULL,

    CONSTRAINT "cost_of_goods_sold_pkey" PRIMARY KEY ("salesOrderCostOfGoodsSoldId")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_inflowId_key" ON "sales_order"("inflowId");

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
CREATE UNIQUE INDEX "sales_order_line_salesOrderId_key" ON "sales_order_line"("salesOrderId");

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
CREATE INDEX "purchase_order_attachment_purchaseOrderId_idx" ON "purchase_order_attachment"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_line_purchaseOrderId_idx" ON "purchase_order_line"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_line_productId_idx" ON "purchase_order_line"("productId");

-- CreateIndex
CREATE INDEX "purchase_order_payment_line_purchaseOrderId_idx" ON "purchase_order_payment_line"("purchaseOrderId");

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
CREATE INDEX "sales_order_attachment_salesOrderId_idx" ON "sales_order_attachment"("salesOrderId");

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

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

-- CreateIndex
CREATE UNIQUE INDEX "vendor_due_inflowId_key" ON "vendor_due"("inflowId");

-- CreateIndex
CREATE INDEX "vendor_due_vendorId_idx" ON "vendor_due"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_due_currencyId_idx" ON "vendor_due"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_due_vendorId_currencyId_key" ON "vendor_due"("vendorId", "currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_balance_inflowId_key" ON "vendor_balance"("inflowId");

-- CreateIndex
CREATE INDEX "vendor_balance_vendorId_idx" ON "vendor_balance"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_balance_currencyId_idx" ON "vendor_balance"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_balance_vendorId_currencyId_key" ON "vendor_balance"("vendorId", "currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_credit_inflowId_key" ON "vendor_credit"("inflowId");

-- CreateIndex
CREATE INDEX "vendor_credit_vendorId_idx" ON "vendor_credit"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_credit_currencyId_idx" ON "vendor_credit"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_credit_vendorId_currencyId_key" ON "vendor_credit"("vendorId", "currencyId");

-- AddForeignKey
ALTER TABLE "vendor_due" ADD CONSTRAINT "vendor_due_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_due" ADD CONSTRAINT "vendor_due_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_balance" ADD CONSTRAINT "vendor_balance_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_balance" ADD CONSTRAINT "vendor_balance_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_credit" ADD CONSTRAINT "vendor_credit_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_credit" ADD CONSTRAINT "vendor_credit_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("inflowId") ON DELETE RESTRICT ON UPDATE CASCADE;

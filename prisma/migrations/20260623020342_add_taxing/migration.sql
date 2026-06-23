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
    "timestamp" TEXT,
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
    "timestamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tax_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "taxing_scheme_inflowId_key" ON "taxing_scheme"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_code_inflowId_key" ON "tax_code"("inflowId");

-- CreateIndex
CREATE INDEX "tax_code_taxingSchemeId_idx" ON "tax_code"("taxingSchemeId");

-- AddForeignKey
ALTER TABLE "taxing_scheme" ADD CONSTRAINT "taxing_scheme_defaultTaxCodeId_fkey" FOREIGN KEY ("defaultTaxCodeId") REFERENCES "tax_code"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_code" ADD CONSTRAINT "tax_code_taxingSchemeId_fkey" FOREIGN KEY ("taxingSchemeId") REFERENCES "taxing_scheme"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

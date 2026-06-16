-- AlterTable
ALTER TABLE "location" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "categoryId" TEXT;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("inflowId") ON DELETE SET NULL ON UPDATE CASCADE;

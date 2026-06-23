/*
  Warnings:

  - A unique constraint covering the columns `[inflowCustomerId]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "inflowCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_inflowCustomerId_key" ON "user"("inflowCustomerId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_inflowCustomerId_fkey" FOREIGN KEY ("inflowCustomerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

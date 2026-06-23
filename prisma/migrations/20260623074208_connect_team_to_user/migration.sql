/*
  Warnings:

  - A unique constraint covering the columns `[teamMemberId]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Admin', 'StoreManager', 'Customer', 'InventoryClerk', 'SalesAssociate', 'Cashier', 'WarehouseStaff', 'Auditor', 'SupportStaff');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'Customer',
ADD COLUMN     "teamMemberId" TEXT,
ALTER COLUMN "emailVerified" SET DEFAULT false,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "user_teamMemberId_key" ON "user"("teamMemberId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

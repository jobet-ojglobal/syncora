/*
  Warnings:

  - You are about to drop the `inflow_integration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "inflow_integration";

-- CreateTable
CREATE TABLE "team_member" (
    "id" TEXT NOT NULL,
    "inflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canBeSalesRep" BOOLEAN NOT NULL DEFAULT false,
    "accessAllLocations" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member_access_right" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "rightName" TEXT NOT NULL,

    CONSTRAINT "team_member_access_right_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member_location" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "locationInflowId" TEXT NOT NULL,

    CONSTRAINT "team_member_location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_member_inflowId_key" ON "team_member"("inflowId");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_email_key" ON "team_member"("email");

-- CreateIndex
CREATE INDEX "team_member_access_right_rightName_idx" ON "team_member_access_right"("rightName");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_access_right_teamMemberId_rightName_key" ON "team_member_access_right"("teamMemberId", "rightName");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_location_teamMemberId_locationInflowId_key" ON "team_member_location"("teamMemberId", "locationInflowId");

-- AddForeignKey
ALTER TABLE "team_member_access_right" ADD CONSTRAINT "team_member_access_right_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_location" ADD CONSTRAINT "team_member_location_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_location" ADD CONSTRAINT "team_member_location_locationInflowId_fkey" FOREIGN KEY ("locationInflowId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

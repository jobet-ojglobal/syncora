/*
  Warnings:

  - You are about to drop the column `source` on the `inflow_webhook_event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inflow_webhook_event" DROP COLUMN "source";

-- DropEnum
DROP TYPE "InflowSource";

-- CreateTable
CREATE TABLE "partner_webhook" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "consecutiveFailureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_webhook_event" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_webhook_url_key" ON "partner_webhook"("url");

-- CreateIndex
CREATE INDEX "partner_webhook_event_eventType_idx" ON "partner_webhook_event"("eventType");

-- CreateIndex
CREATE INDEX "partner_webhook_event_receivedAt_idx" ON "partner_webhook_event"("receivedAt");

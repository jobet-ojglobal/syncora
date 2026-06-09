/*
  Warnings:

  - You are about to drop the `InflowIntegration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InflowWebhookEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `webhook_event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `webhook_subscription` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[url]` on the table `inflow_webhook` will be added. If there are existing duplicate values, this will fail.

*/
-- DropTable
DROP TABLE "InflowIntegration";

-- DropTable
DROP TABLE "InflowWebhookEvent";

-- DropTable
DROP TABLE "webhook_event";

-- DropTable
DROP TABLE "webhook_subscription";

-- CreateTable
CREATE TABLE "inflow_integration" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT,
    "webhookUrl" TEXT,
    "secret" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inflow_integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inflow_webhook_event" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inflow_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inflow_integration_webhookId_key" ON "inflow_integration"("webhookId");

-- CreateIndex
CREATE INDEX "inflow_webhook_event_eventType_idx" ON "inflow_webhook_event"("eventType");

-- CreateIndex
CREATE INDEX "inflow_webhook_event_receivedAt_idx" ON "inflow_webhook_event"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "inflow_webhook_url_key" ON "inflow_webhook"("url");

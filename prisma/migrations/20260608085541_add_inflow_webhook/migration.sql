/*
  Warnings:

  - You are about to drop the `WebhookEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookSubscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "WebhookEvent";

-- DropTable
DROP TABLE "WebhookSubscription";

-- CreateTable
CREATE TABLE "webhook_subscription" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "remoteId" TEXT,
    "url" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_event" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inflow_webhook" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "consecutiveFailureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inflow_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_event_provider_eventType_idx" ON "webhook_event"("provider", "eventType");

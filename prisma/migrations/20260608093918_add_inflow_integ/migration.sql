-- CreateTable
CREATE TABLE "InflowIntegration" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT,
    "webhookUrl" TEXT,
    "secret" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InflowIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InflowWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InflowWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InflowIntegration_webhookId_key" ON "InflowIntegration"("webhookId");

-- CreateIndex
CREATE INDEX "InflowWebhookEvent_eventType_idx" ON "InflowWebhookEvent"("eventType");

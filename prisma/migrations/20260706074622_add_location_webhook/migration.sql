-- AlterTable
ALTER TABLE "location" ADD COLUMN     "url" TEXT;

-- CreateTable
CREATE TABLE "location_webhook" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "consecutiveFailureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_webhook_event" (
    "id" TEXT NOT NULL,
    "locationWebhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "errorMessage" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_webhook_url_key" ON "location_webhook"("url");

-- CreateIndex
CREATE INDEX "location_webhook_event_eventType_idx" ON "location_webhook_event"("eventType");

-- CreateIndex
CREATE INDEX "location_webhook_event_receivedAt_idx" ON "location_webhook_event"("receivedAt");

-- AddForeignKey
ALTER TABLE "location_webhook" ADD CONSTRAINT "location_webhook_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("inflowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_webhook_event" ADD CONSTRAINT "location_webhook_event_locationWebhookId_fkey" FOREIGN KEY ("locationWebhookId") REFERENCES "location_webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

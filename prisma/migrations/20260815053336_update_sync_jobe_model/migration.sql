-- AlterTable
ALTER TABLE "sync_job" ADD COLUMN     "errorType" TEXT,
ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hasError" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "sync_job_hasError_idx" ON "sync_job"("hasError");

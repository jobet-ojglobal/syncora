import { prisma } from "@/lib/prisma";

export class SyncCancelledError extends Error {
  constructor(message = "Sync job was cancelled by user.") {
    super(message);
    this.name = "SyncCancelledError";
  }
}

export async function checkCancellation(jobId: string): Promise<void> {
  const syncJob = await prisma.syncJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  });

  if (syncJob?.status === "cancelled") {
    throw new SyncCancelledError();
  }
}
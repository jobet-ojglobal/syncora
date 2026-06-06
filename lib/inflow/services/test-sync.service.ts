// services/test-sync.service.ts

export interface TestSyncResult {
  success: boolean;
  source: string;
  processed: number;
  completedAt: string;
  records: {
    id: string;
    source: string;
    timestamp: Date;
    value: number;
  }[];
}

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

export class TestSyncService {
  async sync(
    source: string,
    options?: SyncOptions
  ): Promise<{
    success: boolean;
    source: string;
    processed: number;
    completedAt: string;
  }> {
    const syncData: TestSyncResult["records"] = [];

    for (let i = 0; i < 5; i++) {
      syncData.push({
        id: `sync-${Date.now()}-${i}`,
        source,
        timestamp: new Date(),
        value: Math.round(Math.random() * 100),
      });
    }

    const total = syncData.length;

    for (let i = 0; i < total; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      const progress = Math.round(
        ((i + 1) / total) * 100
      );

      await options?.onProgress?.(progress);
    }

    return {
      success: true,
      source,
      processed: total,
      completedAt: new Date().toISOString(),
    };
  }
}
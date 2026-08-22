export type SyncOptions = {
  onProgress?: (progress: number, lastCursorId?: string) => Promise<void>;
  checkSignal?: () => Promise<void>;
  batchSize?: number;
  delayBetweenBatchesMs?: number;
  initialCursorId?: string;
};
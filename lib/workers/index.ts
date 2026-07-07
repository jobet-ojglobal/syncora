const isServer = typeof window === 'undefined';
const isBuilding = process.env.NEXT_PHASE === 'phase-production-build';

// Extend the global object type safely for TypeScript
const globalForWorkers = global as typeof globalThis & {
  workersStarted?: boolean;
};

if (isServer && !isBuilding && !globalForWorkers.workersStarted) {
  // Flag them as started immediately to prevent HMR re-runs
  globalForWorkers.workersStarted = true;

  console.log(`🚀 Starting workers in ${process.env.NODE_ENV || 'development'} mode...`);

  import("./sync.worker").catch((err) => console.error("Sync worker failed:", err));
  import("./location.worker").catch((err) => console.error("Location worker failed:", err));
  import("./mid.worker").catch((err) => console.error("Mid worker failed:", err));
  import("./cloud.worker").catch((err) => console.error("Cloud worker failed:", err));
}
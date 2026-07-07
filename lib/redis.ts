// lib/redis.ts
// export const connection = {
//   host: process.env.REDIS_HOST || "redis",
//   port: parseInt(process.env.REDIS_PORT || "6379"),
//   retryStrategy: (times: number) => Math.min(times * 50, 2000),
// };

export const connection = {
  host: process.env.REDIS_HOST || "redis",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  // Maximize retry time or disable during build if necessary
  retryStrategy: (times: number) => {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      // Don't keep retrying endlessly during a build
      return null; 
    }
    return Math.min(times * 50, 2000);
  },
};
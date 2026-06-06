export const connection = {
  host: process.env.REDIS_HOST || "redis",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};
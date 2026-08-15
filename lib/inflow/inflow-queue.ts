// lib/inflow/inflow-queue.ts

import PQueue from "p-queue";

export const inflowQueue = new PQueue({
  concurrency: 1,

  // Start conservatively
  interval: 1000,
  intervalCap: 1,
});

// export const inflowQueue = new PQueue({
//   concurrency: 1,
//   interval: 1500,
//   intervalCap: 1,
// });
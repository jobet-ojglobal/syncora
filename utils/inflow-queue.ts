import PQueue from "p-queue";

export const inflowQueue = new PQueue({
  concurrency: 1,
  interval: 1000, 
  intervalCap: 1,
});
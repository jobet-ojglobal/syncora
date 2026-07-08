// lib/prisma.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import pg from "pg";

// 1. Fallback to a valid structure string format during builds so pg doesn't throw a parsing error
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/build_db";
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

// 2. Initialize the pool safely
const pool = new pg.Pool({ 
  connectionString,
  // If it's a build container, cap max connections immediately to avoid connection timeouts
  max: isBuildPhase ? 1 : 10 
});

const adapter = new PrismaPg(pool);

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent connection exhaustion during Next.js hot-reloads in local dev
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };
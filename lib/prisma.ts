// import "dotenv/config";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient, Prisma } from "../generated/prisma/client";
// import pg from "pg";

// const connectionString = process.env.DATABASE_URL || "postgresql://postgres:[REDACTED]@localhost:5432/build_db";
// const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

// const pool = new pg.Pool({ 
//   connectionString,
//   max: isBuildPhase ? 1 : 10 
// });

// const adapter = new PrismaPg(pool);

// const createExtendedPrismaClient = () => {
//   const baseClient = new PrismaClient({ adapter });

//   return baseClient.$extends({
//     model: {
//       $allModels: {
//         async softDelete<T>(this: T, id: string | number) {
//           const context = Prisma.getExtensionContext(this);
          
//           // Build update payload with known fields
//           const updateData: any = { deletedAt: new Date() };
          
//           // Try to set optional fields; Prisma will ignore if they don't exist
//           updateData.isDefault = false;
//           updateData.isActive = false;

//           try {
//             return (context as any).update({
//               where: { id },
//               data: updateData,
//             });
//           } catch (error: any) {
//             // If fields don't exist, retry with just deletedAt
//             if (error.code === 'P2025' || error.message?.includes('Unknown field')) {
//               return (context as any).update({
//                 where: { id },
//                 data: { deletedAt: new Date() },
//               });
//             }
//             throw error;
//           }
//         },
//         async restore<T>(this: T, id: string | number) {
//           const context = Prisma.getExtensionContext(this);
//           return (context as any).update({
//             where: { id },
//             data: { deletedAt: null },
//           });
//         },
//       },
//     },
//     query: {
//       $allModels: {
//         async findMany({ model, operation, args, query }) {
//           // Safely inject deletedAt: null filter
//           const where = (args as any)?.where ?? {};
          
//           // Only inject if user didn't explicitly query deletedAt
//           if (!('deletedAt' in where)) {
//             (args as any).where = { ...where, deletedAt: null };
//           }
          
//           return query(args);
//         },
//         async findFirst({ model, operation, args, query }) {
//           const where = (args as any)?.where ?? {};
          
//           if (!('deletedAt' in where)) {
//             (args as any).where = { ...where, deletedAt: null };
//           }
          
//           return query(args);
//         },
//         async findUnique({ model, operation, args, query }) {
//           const where = (args as any)?.where ?? {};
          
//           if (!('deletedAt' in where)) {
//             (args as any).where = { ...where, deletedAt: null };
//           }
          
//           return query(args);
//         },
//         async count({ model, operation, args, query }) {
//           const where = (args as any)?.where ?? {};
          
//           if (!('deletedAt' in where)) {
//             (args as any).where = { ...where, deletedAt: null };
//           }
          
//           return query(args);
//         },
//         async upsert({ model, operation, args, query }) {
//           return query(args);
//         },
//       },
//     },
//   });
// };

// type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>;

// const globalForPrisma = globalThis as unknown as {
//   prisma: ExtendedPrismaClient | undefined;
// };

// export type ExtendedPrismaTransaction = Omit<
//   ExtendedPrismaClient,
//   "$connect" | "$disconnect" | "$use" | "$on" | "$transaction" | "$extends"
// >;

// let prisma: ExtendedPrismaClient;

// // if (process.env.NODE_ENV === "production") {
// //   prisma = createExtendedPrismaClient();
// // } else {
// //   if (!globalForPrisma.prisma) {
// //     globalForPrisma.prisma = createExtendedPrismaClient();
// //   }
// //   prisma = globalForPrisma.prisma;
// // }

// export { prisma };


// // lib/prisma.ts
// import "dotenv/config";
// import { PrismaPg } from "@prisma/adapter-pg"; // or '@prisma/adapter-pg' depending on your import path alias
// import { PrismaClient, Prisma } from "../generated/prisma/client";
// import pg from "pg";

// // 1. Fallback to a valid structure string format during builds so pg doesn't throw a parsing error
// const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/build_db";
// const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

// // Initialize the pool safely
// const pool = new pg.Pool({ 
//   connectionString,
//   // If it's a build container, cap max connections immediately to avoid connection timeouts
//   max: isBuildPhase ? 1 : 10 
// });

// const adapter = new PrismaPg(pool);

// // Helper function that instantiates Prisma Client and injects the soft-delete extension
// const createExtendedPrismaClient = () => {
//   const baseClient = new PrismaClient({ adapter });

//   return baseClient.$extends({
//     model: {
//       $allModels: {
//         async softDelete<T>(this: T, id: string | number) {
//           const context = Prisma.getExtensionContext(this);
          
//           // 1. Extract the active model's name from the Prisma context
//           const modelName = (context as any).$name;

//           // 2. Safely check if this specific model has an 'isDefault' column
//           const hasIsDefault = (baseClient as any).[modelName]
//             ?.fields?.some((f: any) => f.name === 'isDefault');
          
//           const hasIsActive= (baseClient as any).[modelName]
//             ?.fields?.some((f: any) => f.name === 'isActive');

//           // 3. Build the update payload dynamically
//           const updateData: any = { deletedAt: new Date() };
          
//           if (hasIsDefault) {
//             updateData.isDefault = false;
//           }

//           if(hasIsActive) {
//             updateData.isActive = false;
//           }

//           // 4. Execute the update
//           return (context as any).update({
//             where: { id },
//             data: updateData,
//           });
//         },
//         async restore<T>(this: T, id: string | number) {
//           const context = Prisma.getExtensionContext(this);
//           return (context as any).update({
//             where: { id },
//             data: { deletedAt: null },
//           });
//         },
//       },
//     },
//     query: {
//       $allModels: {
//         async findMany({ model, operation, args, query }) {
//           const hasDeletedAt = (baseClient as any)._dmmf?.modelMap?.[model]
//             ?.fields?.some((f: any) => f.name === 'deletedAt');

//           if (!hasDeletedAt || (args as any)?.where?.deletedAt !== undefined) {
//             return query(args);
//           }
//           args.where = { ...args.where, deletedAt: null };
//           return query(args);
//         },
//         async findFirst({ model, operation, args, query }) {
//           const hasDeletedAt = (baseClient as any)._dmmf?.modelMap?.[model]
//             ?.fields?.some((f: any) => f.name === 'deletedAt');

//           if (!hasDeletedAt || (args as any)?.where?.deletedAt !== undefined) return query(args);
//           args.where = { ...args.where, deletedAt: null };
//           return query(args);
//         },
//         async findUnique({ model, operation, args, query }) {
//           const hasDeletedAt = (baseClient as any)._dmmf?.modelMap?.[model]
//             ?.fields?.some((f: any) => f.name === 'deletedAt');

//           if (!hasDeletedAt || (args as any)?.where?.deletedAt !== undefined) return query(args);
//           args.where = { ...args.where, deletedAt: null };
//           return query(args);
//         },
//         async count({ model, operation, args, query }) {
//           const hasDeletedAt = (baseClient as any)._dmmf?.modelMap?.[model]
//             ?.fields?.some((f: any) => f.name === 'deletedAt');

//           if (!hasDeletedAt || (args as any)?.where?.deletedAt !== undefined) return query(args);
//           args.where = { ...args.where, deletedAt: null };
//           return query(args);
//         },
//         // ADD THIS EXPLICIT UPSERT INTERCEPTOR
//         async upsert({ model, operation, args, query }) {
//           // Do not mutate or inject deletedAt constraints into the upsert where block.
//           // This keeps unique constraints clean and prevents Null Constraint Violations.
//           return query(args);
//         },
//       },
//     },
//   });
// };

// // Define type based on our extended client execution structure
// type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>;

// const globalForPrisma = globalThis as unknown as {
//   prisma: ExtendedPrismaClient | undefined;
// };

// // Add this export here:
// export type ExtendedPrismaTransaction = Omit<
//   ExtendedPrismaClient,
//   "$connect" | "$disconnect" | "$use" | "$on" | "$transaction" | "$extends"
// >;

// let prisma: ExtendedPrismaClient;

// if (process.env.NODE_ENV === "production") {
//   prisma = createExtendedPrismaClient();
// } else {
//   // Prevent connection exhaustion during Next.js hot-reloads in local dev
//   if (!globalForPrisma.prisma) {
//     globalForPrisma.prisma = createExtendedPrismaClient();
//   }
//   prisma = globalForPrisma.prisma;
// }

// export { prisma };

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



import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract Query Parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "all";
    const source = searchParams.get("source") || "all";

    // Build Dynamic Where Conditions
    const where: Prisma.SyncJobWhereInput = {};

    if (status !== "all") {
      where.status = status;
    }

    if (source !== "all") {
      where.source = source;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { source: { contains: search, mode: "insensitive" } },
        { error: { contains: search, mode: "insensitive" } },
      ];
    }

    // Execute Concurrent Queries for Performance
    const [jobs, totalJobs] = await Promise.all([
      prisma.syncJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.syncJob.count({ where }),
    ]);

    const totalPages = Math.ceil(totalJobs / limit);

    return NextResponse.json({
      jobs,
      pagination: {
        totalJobs,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch sync jobs:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// // GET /api/sync
// // Supports querying:
// // 1. Single job status by jobId: /api/sync?jobId=xxx
// // 2. Active job check by source: /api/sync?source=outsync_inventory_levels
// // 3. Paginated list with filters: /api/sync?status=pending&source=xxx&search=xxx&page=1&limit=50
// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);

//     const jobId = searchParams.get("jobId");
//     const source = searchParams.get("source");
//     const status = searchParams.get("status");
//     const search = searchParams.get("search");
//     const page = parseInt(searchParams.get("page") || "1", 10);
//     const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

//     // 1. Single Job Retrieval (Used by progress polling hook)
//     if (jobId) {
//       const job = await prisma.syncJob.findUnique({
//         where: { id: jobId },
//       });

//       if (!job) {
//         return NextResponse.json({ error: "Sync job not found" }, { status: 404 });
//       }

//       return NextResponse.json(job);
//     }

//     // 2. Active Job Check by Source (Used on component mount)
//     if (source && !searchParams.has("page") && !searchParams.has("status") && !search) {
//       const activeJob = await prisma.syncJob.findFirst({
//         where: {
//           source,
//           status: { in: ["pending", "processing", "retrying"] },
//         },
//         orderBy: { createdAt: "desc" },
//       });

//       return NextResponse.json({ activeJob });
//     }

//     // 3. Workspace List Query (Supports filters & search)
//     const whereClause: any = {};

//     if (status && status !== "all") {
//       whereClause.status = status;
//     }

//     if (source && source !== "all") {
//       whereClause.source = source;
//     }

//     if (search) {
//       whereClause.OR = [
//         { id: { contains: search, mode: "insensitive" } },
//         { source: { contains: search, mode: "insensitive" } },
//         { error: { contains: search, mode: "insensitive" } },
//       ];
//     }

//     const skip = (page - 1) * limit;

//     const [jobs, total] = await Promise.all([
//       prisma.syncJob.findMany({
//         where: whereClause,
//         orderBy: { createdAt: "desc" },
//         skip,
//         take: limit,
//       }),
//       prisma.syncJob.count({ where: whereClause }),
//     ]);

//     return NextResponse.json({
//       jobs,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error: any) {
//     console.error("[GET_SYNC_JOBS_ERROR]", error);
//     return NextResponse.json(
//       { error: "Failed to fetch sync jobs", details: error.message },
//       { status: 500 }
//     );
//   }
// }

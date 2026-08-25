import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockAdjustmentInput } from "@/schemas/stock-adjustment.schema";
import {
  AdjustmentStatus,
  InventorySerialAdjustmentAction,
  Prisma,
} from "@/generated/prisma/client";
import { ZodError } from "zod";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { PostAdjustmentPayload, AdjustmentService } from "@/services/stock-adjustment.service";

async function generateAdjustmentNumber(tx: Prisma.TransactionClient): Promise<string> {
  // Explicitly lock the table in EXCLUSIVE mode for the duration of this transaction.
  // Other concurrent transactions will wait until this transaction commits.
  await tx.$executeRaw`
    LOCK TABLE "inventory_adjustment" IN EXCLUSIVE MODE;
  `;

  // Fetch the current MAXIMUM numeric ID value instead of COUNT to safely handle deletes
  const result = await tx.$queryRaw<Array<{ max_num: bigint | number | null }>>`
    SELECT MAX(
      NULLIF(
        regexp_replace("adjustmentNumber", '^ADJ-', ''), 
        ''
      )::bigint
    ) AS max_num 
    FROM "inventory_adjustment"
  `;

  const currentMax = Number(result[0]?.max_num ?? 0);
  const nextNum = (currentMax + 1).toString().padStart(5, "0");

  return `ADJ-${nextNum}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate request body against Zod Schema
    // const validatedData = stockAdjustmentSchema.parse(body);
    const {
      id: existingAdjustmentId,
      reasonId,
      locationId,
      remarks,
      status,
      lines,
    } = body as StockAdjustmentInput;
    
    // TODO: Replace with dynamic user context from session / auth header
    const performedById = "8ff3e71d-eb02-425d-8e0f-00a69fc8e482";

    const postPayload: PostAdjustmentPayload = {
      existingAdjustmentId: existingAdjustmentId,
      locationId: locationId,
      reasonId: reasonId,
      remarks: remarks || undefined,
      performedById: performedById,
      lines: lines,
    };

    const queueProvider = {
      addJob: async (jobName: string, payload: any) => {
        const queue = getMidSyncQueue();
        await queue.add(jobName, payload);
      },
    };
    
    const adjustmentLocalCloudService = new AdjustmentService(prisma, queueProvider);
    const result = adjustmentLocalCloudService.postAdjustment(postPayload);

    return NextResponse.json(
      {
        message:
          status === AdjustmentStatus.DRAFT
            ? "Adjustment draft saved successfully."
            : "Adjustment posted successfully.",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    console.error("[INVENTORY_ADJUSTMENT_POST_ERROR]", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "An internal error occurred while processing the adjustment.",
      },
      { status: 500 }
    );
  }
}
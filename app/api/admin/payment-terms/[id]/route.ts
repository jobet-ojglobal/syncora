// app/api/admin/payment-terms/route.ts

import { prisma } from "@/lib/prisma";
import { SoftDeleteRepository } from "@/lib/softDeleteRepository";
import { NextRequest } from "next/dist/server/web/spec-extension/request";
import { NextResponse } from "next/dist/server/web/spec-extension/response";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: termId } = await context.params;

    if (!termId) {
      return NextResponse.json({ error: "Missing required credit maturity framework unique identifier string token tracking parameter." }, { status: 400 });
    }

    const paymentTerm = await prisma.paymentTerm.findFirst({
      where: { id: termId, deletedAt: null },
    });

    if(!paymentTerm) {
      return NextResponse.json({ error: "Payment terms rule not found or has been archived." }, { status: 404 });
    }

    // 🛡️ Preflight relationship integrity check loops: guarantee zero alignment anomalies
    const liveBoundCustomersCount = await prisma.customer.count({ where: { defaultPaymentTermsId: paymentTerm.inflowId } });
    const liveBoundVendorsCount = await prisma.vendor.count({ where: { defaultPaymentTermsId: paymentTerm.inflowId } });
    const liveBoundOrdersCount = await prisma.salesOrder.count({ where: { paymentTermsId: paymentTerm.inflowId } });

    const accumulatedSystemReferences = liveBoundCustomersCount + liveBoundVendorsCount + liveBoundOrdersCount;

    if (accumulatedSystemReferences > 0) {
      return NextResponse.json(
        { error: "Forbidden system mutation transaction. Target credit rule handles live invoicing anchors inside accounts and active orders files." },
        { status: 422 }
      );
    }

    await SoftDeleteRepository.softDelete('paymentTerm', termId);

    return NextResponse.json({ success: true, message: "Payment terms rule archived successfully." }, { status: 200 });
  } catch (error) {
    console.error("Payment terms rule archival sweep rolled back and failed:", error);
    return NextResponse.json({ error: "Internal Server database operational pipeline exception mutating timing values fields." }, { status: 500 });
  }
}
// app/api/admin/payment-terms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper: Normalize incoming maturity window days
const parseDaysDue = (val: any) => (val === "" || val === null || val === undefined ? null : parseInt(val, 10));

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, daysDue, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Mandatory system identification token and display label are required." },
        { status: 400 }
      );
    }

    // Atomic insert of the new payment term rule
    const newTerm = await prisma.paymentTerm.create({
      data: {
        inflowId: crypto.randomUUID().toLowerCase(),
        name: name.trim(),
        daysDue: parseDaysDue(daysDue),
        isActive
      }
    });

    return NextResponse.json(newTerm, { status: 201 });
  } catch (error: any) {
    console.error("Critical failure initializing settlement term rule:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Integration token collision. This identifier handle is already logged." }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Database storage pipeline breakdown." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, daysDue, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required modification identifier index." }, { status: 400 });
    }

    // Atomic update of the existing rule
    const updatedTerm = await prisma.paymentTerm.update({
      where: { id },
      data: {
        name: name.trim(),
        daysDue: parseDaysDue(daysDue),
        isActive
      }
    });

    return NextResponse.json(updatedTerm, { status: 200 });
  } catch (error) {
    console.error("Critical failure modifying maturity framework rules:", error);
    return NextResponse.json({ error: "Internal Database modification pipeline abort exception." }, { status: 500 });
  }
}
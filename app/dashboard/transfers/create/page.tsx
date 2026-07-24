// Example Server Action or Page Component behavior for creating drafts

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";



export default async function CreateTransferOrderPage() {
  // 1. Instantly generate a tracking sequence key on the server safely
  const generatedSequence = `TO-${Math.floor(100000 + Math.random() * 900000)}`;
  
  // 1. Fetch a fallback valid location from your database
  const fallbackLocation = await prisma.location.findFirst({
    select: { inflowId: true }
  });

  if (!fallbackLocation) {
    throw new Error("Initialization Failure: No system locations available to provision a draft context.");
  }

  // 2. Supply the valid ID to satisfy the database constraint safely
  const newDraftRecord = await prisma.transferOrder.create({
    data: {
      transferNumber: generatedSequence,
      sourceLocationId: fallbackLocation.inflowId,
      targetLocationId: fallbackLocation.inflowId, // Note: Your Zod schema blocks this, but Prisma allows it for initial creation
      status: "DRAFT",
      requestedById: "Mid App"
    }
  });

  // 3. Seamlessly redirect user to the workspace form context using the assigned id
  redirect(`/dashboard/transfers/${newDraftRecord.id}/edit`);
}
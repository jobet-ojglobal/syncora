import PageHeader from "@/components/layout/dashboard/PageHeader";
import { TransferOrderForm } from "@/components/transfer/transfer-form";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CreateTransferPage() {

  const [locations] = await Promise.all([
    prisma.location.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/transfers"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Transfers
      </Link>
      <PageHeader
        title=""
        description="" 
        // icon={}
      />
      <TransferOrderForm
        locations={locations.map((l) => ({
          inflowId: l.inflowId,
          name: l.name,
        }))}
       />
    </div>
  );
}


// // Example Server Action or Page Component behavior for creating drafts

// import { prisma } from "@/lib/prisma";
// import { redirect } from "next/navigation";



// export default async function CreateTransferOrderPage() {
//   // 1. Instantly generate a tracking sequence key on the server safely
//   const generatedSequence = `TO-${Math.floor(100000 + Math.random() * 900000)}`;
  
//   // 1. Fetch a fallback valid location from your database
//   const fallbackLocation = await prisma.location.findFirst({
//     select: { inflowId: true }
//   });

//   if (!fallbackLocation) {
//     throw new Error("Initialization Failure: No system locations available to provision a draft context.");
//   }

//   // 2. Supply the valid ID to satisfy the database constraint safely
//   const newDraftRecord = await prisma.transferOrder.create({
//     data: {
//       transferNumber: generatedSequence,
//       sourceLocationId: fallbackLocation.inflowId,
//       targetLocationId: fallbackLocation.inflowId, // Note: Your Zod schema blocks this, but Prisma allows it for initial creation
//       status: "DRAFT",
//       requestedById: "Mid App"
//     }
//   });

//   // 3. Seamlessly redirect user to the workspace form context using the assigned id
//   redirect(`/dashboard/transfers/${newDraftRecord.id}/edit`);
// }
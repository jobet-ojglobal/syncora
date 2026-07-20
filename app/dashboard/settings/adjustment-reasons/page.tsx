import { AdjustmentReasonsTable } from "@/components/inventory/adjustment-reasons-table";
import { prisma } from "@/lib/prisma";

export const revalidate = 0; // Ensure fresh data on navigation

export default async function AdjustmentReasonsPage() {
  const reasons = await prisma.adjustmentReason.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { localMappings: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates for Client Component boundary
  const formattedReasons = reasons.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <main className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adjustment Reasons</h1>
          <p className="text-sm text-muted-foreground">
            Manage operational inventory adjustment codes and mapping configurations.
          </p>
        </div>
      </div>

      <AdjustmentReasonsTable initialData={formattedReasons} />
    </main>
  );
}
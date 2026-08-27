// app/admin/purchase-orders/new/page.tsx
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { PurchaseOrderForm } from "@/components/purchase/purchase-form";
import { getPurchaseMetadata } from "@/services/purchase-order-metadata";

export default async function NewPurchaseOrder() {
  const catalogs = await getPurchaseMetadata();
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title="Purchase Order" 
        description="Map custom wholesale tiers, isolate pricing matrices channels groups, and define gross value tax absorption behaviors."
        className="border-b border-border pb-4"
      />
      <PurchaseOrderForm catalogs={catalogs}/>
    </div>
  );
}
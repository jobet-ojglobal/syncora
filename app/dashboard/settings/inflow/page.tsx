import InflowWebhookWorkspace from "@/components/integration/inflow-workspace";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { Database } from "lucide-react";

export default function InflowSettingsPage() {

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader 
        title="Inflow Webhooks" 
        description="Manage your Inflow webhook configurations and events." 
        icon={Database}
        className="border-b border-border pb-4"
      />
      <InflowWebhookWorkspace />
    </div>
  );
}
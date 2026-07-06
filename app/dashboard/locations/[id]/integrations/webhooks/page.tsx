// app/dashboard/locations/[id]/integrations/webhooks/page.tsx

import PartnerWorkspace from "@/components/webhook/location-workspace";

interface PageProps {
  params: Promise<{
    id: string; // This maps directly to the [id] directory name
  }>;
}

export default async function LocationWebhooksPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-6">
        {id}
      <PartnerWorkspace selectedLocationInflowId={id} />
    </div>
  );
}
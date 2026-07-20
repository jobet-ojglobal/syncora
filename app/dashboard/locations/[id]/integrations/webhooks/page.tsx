// app/dashboard/locations/[id]/integrations/webhooks/page.tsx
import LocationWebhookWorkspace from "@/components/location/location-webhook";

interface PageProps {
  params: Promise<{
    id: string; // This maps directly to the [id] directory name
  }>;
}

export default async function LocationWebhooksPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <LocationWebhookWorkspace selectedLocationInflowId={id} />
    </div>
  );
}
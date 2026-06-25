// partner-app/app/settings/webhooks/page.tsx
import WebhookSettings from "@/components/settings/webhook-settings";

export default function WebhookSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <WebhookSettings />
    </div>
  );
}
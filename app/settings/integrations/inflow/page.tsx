import { getIntegrationState } from "@/actions/inflow";
import { InflowSettingsForm } from "@/components/settings/inflow-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function InflowSettingsPage() {
  const { integration, syncedWebhooks } = await getIntegrationState();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-10 px-4">
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Manage third-party ERP access, data streams, and sync engines.
        </p>
      </div>
      <Separator />
      
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>inFlow Cloud Integration</CardTitle>
          <CardDescription>
            Bind webhooks to sync products, customers, and order lifecycle steps back to your engine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InflowSettingsForm
            integration={integration} 
            syncedWebhooks={syncedWebhooks} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
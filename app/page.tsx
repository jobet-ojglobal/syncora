// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { SyncButton } from "@/components/shared/sync-button";
// import WebhookTestButton from "./_components/TestWebhook";
// import InflowCloudHealth from "./_components/InflowCloud";
import InflowWorkspace from "@/components/settings/InflowWorkspace";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">

        {/* <Card>
          <CardHeader>
            <CardTitle>Sync Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
              <SyncButton
                source="products"
                title="Product Sync"
              />

              <SyncButton
                source="locations"
                title="Location Sync"
              />

              <SyncButton
                source="inventory"
                title="Inventory Sync"
              />

              <SyncButton
                source="customers"
                title="Customer Sync"
              />
          </CardContent>
        </Card> */}
      </main>
    </div>
  );
}

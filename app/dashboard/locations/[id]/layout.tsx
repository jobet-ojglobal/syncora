import { ArrowLeft, Building2, Clock, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import OverviewNav from "@/components/layout/dashboard/OverviewNav";
import { notFound, redirect } from "next/navigation";
import { LocationService } from "@/services/location.service";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/shared/delete-button";
import { Badge } from "@/components/ui/badge";

export const locationNav = (id: string) => [
  { label: "Overview", url: `/dashboard/locations/${id}` },
  { label: "Inventory", url: `/dashboard/locations/${id}/inventory` },
  { label: "Orders", url: `/dashboard/locations/${id}/orders` },
  { label: "Transfers", url: `/dashboard/locations/${id}/transfers` },
  { label: "Performance", url: `/dashboard/locations/${id}/performance` },
  { label: "Staff", url: `/dashboard/locations/${id}/staff` },
  { label: "Webhook", url: `/dashboard/locations/${id}/integrations/webhooks` },
];

export default async function LocationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: targetId } = await params;
  const location = await LocationService.getBasicLocation(targetId);

  if (!location) return notFound();

  const navItems = locationNav(targetId);
  const statusKey = location.isActive ? "Active" : "Inactive";

  return (
    <div className="w-full">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-3">
          
          {/* Back Navigation Button */}
          <Button asChild variant="ghost" size="sm" className="w-fit gap-1 text-xs -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/dashboard/locations">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Facilities
            </Link>
          </Button>
          
          {/* Main Info Header Segment */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row items-start gap-4 min-w-0">
              <div className="rounded-2xl bg-gray-800 p-4 text-primary-foreground shadow-sm shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
                    {location.name}
                  </h1>
                  
                  {location.isDefault && (
                    <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 text-[10px] font-semibold h-5">
                      Primary Hub
                    </Badge>
                  )}

                  <Badge variant="outline" className="gap-1.5 text-[10px] font-semibold h-5 px-2 bg-background shadow-2xs">
                    {location.isActive && (
                      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    {statusKey}
                  </Badge>
                </div>
                
                {/* Meta details segment */}
                <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                    {location.address?.address1 || "No Address Set"} - {location.address?.postalCode || "N/A"}
                  </span>
                  <span className="hidden sm:inline text-border">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                    Hours Not Set
                  </span>
                </div>
              </div>
            </div>

            {/* Layout Actions Container Group */}
            <div className="flex items-center gap-2 sm:w-auto w-full shrink-0">
              <Button asChild variant="outline" size="sm" className="gap-1.5 font-semibold text-xs rounded-xl shadow-2xs sm:flex-1 justify-center">
                <Link href={`/dashboard/locations/${location.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Location
                </Link>
              </Button>
              <div className="sm:flex-1 w-full">
                <DeleteButton
                  itemId={location.id}
                  itemName={location.name}
                  endpointUrl={`/api/admin/locations/${location.id}/soft-delete`}
                  variant="full"
                />
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="pt-2">
            <OverviewNav items={navItems} />
          </div>
        </div>
      </div>

      {/* Main Page Children Injector Slot */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </div>
    </div>
  );
}
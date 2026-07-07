import { ArrowLeft, Building2, Clock, Database, MapPin, Package, Pencil } from "lucide-react";
import Link from "next/link";
import OverviewNav from "@/components/layout/dashboard/OverviewNav";
import { locationStatusColors } from "@/helpers";
import { notFound } from "next/navigation";
import { LocationService } from "@/services/location.service";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/shared/delete-button";

export const locationNav = (id: string) => [
  {
    label: "Overview",
    url: `/dashboard/locations/${id}`,
  },
  {
    label: "Inventory",
    url: `/dashboard/locations/${id}/inventory`,
  },
  {
    label: "Orders",
    url: `/dashboard/locations/${id}/orders`,
  },
  {
    label: "Transfers",
    url: `/dashboard/locations/${id}/transfers`,
  },
  {
    label: "Performance",
    url: `/dashboard/locations/${id}/performance`,
  },
  {
    label: "Staff",
    url: `/dashboard/locations/${id}/staff`,
  },
  {
    label: "Webhook",
    url: `/dashboard/locations/${id}/integrations/webhooks`,
  },
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
    <div>
      <div className="border-b border-slate-200">
        <div className="mx-auto px-6 py-6">
          <div className="mb-7 space-y-3">
              <Button asChild variant="ghost" size="sm" className="w-fit gap-1 text-xs -ml-2">
                <Link href="/dashboard/locations">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Facilities
                </Link>
              </Button>
              
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-md shadow-slate-900/10 shrink-0">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        {location.name}
                      </h1>
                      
                      {location.isDefault && (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          Primary Hub
                        </span>
                      )}

                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border shadow-2xs bg-slate-100 text-slate-700 border-slate-200`}>
                        {location.isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        )}
                        {statusKey}
                      </span>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {location.address?.address1} - {location.address?.postalCode}
                      </span>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {"Hours Not set"}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/dashboard/locations/${location.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-800"
                >
                  <Pencil className="h-5 w-5" />
                  Edit Location
                </Link>
                {/* <DeleteButton
                  itemId={location.id}
                  itemName={loc.name}
                  endpointUrl={`/api/admin/locations/${loc.id}/soft-delete`}
                  onSuccess={fetchLocations}
                  variant="icon"
                /> */}
              </div>
          </div>

          <OverviewNav items={navItems} />
        </div>
      </div>

      {children}
    </div>
  );
}
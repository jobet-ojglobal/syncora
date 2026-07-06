import { ArrowLeft, Building2, Clock, Database, MapPin, Package, Pencil } from "lucide-react";
import Link from "next/link";
import OverviewNav from "@/components/layout/dashboard/OverviewNav";
import { locationStatusColors } from "@/helpers";
import { notFound } from "next/navigation";
import { LocationService } from "@/services/location.service";

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

  return (
    <div>
      <div className="border-b border-slate-200">
        <div className="mx-auto px-6 py-6">
          {/* HEADER BANNER CARD HERO */}
          <div className="mb-7 ">
            <div >
              <Link
                href="/admin/locations"
                className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Locations
              </Link>
              
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-md shadow-slate-900/10 shrink-0">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {location.name}
                      </h1>
                      {location.isDefault && (
                        <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
                          Primary Hub
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs ${locationStatusColors["Online"]}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        {location.isActive}
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
                  href={`/admin/locations/${location.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 font-semibold text-white hover:bg-slate-800"
                >
                  <Pencil className="h-5 w-5" />
                  Edit Location
                </Link>
              </div>
            </div>
          </div>

          {/* NAV */}
          <OverviewNav items={navItems} />
        </div>
      </div>

      {children}
    </div>
  );
}
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocationService } from "@/services/location.service";
import { 
  Layers, 
  Boxes, 
  ShoppingBag, 
  TrendingUp, 
  ArrowRightLeft, 
  AlertCircle 
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LocationMappingGrid } from "@/components/location/location-mapping-grid";
import { SublocationLinkModal } from "@/components/location/sublocation-link-modal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const { id } = await params;
  const location = await LocationService.getBasicLocation(id);
  return {
    title: `${location?.name || "Facility"} Overview | JG Enterprises`,
  };
}

export default async function LocationOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: targetId } = await params;
  
  // Fetch deep operational details for the target site and available locations
  const [location, rawLocationsList] = await Promise.all([
    LocationService.getBasicLocation(targetId),
    prisma.location.findMany({
      where: { NOT: { inflowId: targetId } },
      select: { 
        id: true,
        name: true,
        inflowId: true,
        linkedSublocation: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  ]);

  if (!location) return notFound();

  // Normalize locations list for disabled logic in modal
  const locationsList = rawLocationsList.filter(item => item.id !== targetId).map((loc) => ({
    inflowId: loc.inflowId,
    name: loc.name,
    alreadyLinkedSublocationId: loc.linkedSublocation[0]?.id || null,
    alreadyLinkedSublocationName: loc.linkedSublocation[0]?.name || null,
  }));

  const metrics = [
    {
      title: "Storage Density",
      value: `${location.sublocationsCount || 0} Zones`,
      description: "Configured staging bins & aisles",
      icon: Layers,
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      title: "Active Stock Lines",
      value: (location.inventoryItemsCount || 0).toLocaleString(),
      description: "Unique SKUs stored on site",
      icon: Boxes,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      title: "Fulfillment Backlog",
      value: (location.activeSalesOrdersCount || 0).toLocaleString(),
      description: "Pending queue orders routing",
      icon: ShoppingBag,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      title: "Turnover Velocity",
      value: `${location.totalSalesOrdersCount || 0} Total`,
      description: "Lifetime operational receipts",
      icon: TrendingUp,
      color: "text-indigo-500 bg-indigo-500/10",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      
      {/* 1. Core KPIs Aggregation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx} className="border border-border bg-card rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {metric.title}
                </span>
                <div className={`p-2 rounded-lg ${metric.color} shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground tracking-tight">
                  {metric.value}
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  {metric.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Secondary Contextual Breakdown split view layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Sublocations Registry Matrix */}
        <div className="lg:col-span-2 border border-border bg-card rounded-xl shadow-2xs flex flex-col overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between bg-muted/5">
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight">Internal Storage Zones Hierarchy</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Physical breakdown mapping layouts of this hub node.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs font-semibold rounded-lg h-8 shadow-2xs">
              <Link href={`/dashboard/locations/${targetId}/inventory`}>Configure Zones</Link>
            </Button>
          </div>

          <div className="p-5 flex-1">
            {!location.sublocationsList || location.sublocationsList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-lg bg-muted/10 min-h-[180px]">
                <AlertCircle className="h-6 w-6 text-muted-foreground/60 mb-2" />
                <p className="text-xs font-medium text-muted-foreground">No storage sublocations mapped to this facility node.</p>
                <p className="text-[11px] text-muted-foreground/60 max-w-[260px] mt-0.5">Items currently track on a flat system directly mapping to the main warehouse flooring.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {location.sublocationsList.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2 bg-background shadow-2xs text-xs font-medium text-foreground">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                      <span className="truncate">{sub.name}</span>
                    </div>

                    {/* Sublocation Link Radio Modal Trigger */}
                    <div className="flex items-center gap-2">
                      <SublocationLinkModal
                        sublocation={sub}
                        currentLocationId={targetId}
                        locationsList={locationsList}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Rapid Hub Logistics Action Center Links */}
        <div className="border border-border bg-card rounded-xl shadow-2xs flex flex-col overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/5">
            <h2 className="text-sm font-bold text-foreground tracking-tight">System Routing Hooks</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Inter-facility cross-dock controls and logistics logs.</p>
          </div>

          <div className="p-4 flex flex-col gap-2">
            <Link 
              href={`/dashboard/locations/${targetId}/orders`}
              className="flex items-center gap-3 p-3 border border-border bg-background rounded-xl hover:bg-muted/10 transition-colors group text-left shadow-2xs"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-foreground group-hover:text-indigo-500 transition-colors">Dispatch Queue</div>
                <div className="text-[10px] text-muted-foreground truncate font-medium">Verify pending order receipts and shipments.</div>
              </div>
            </Link>

            <Link 
              href={`/dashboard/locations/${targetId}/transfers`}
              className="flex items-center gap-3 p-3 border border-border bg-background rounded-xl hover:bg-muted/10 transition-colors group text-left shadow-2xs"
            >
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-foreground group-hover:text-indigo-500 transition-colors">Inter-Hub Transfers</div>
                <div className="text-[10px] text-muted-foreground truncate font-medium">Coordinate stock moves out to default locations.</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <LocationMappingGrid location={location} />
    </div>
  );
}

// 8/10/26
// import { Metadata } from "next";
// import { notFound } from "next/navigation";
// import { LocationService } from "@/services/location.service";
// import { 
//   Layers, 
//   Boxes, 
//   ShoppingBag, 
//   TrendingUp, 
//   ArrowRightLeft, 
//   AlertCircle 
// } from "lucide-react";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { LocationMappingGrid } from "@/components/location/location-mapping-grid";
// import { prisma } from "@/lib/prisma";

// export const dynamic = "force-dynamic";

// export async function generateMetadata({ 
//   params 
// }: { 
//   params: Promise<{ id: string }> 
// }): Promise<Metadata> {
//   const { id } = await params;
//   const location = await LocationService.getBasicLocation(id);
//   return {
//     title: `${location?.name || "Facility"} Overview | JG Enterprises`,
//   };
// }

// export default async function LocationOverviewPage({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   const { id: targetId } = await params;
  
//   // Fetch deep operational details for the target site
//   const [location, locationsList] = await Promise.all([
//     LocationService.getBasicLocation(targetId),
//     prisma.location.findMany({
//       where: { NOT: { id: targetId} },
//       select: { 
//         name: true,
//         inflowId: true,
//       }
//     })
//   ]);

//   if (!location) return notFound();

//   // Mock metric aggregates based on standard model properties mapped earlier
//   const metrics = [
//     {
//       title: "Storage Density",
//       value: `${location.sublocationsCount || 0} Zones`,
//       description: "Configured staging bins & aisles",
//       icon: Layers,
//       color: "text-blue-500 bg-blue-500/10",
//     },
//     {
//       title: "Active Stock Lines",
//       value: (location.inventoryItemsCount || 0).toLocaleString(),
//       description: "Unique SKUs stored on site",
//       icon: Boxes,
//       color: "text-emerald-500 bg-emerald-500/10",
//     },
//     {
//       title: "Fulfillment Backlog",
//       value: (location.activeSalesOrdersCount || 0).toLocaleString(),
//       description: "Pending queue orders routing",
//       icon: ShoppingBag,
//       color: "text-amber-500 bg-amber-500/10",
//     },
//     {
//       title: "Turnover Velocity",
//       value: `${location.totalSalesOrdersCount || 0} Total`,
//       description: "Lifetime operational receipts",
//       icon: TrendingUp,
//       color: "text-indigo-500 bg-indigo-500/10",
//     },
//   ];

//   return (
//     <div className="space-y-6 animate-in fade-in-50 duration-200">
      
//       {/* 1. Core KPIs Aggregation Grid Grid */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         {metrics.map((metric, idx) => {
//           const Icon = metric.icon;
//           return (
//             <div key={idx} className="border border-border bg-card rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-3">
//               <div className="flex items-center justify-between">
//                 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
//                   {metric.title}
//                 </span>
//                 <div className={`p-2 rounded-lg ${metric.color} shrink-0`}>
//                   <Icon className="h-4 w-4" />
//                 </div>
//               </div>
//               <div>
//                 <h3 className="text-2xl font-bold text-foreground tracking-tight">
//                   {metric.value}
//                 </h3>
//                 <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
//                   {metric.description}
//                 </p>
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       {/* 2. Secondary Contextual Breakdown split view layouts */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
//         {/* Left 2 Columns: Sublocations Registry Matrix */}
//         <div className="lg:col-span-2 border border-border bg-card rounded-xl shadow-2xs flex flex-col overflow-hidden">
//           <div className="p-5 border-b border-border flex items-center justify-between bg-muted/5">
//             <div>
//               <h2 className="text-sm font-bold text-foreground tracking-tight">Internal Storage Zones Hierarchy</h2>
//               <p className="text-xs text-muted-foreground mt-0.5">Physical breakdown mapping layouts of this hub node.</p>
//             </div>
//             <Button asChild variant="outline" size="sm" className="text-xs font-semibold rounded-lg h-8 shadow-2xs">
//               <Link href={`/dashboard/locations/${targetId}/inventory`}>Configure Zones</Link>
//             </Button>
//           </div>

//           <div className="p-5 flex-1">
//             {!location.sublocationsList || location.sublocationsList.length === 0 ? (
//               <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-lg bg-muted/10 min-h-[180px]">
//                 <AlertCircle className="h-6 w-6 text-muted-foreground/60 mb-2" />
//                 <p className="text-xs font-medium text-muted-foreground">No storage sublocations mapped to this facility node.</p>
//                 <p className="text-[11px] text-muted-foreground/60 max-w-[260px] mt-0.5">Items currently track on a flat system directly mapping to the main warehouse flooring.</p>
//               </div>
//             ) : (
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                 {location.sublocationsList.map((sub: any) => (
//                   <div key={sub.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2 bg-background shadow-2xs text-xs font-medium text-foreground">
//                     <div className="flex items-center gap-2 truncate">
//                       <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
//                       <span className="truncate">{sub.name}</span>
//                     </div>
//                     <Badge variant="secondary" className="text-[10px] px-1.5 h-4.5 font-semibold">Active</Badge>
//                     {/* Link this this sublocation in one location in locationList one to one connect, add modal with location list to connect ; radio button  */}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Right 1 Column: Rapid Hub Logistics Action Center Links */}
//         <div className="border border-border bg-card rounded-xl shadow-2xs flex flex-col overflow-hidden">
//           <div className="p-5 border-b border-border bg-muted/5">
//             <h2 className="text-sm font-bold text-foreground tracking-tight">System Routing Hooks</h2>
//             <p className="text-xs text-muted-foreground mt-0.5">Inter-facility cross-dock controls and logistics logs.</p>
//           </div>

//           <div className="p-4 flex flex-col gap-2">
            
//             <Link 
//               href={`/dashboard/locations/${targetId}/orders`}
//               className="flex items-center gap-3 p-3 border border-border bg-background rounded-xl hover:bg-muted/10 transition-colors group text-left shadow-2xs"
//             >
//               <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
//                 <ShoppingBag className="h-4 w-4" />
//               </div>
//               <div className="min-w-0 flex-1">
//                 <div className="text-xs font-bold text-foreground group-hover:text-indigo-500 transition-colors">Dispatch Queue</div>
//                 <div className="text-[10px] text-muted-foreground truncate font-medium">Verify pending order receipts and shipments.</div>
//               </div>
//             </Link>

//             <Link 
//               href={`/dashboard/locations/${targetId}/transfers`}
//               className="flex items-center gap-3 p-3 border border-border bg-background rounded-xl hover:bg-muted/10 transition-colors group text-left shadow-2xs"
//             >
//               <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
//                 <ArrowRightLeft className="h-4 w-4" />
//               </div>
//               <div className="min-w-0 flex-1">
//                 <div className="text-xs font-bold text-foreground group-hover:text-indigo-500 transition-colors">Inter-Hub Transfers</div>
//                 <div className="text-[10px] text-muted-foreground truncate font-medium">Coordinate stock moves out to default locations.</div>
//               </div>
//             </Link>

//           </div>
//         </div>
//       </div>
//       <LocationMappingGrid location={location} />
//     </div>
//   );
// }
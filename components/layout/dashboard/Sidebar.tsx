"use client"

import * as React from "react"
import useSWR from "swr"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { NavMain } from "./NavMain"
import { NavUser } from "./NavUser"
import { data } from "@/lib/constData"
import { LocationSwitcher } from "./LocationSwitcher"
import { useRouter } from "next/navigation"

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LocationItem {
  id: string;
  name: string;
  url: string | null;
  isOnline: boolean;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const router = useRouter();

  // 1. Fetch locations directly from your real-time prisma pipeline endpoint via SWR
  const { data: locations, error, isLoading } = useSWR<LocationItem[]>(
    "/api/admin/locations/webhooks",
    fetcher,
    {
      refreshInterval: 30000, // Optional: Poll network status updates every 30 seconds
    }
  );

  // 2. Local State tracking the currently selected Active global location workspace stream
  const [currentLocationId, setCurrentLocationId] = React.useState<string>("");

  // Auto-select the first location once the matrix logs data arrives
  React.useEffect(() => {
    if (locations && locations.length > 0 && !currentLocationId) {
      // Prioritize setting default workspace identifier flags if you have them, otherwise pick index 0
      setCurrentLocationId(locations[0].id);
    }
  }, [locations, currentLocationId]);

  const handleLocationWorkspaceChange = (locationId: string) => {
    setCurrentLocationId(locationId);
    console.log(`Switched active data stream to inflow node: ${locationId}`);
    // Optional architectural implementation: Push route parameters or update global context providers
    router.push(`/dashboard/locations/${locationId}`)
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        {isLoading || !locations ? (
          <div className="h-12 flex items-center px-4 text-xs text-muted-foreground animate-pulse">
            Loading active workspaces...
          </div>
        ) : (
          <LocationSwitcher 
            locations={locations}
            currentLocationId={currentLocationId}
            onLocationChange={handleLocationWorkspaceChange}
          />
        )}
      </SidebarHeader>
      
      <SidebarContent className="pt-2">
        <NavMain items={data.adminMain} />
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}

// "use client"

// import * as React from "react"
// import {
//   Sidebar,
//   SidebarContent,
//   SidebarFooter,
//   SidebarHeader,
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
//   SidebarRail,
//   useSidebar,
// } from "@/components/ui/sidebar"
// import { NavMain } from "./NavMain"
// import { NavUser } from "./NavUser"
// import { data } from "@/lib/constData"
// import Image from "next/image"
// import Link from "next/link"

// export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
//   const { state } = useSidebar();
//   const isCollapsed = state === "collapsed";

//   return (
//     <Sidebar collapsible="icon" {...props}>
//       <SidebarHeader className="border-b border-sidebar-border">
//         <SidebarMenu>
//           <SidebarMenuItem>
//             <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent">
//               <Link href="/dashboard" className="flex items-center gap-3 w-full transition-all duration-200">
                
//                 {/* Logo Wrapper Container */}
//                 <div className="relative h-8 w-8 shrink-0 rounded-lg bg-sidebar-primary/5 flex items-center justify-center overflow-hidden">
//                   <Image 
//                     src="/jg-logo.png" 
//                     fill
//                     sizes="32px"
//                     priority
//                     alt="JG Logo" 
//                     className="object-contain p-1"
//                   />
//                 </div>

//                 {/* Company Name Metadata - Hidden automatically when layout collapses */}
//                 {!isCollapsed && (
//                   <div className="flex flex-col gap-0.5 min-w-0 transition-opacity duration-200 animate-in fade-in-50">
//                     <span className="font-bold text-sm text-sidebar-foreground tracking-tight truncate leading-none">
//                       JG Enterprises
//                     </span>
//                     <span className="text-[10px] text-muted-foreground font-medium truncate leading-none">
//                       Logistics Hub
//                     </span>
//                   </div>
//                 )}

//               </Link>
//             </SidebarMenuButton>
//           </SidebarMenuItem>
//         </SidebarMenu>
//       </SidebarHeader>
      
//       <SidebarContent className="pt-2">
//         <NavMain items={data.adminMain} />
//       </SidebarContent>
      
//       <SidebarFooter className="border-t border-sidebar-border">
//         <NavUser />
//       </SidebarFooter>
      
//       <SidebarRail />
//     </Sidebar>
//   )
// }
"use client"

import * as React from "react"
import { ChevronsUpDown, MapPin, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

// 1. Extend the Type Definitions to match your Syncora Location Schema
export interface LocationItem {
  id: string              // Maps to selectedLocationInflowId
  name: string
  url?: string | null     // Partner configuration endpoint
  isOnline: boolean       // Whether the webhook background loop is successfully running
}

interface LocationSwitcherProps {
  locations: LocationItem[]
  onLocationChange?: (locationId: string) => void
  currentLocationId?: string
}

export function LocationSwitcher({
  locations,
  onLocationChange,
  currentLocationId,
}: LocationSwitcherProps) {
  const { isMobile } = useSidebar()

  // Track the active selected location instance
  const activeLocation = React.useMemo(() => {
    return locations.find((loc) => loc.id === currentLocationId) || locations[0]
  }, [locations, currentLocationId])

  const handleSelect = (location: LocationItem) => {
    if (onLocationChange) {
      onLocationChange(location.id)
    }
  }

  if (!activeLocation) {
    return null
  }

  // Helper utility to render a consistent real-time indicator dot
  const renderStatusDot = (loc: LocationItem) => {
    if (!loc.url) {
      return <span className="size-2 rounded-full bg-muted-foreground/40" title="Unconfigured" />
    }
    
    if (loc.isOnline) {
      return (
        <span className="relative flex h-2 w-2" title="Active Stream">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )
    }

    return <span className="size-2 rounded-full bg-destructive" title="Offline" />
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <MapPin className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeLocation.name}</span>
                <span className="truncate text-xs text-muted-foreground font-mono">
                  {!activeLocation.url ? "Awaiting Config" : activeLocation.isOnline ? "Active Stream" : "Offline"}
                </span>
              </div>
              
              {/* Dynamic Status Display on the Sidebar Trigger Button */}
              <div className="flex items-center gap-2 ml-auto">
                {renderStatusDot(activeLocation)}
                <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Locations Workspace
            </DropdownMenuLabel>
            
            {locations.map((loc, index) => (
              <DropdownMenuItem
                key={loc.id}
                onClick={() => handleSelect(loc)}
                className="gap-2 p-2 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background shrink-0">
                    <MapPin className="size-3.5 text-muted-foreground" />
                  </div>
                  <span className="truncate">{loc.name}</span>
                </div>
                
                {/* Real-time status indicator on the item inside dropdown array list */}
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  {renderStatusDot(loc)}
                  <DropdownMenuShortcut className="text-[10px]">⌘{index + 1}</DropdownMenuShortcut>
                </div>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="gap-2 p-2 text-muted-foreground cursor-pointer">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="font-medium">Add new branch</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
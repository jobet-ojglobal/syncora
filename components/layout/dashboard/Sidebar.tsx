"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { NavMain } from "./NavMain"
import { NavUser } from "./NavUser"
import { data } from "@/lib/constData"
import Image from "next/image"
import Link from "next/link"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent">
              <Link href="/dashboard" className="flex items-center gap-3 w-full transition-all duration-200">
                
                {/* Logo Wrapper Container */}
                <div className="relative h-8 w-8 shrink-0 rounded-lg bg-sidebar-primary/5 flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/jg-logo.png" 
                    fill
                    sizes="32px"
                    priority
                    alt="JG Logo" 
                    className="object-contain p-1"
                  />
                </div>

                {/* Company Name Metadata - Hidden automatically when layout collapses */}
                {!isCollapsed && (
                  <div className="flex flex-col gap-0.5 min-w-0 transition-opacity duration-200 animate-in fade-in-50">
                    <span className="font-bold text-sm text-sidebar-foreground tracking-tight truncate leading-none">
                      JG Enterprises
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium truncate leading-none">
                      Logistics Hub
                    </span>
                  </div>
                )}

              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
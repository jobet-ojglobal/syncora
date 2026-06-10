"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  const { state } = useSidebar()

  const isCollapsed =
    state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        Platform
      </SidebarGroupLabel>

      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems =
            item.items &&
            item.items.length > 0

          const isActive =
            pathname === item.url ||
            pathname.startsWith(
              item.url + "/"
            )

          // COLLAPSIBLE ITEM
          if (hasSubItems) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>

                  <div className="flex items-center gap-1">

                    {/* MAIN LINK */}
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className="flex-1"
                      isActive={isActive}
                    >
                      <Link href={item.url}>
                        {item.icon && (
                          <item.icon />
                        )}

                        <span>
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>

                    {/* HIDE TOGGLE WHEN COLLAPSED */}
                    {!isCollapsed && (
                      <CollapsibleTrigger asChild>
                        <button
                          className="
                            flex h-8 w-8 items-center justify-center rounded-md
                            hover:bg-sidebar-accent
                            hover:text-sidebar-accent-foreground
                          "
                        >
                          <ChevronRight
                            className="
                              h-4 w-4 transition-transform duration-200
                              group-data-[state=open]/collapsible:rotate-90
                            "
                          />
                        </button>
                      </CollapsibleTrigger>
                    )}
                  </div>

                  {!isCollapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map(
                          (subItem) => (
                            <SidebarMenuSubItem
                              key={
                                subItem.title
                              }
                            >
                              <SidebarMenuSubButton
                                asChild
                              >
                                <Link
                                  href={
                                    subItem.url
                                  }
                                >
                                  <span>
                                    {
                                      subItem.title
                                    }
                                  </span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}

                </SidebarMenuItem>
              </Collapsible>
            )
          }

          // FLAT ITEM
          return (
            <SidebarMenuItem
              key={item.title}
            >
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
              >
                <Link href={item.url}>
                  {item.icon && (
                    <item.icon />
                  )}

                  <span>
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  CircleDollarSign,
  Boxes,
  Database,
  RefreshCw,
  CreditCard,
  Receipt,
  Trash2,
  ChevronDown,
  Menu,
  X,
  Tag,
  Percent,
  Coins,
  FileText,
  SlidersHorizontal,
  MapPin,
  Users,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: { title: string; href: string; icon?: React.ElementType }[];
}

const settingsNav: NavItem[] = [
  { title: "General", href: "/dashboard/settings/general", icon: Settings },
  { title: "User", href: "/dashboard/settings/users", icon: Users },
  {
    title: "Financial",
    href: "/dashboard/settings/financial",
    icon: CircleDollarSign,
    children: [
      { title: "Pricing Schemes", href: "/dashboard/settings/financial/pricing", icon: Tag },
      { title: "Taxing Schemes", href: "/dashboard/settings/financial/taxing", icon: Percent },
      { title: "Currencies", href: "/dashboard/settings/financial/currencies", icon: Coins },
      { title: "Payment Terms", href: "/dashboard/settings/financial/payment-terms", icon: FileText },
    ],
  },
  // {
  //   title: "Inventory",
  //   href: "/dashboard/settings/inventory",
  //   icon: Boxes,
  //   children: [
  //     { title: "Adjustment Reasons", href: "/dashboard/settings/inventory/adjustments", icon: SlidersHorizontal },
  //   ],
  // },
  { title: "Inflow Cloud", href: "/dashboard/settings/inflow", icon: Database },
  { title: "Location", href: "/dashboard/settings/locations", icon: MapPin },
  
  { title: "Sync Jobs", href: "/dashboard/settings/sync-jobs", icon: RefreshCw },
  { title: "Payment", href: "/dashboard/settings/payment", icon: CreditCard },
  { title: "Tax Configuration", href: "/dashboard/settings/tax-config", icon: Receipt },
  { title: "Trash", href: "/dashboard/settings/trash", icon: Trash2 },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    Financial: true,
    "Inflow Cloud": true,
  });

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="w-full max-w-[90rem] mx-auto text-foreground sm:p-6 space-y-6 text-xs sm:text-sm">

      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-sidebar-primary" />
          <span className="font-semibold text-sidebar-foreground">Settings</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <PageHeader
        title="Settings"
        description="Configure your application settings, including financial, inventory, and general preferences."
        icon={Settings}
        className="border-b border-border pb-4 hidden lg:block"
      />


      <div className="">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          
          {/* Mobile Drawer Backdrop */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Navigation Sidebar */}
          <aside
            className={`
              fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-auto lg:col-span-2
              bg-sidebar lg:bg-transparent
              p-4 lg:p-0 transform transition-transform duration-200 ease-in-out
              ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
              overflow-y-auto border-r border-sidebar-border lg:border-none
            `}
          >
            <div className="flex items-center justify-between lg:hidden mb-4 pb-3 border-b border-sidebar-border">
              <span className="font-semibold text-sidebar-foreground">Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {settingsNav.map((item) => {
                const Icon = item.icon;
                const hasChildren = item.children && item.children.length > 0;
                const isSubmenuOpen = !!openSubmenus[item.title];
                const isActive = pathname === item.href;

                return (
                  <div key={item.title} className="space-y-1">
                    {hasChildren ? (
                      /* Parent Item */
                      <button
                        onClick={() => toggleSubmenu(item.title)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 text-sidebar-foreground hover:bg-sidebar-accent"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span>{item.title}</span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                            isSubmenuOpen ? "transform rotate-180" : ""
                          }`}
                        />
                      </button>
                    ) : (
                      /* Parent Link */
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`
                          flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg
                          transition-colors duration-150
                          ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                              : "text-sidebar-foreground hover:bg-sidebar-accent"
                          }
                        `}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            isActive
                              ? "text-sidebar-accent-foreground"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span>{item.title}</span>
                      </Link>
                    )}

                    {/* Submenu */}
                    {hasChildren && isSubmenuOpen && (
                      <div className="ml-4 pl-3 space-y-1 border-l border-sidebar-border">
                        {item.children?.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = pathname === child.href;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`
                                flex items-center space-x-2.5 px-2.5 py-1.5 text-xs font-medium rounded-md
                                transition-colors duration-150
                                ${
                                  isChildActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                }
                              `}
                            >
                              {ChildIcon && (
                                <ChildIcon
                                  className={`w-3.5 h-3.5 ${
                                    isChildActive
                                      ? "text-sidebar-accent-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              )}
                              <span>{child.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
// app/dashboard/layout.tsx
import { AppSidebar } from "@/components/layout/dashboard/Sidebar";
import Breadcrumb from "@/components/layout/dashboard/Breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/shared/theme-toggle";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Animated Adaptive Workspace Dashboard Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 transition-[height] duration-200 ease-in-out group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sticky top-0 z-10">
          {/* Left Side: Navigation & Identity Controls */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
            <Separator
              orientation="vertical"
              className="mx-2 h-7 bg-border"
            />
            <Breadcrumb />
          </div>

          {/* Right Side: Theme Switch Actions Matrix */}
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>

        {/* Adjusted workspace viewport node */}
        <main className="flex-1 w-full bg-background">
          {children}
        </main>
        
      </SidebarInset>
    </SidebarProvider>
  );
}
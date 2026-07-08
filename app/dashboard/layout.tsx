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
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          
          {/* Left Side: Navigation & Identity Controls */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4"
            />
            <Breadcrumb />
          </div>

          {/* Right Side: Theme Switch Actions Matrix */}
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>

        </header>

        {/* Adjusted workspace viewport node */}
        <main className="flex-1 overflow-y-auto bg-background dark:bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
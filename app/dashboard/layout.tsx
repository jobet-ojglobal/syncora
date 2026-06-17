// app/dashboard/layout.tsx
import { AppSidebar } from "@/components/layout/dashboard/Sidebar";
import Breadcrumb from "@/components/layout/dashboard/Breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4"
            />
            <Breadcrumb />
          </div>
        </header>
        {/* Adjusted main element wrapper to work safely with SidebarInset flexbox architecture */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
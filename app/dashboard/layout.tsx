import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-dvh overflow-x-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">{children}</main>
      </div>
    </SidebarProvider>
  );
}

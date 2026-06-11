import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { MobileSidebarTrigger } from "@/components/mobile-sidebar-trigger";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { listInterviewsServer } from "@/lib/api";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieList = cookieStore.getAll();
  let interviews: Awaited<ReturnType<typeof listInterviewsServer>> = [];

  try {
    interviews = await listInterviewsServer(cookieList);
  } catch {
    interviews = [];
  }

  return (
    <SidebarProvider>
      <AppSidebar initialInterviews={interviews} />
      <SidebarInset>
        <MobileSidebarTrigger />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

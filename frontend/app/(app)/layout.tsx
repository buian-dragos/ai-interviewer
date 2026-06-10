import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { MobileSidebarTrigger } from "@/components/mobile-sidebar-trigger";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getMeServer, listInterviewsServer } from "@/lib/api";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieList = cookieStore.getAll();
  let userEmail: string | null = null;
  let interviews: Awaited<ReturnType<typeof listInterviewsServer>> = [];

  try {
    const user = await getMeServer(cookieList);
    userEmail = user.email;
  } catch {
    userEmail = null;
  }

  try {
    interviews = await listInterviewsServer(cookieList);
  } catch {
    interviews = [];
  }

  return (
    <SidebarProvider>
      <AppSidebar initialInterviews={interviews} userEmail={userEmail} />
      <SidebarInset>
        <MobileSidebarTrigger />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

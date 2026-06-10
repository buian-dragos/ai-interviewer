"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function MobileSidebarTrigger() {
  return (
    <div className="flex items-center border-b px-4 py-2 md:hidden">
      <SidebarTrigger />
    </div>
  );
}

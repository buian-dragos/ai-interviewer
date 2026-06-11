"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HistoryIcon, MessageSquareIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { api } from "@/lib/api";
import {
  formatInterviewDate,
  getInterviewHref,
  isInProgress,
  isInterviewPathActive,
  type InterviewSummary,
} from "@/lib/interviews";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  initialInterviews: InterviewSummary[];
};

export function AppSidebar({ initialInterviews }: AppSidebarProps) {
  const pathname = usePathname();
  const [interviews, setInterviews] =
    useState<InterviewSummary[]>(initialInterviews);

  useEffect(() => {
    let cancelled = false;

    void api.listInterviews().then((data) => {
      if (!cancelled) {
        setInterviews(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, initialInterviews]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex-row items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
        <SidebarMenu className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/home" />}
              tooltip="AI Interviewer"
            >
              <MessageSquareIcon />
              <span>AI Interviewer</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:py-0">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Past interviews
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {interviews.length === 0 ? (
              <>
                <div className="group-data-[collapsible=icon]:hidden">
                  <Empty className="border-0 p-4">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <HistoryIcon />
                      </EmptyMedia>
                      <EmptyTitle>No interviews yet</EmptyTitle>
                      <EmptyDescription>
                        Your completed and in-progress sessions will appear
                        here.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
                <SidebarMenu className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center">
                  <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <SidebarMenuButton
                      tooltip="No interviews yet"
                      className="pointer-events-none opacity-50 group-data-[collapsible=icon]:justify-center"
                    >
                      <HistoryIcon />
                      <span>No interviews yet</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </>
            ) : (
              <ScrollArea className="min-h-0 flex-1 group-data-[collapsible=icon]:h-auto">
                <SidebarMenu className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
                  {interviews.map((interview) => {
                    const href = getInterviewHref(interview);
                    const isActive = isInterviewPathActive(
                      pathname,
                      interview.id,
                    );
                    const inProgress = isInProgress(interview);
                    const tooltip = inProgress
                      ? `${interview.category} · In progress`
                      : `${interview.category} · ${formatInterviewDate(interview.started_at)}`;

                    return (
                      <SidebarMenuItem
                        key={interview.id}
                        className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center"
                      >
                        <SidebarMenuButton
                          size="lg"
                          isActive={isActive}
                          render={<Link href={href} />}
                          tooltip={tooltip}
                          className={cn(
                            "group-data-[collapsible=icon]:justify-center",
                            inProgress &&
                              !isActive &&
                              "bg-sidebar-accent/50 hover:bg-sidebar-accent/70",
                          )}
                        >
                          <HistoryIcon />
                          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                            <span className="truncate font-medium">
                              {interview.category}
                            </span>
                            <span
                              className={cn(
                                "truncate text-xs",
                                inProgress
                                  ? "font-medium text-sidebar-primary"
                                  : "text-muted-foreground",
                              )}
                            >
                              {inProgress
                                ? "In progress"
                                : formatInterviewDate(interview.started_at)}
                            </span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </ScrollArea>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

"use client";

import { CircleHelp } from "lucide-react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

type AnalysisMetricLabelProps = {
  label: string;
  tooltip?: string;
};

export function AnalysisMetricLabel({
  label,
  tooltip,
}: AnalysisMetricLabelProps) {
  return (
    <div className="flex items-center gap-1.5">
      <p className="text-base font-medium text-foreground">{label}</p>
      {tooltip ? (
        <HoverCard openDelay={100} closeDelay={100}>
          <HoverCardTrigger
            render={
              <button
                type="button"
                className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`About ${label}`}
              />
            }
          >
            <CircleHelp className="size-4" strokeWidth={2} />
          </HoverCardTrigger>
          <HoverCardContent
            side="top"
            align="start"
            className="w-72 text-sm leading-relaxed text-muted-foreground"
          >
            {tooltip}
          </HoverCardContent>
        </HoverCard>
      ) : null}
    </div>
  );
}

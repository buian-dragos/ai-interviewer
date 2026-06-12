import type { SentimentLabel } from "@/lib/interviews";
import { cn } from "@/lib/utils";

import { formatSentimentLabel, formatSignedScore } from "./evaluation-badges";

export const SENTIMENT_TEXT_COLORS: Record<SentimentLabel, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-muted-foreground",
  negative: "text-red-600 dark:text-red-400",
};

type SentimentMeterProps = {
  label: SentimentLabel;
  score: number;
  compact?: boolean;
};

export function SentimentMeter({
  label,
  score,
  compact = false,
}: SentimentMeterProps) {
  const markerPercent = ((score + 1) / 2) * 100;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p
          className={cn(
            "font-semibold tracking-tight",
            compact ? "text-lg md:text-xl" : "text-2xl md:text-3xl",
            SENTIMENT_TEXT_COLORS[label],
          )}
        >
          {formatSentimentLabel(label)}
        </p>
        <p
          className={cn(
            "tabular-nums font-semibold tracking-tight",
            compact ? "text-xl md:text-2xl" : "text-3xl md:text-4xl",
          )}
        >
          {formatSignedScore(score)}
        </p>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-linear-to-r from-red-500/80 via-muted-foreground/40 to-emerald-500/80">
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm"
          style={{ left: `${markerPercent}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>-1.0</span>
        <span>0</span>
        <span>+1.0</span>
      </div>
    </div>
  );
}

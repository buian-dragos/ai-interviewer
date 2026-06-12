import type { AnswerSentiment, SentimentLabel } from "@/lib/interviews";
import { cn } from "@/lib/utils";

const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  positive: "bg-emerald-500 dark:bg-emerald-400",
  neutral: "bg-muted-foreground/50",
  negative: "bg-red-500 dark:bg-red-400",
};

const SENTIMENT_TEXT_COLORS: Record<SentimentLabel, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-muted-foreground",
  negative: "text-red-600 dark:text-red-400",
};

const CHART_HEIGHT_PX = 160;
const MIN_BAR_HEIGHT_PX = 6;

function capitalizeSentiment(label: SentimentLabel): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatSignedScore(score: number): string {
  const formatted = score.toFixed(2);
  return score > 0 ? `+${formatted}` : formatted;
}

function barHeightPx(score: number): number {
  const normalized = (Math.abs(score) + 1) / 2;
  return Math.max(MIN_BAR_HEIGHT_PX, normalized * CHART_HEIGHT_PX);
}

type SentimentOverviewProps = {
  label: SentimentLabel;
  score: number;
  answersScored: number;
  answerSentiments: AnswerSentiment[];
};

export function SentimentOverview({
  label,
  score,
  answersScored,
  answerSentiments,
}: SentimentOverviewProps) {
  const markerPercent = ((score + 1) / 2) * 100;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className={cn(
                "text-2xl font-semibold tracking-tight md:text-3xl",
                SENTIMENT_TEXT_COLORS[label],
              )}
            >
              {capitalizeSentiment(label)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Average across {answersScored} scored{" "}
              {answersScored === 1 ? "answer" : "answers"}
            </p>
          </div>
          <p className="tabular-nums text-3xl font-semibold tracking-tight md:text-4xl">
            {formatSignedScore(score)}
          </p>
        </div>

        <div className="space-y-2">
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
      </div>

      {answerSentiments.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">By answer</p>
          <div
            className="flex items-end justify-between gap-2 sm:gap-3"
            role="img"
            aria-label="Sentiment score for each answer"
          >
            {answerSentiments.map((answer) => (
              <div
                key={`${answer.sequence}-${answer.label}`}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <span
                  className="tabular-nums text-xs text-muted-foreground"
                  title={`${answer.label}: ${formatSignedScore(answer.sentiment_score)}`}
                >
                  {formatSignedScore(answer.sentiment_score)}
                </span>
                <div
                  className="flex w-full max-w-12 items-end justify-center sm:max-w-14"
                  style={{ height: CHART_HEIGHT_PX }}
                >
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-[height]",
                      SENTIMENT_COLORS[answer.sentiment_label],
                    )}
                    style={{ height: barHeightPx(answer.sentiment_score) }}
                    title={`${answer.label}: ${capitalizeSentiment(answer.sentiment_label)} (${formatSignedScore(answer.sentiment_score)})`}
                  />
                </div>
                <span className="w-full truncate text-center text-xs text-muted-foreground">
                  {answer.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
              Positive
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-muted-foreground/50" />
              Neutral
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-red-500 dark:bg-red-400" />
              Negative
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

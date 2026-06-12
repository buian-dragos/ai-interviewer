import type { AnswerDepth, SentimentLabel } from "@/lib/interviews";

export function capitalizeLabel(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatSignedScore(score: number): string {
  const formatted = score.toFixed(2);
  return score > 0 ? `+${formatted}` : formatted;
}

export const DEPTH_BADGE_CLASS: Record<AnswerDepth, string> = {
  shallow: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  adequate:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  deep: "border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
};

export const SENTIMENT_BADGE_CLASS: Record<SentimentLabel, string> = {
  positive:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  neutral: "border-border bg-muted text-muted-foreground",
  negative: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
};

export function formatDepthLabel(depth: AnswerDepth): string {
  return capitalizeLabel(depth);
}

export function formatSentimentLabel(label: SentimentLabel): string {
  return capitalizeLabel(label);
}

export function formatAddressedQuestion(
  addressed: boolean | null | undefined,
): string {
  if (addressed === true) {
    return "Yes";
  }

  if (addressed === false) {
    return "No";
  }

  return "Unknown";
}

export const ADDRESSED_BADGE_CLASS: Record<"yes" | "no" | "unknown", string> = {
  yes: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  no: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  unknown: "border-border bg-muted text-muted-foreground",
};

export function getAddressedBadgeKey(
  addressed: boolean | null | undefined,
): "yes" | "no" | "unknown" {
  if (addressed === true) {
    return "yes";
  }

  if (addressed === false) {
    return "no";
  }

  return "unknown";
}

export const EVALUATION_PILL_CLASS = "h-auto px-3 py-1.5 text-sm md:text-base";

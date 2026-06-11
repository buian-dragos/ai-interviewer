"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  INTERVIEW_ANSWER_MAX_CHARS,
  INTERVIEW_ANSWER_TEXTAREA_CLASS,
  INTERVIEW_CONTENT_CLASS,
} from "@/lib/interview-layout";
import { cn } from "@/lib/utils";

type InterviewAnswerComposerProps = {
  answer: string;
  disabled?: boolean;
  isLastQuestion: boolean;
  isSaving?: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
};

function formatCount(value: number): string {
  return value.toLocaleString();
}

export function InterviewAnswerComposer({
  answer,
  disabled = false,
  isLastQuestion,
  isSaving = false,
  onAnswerChange,
  onSubmit,
}: InterviewAnswerComposerProps) {
  const length = answer.length;
  const warningThreshold = Math.floor(INTERVIEW_ANSWER_MAX_CHARS * 0.9);
  const isAtLimit = length >= INTERVIEW_ANSWER_MAX_CHARS;
  const isNearLimit = length >= warningThreshold && !isAtLimit;
  const canSubmit = answer.trim().length > 0 && !disabled && !isSaving;

  function handleChange(value: string) {
    onAnswerChange(value.slice(0, INTERVIEW_ANSWER_MAX_CHARS));
  }

  return (
    <div className={`${INTERVIEW_CONTENT_CLASS} flex flex-col items-center gap-y-8`}>
      <div className="relative w-full">
        <Textarea
          id="interview-answer"
          name="answer"
          autoComplete="off"
          className={INTERVIEW_ANSWER_TEXTAREA_CLASS}
          placeholder="Write your answer here…"
          value={answer}
          disabled={disabled || isSaving}
          maxLength={INTERVIEW_ANSWER_MAX_CHARS}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              if (canSubmit) {
                onSubmit();
              }
            }
          }}
        />
        <p
          className={cn(
            "pointer-events-none absolute right-3 bottom-2.5 text-xs tabular-nums",
            isAtLimit
              ? "text-destructive"
              : isNearLimit
                ? "text-amber-600 dark:text-amber-500"
                : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {formatCount(length)} / {formatCount(INTERVIEW_ANSWER_MAX_CHARS)}
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-[60%] touch-manipulation"
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        {isSaving
          ? "Saving…"
          : isLastQuestion
            ? "Submit interview"
            : "Submit answer"}
      </Button>
    </div>
  );
}

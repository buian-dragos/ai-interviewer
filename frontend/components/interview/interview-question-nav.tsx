"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { INTERVIEW_CONTENT_CLASS } from "@/lib/interview-layout";

type InterviewQuestionNavProps = {
  canGoPrevious: boolean;
  canGoNext: boolean;
  isSaving?: boolean;
  isEvaluating?: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export function InterviewQuestionNav({
  canGoPrevious,
  canGoNext,
  isSaving = false,
  isEvaluating = false,
  onPrevious,
  onNext,
}: InterviewQuestionNavProps) {
  const disabled = isSaving || isEvaluating;

  return (
    <nav
      aria-label="Question navigation"
      className={`${INTERVIEW_CONTENT_CLASS} flex items-center justify-between gap-4`}
    >
      <Button
        type="button"
        variant="outline"
        disabled={!canGoPrevious || disabled}
        onClick={onPrevious}
        className="touch-manipulation"
      >
        <ChevronLeftIcon aria-hidden="true" data-icon="inline-start" />
        Previous
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={!canGoNext || disabled}
        onClick={onNext}
        className="touch-manipulation"
      >
        Next
        <ChevronRightIcon aria-hidden="true" data-icon="inline-end" />
      </Button>
    </nav>
  );
}

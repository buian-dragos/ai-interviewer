"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { INTERVIEW_CONTENT_CLASS } from "@/lib/interview-layout";

type InterviewQuestionNavProps = {
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLastQuestion: boolean;
  isSaving?: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export function InterviewQuestionNav({
  canGoPrevious,
  canGoNext,
  isLastQuestion,
  isSaving = false,
  onPrevious,
  onNext,
}: InterviewQuestionNavProps) {
  return (
    <nav
      aria-label="Question navigation"
      className={`${INTERVIEW_CONTENT_CLASS} flex items-center justify-between gap-4`}
    >
      <Button
        type="button"
        variant="outline"
        disabled={!canGoPrevious || isSaving}
        onClick={onPrevious}
        className="touch-manipulation"
      >
        <ChevronLeftIcon aria-hidden="true" data-icon="inline-start" />
        Previous
      </Button>

      {!isLastQuestion ? (
        <Button
          type="button"
          variant="outline"
          disabled={!canGoNext || isSaving}
          onClick={onNext}
          className="touch-manipulation"
        >
          Next
          <ChevronRightIcon aria-hidden="true" data-icon="inline-end" />
        </Button>
      ) : (
        <span className="w-[88px]" aria-hidden="true" />
      )}
    </nav>
  );
}

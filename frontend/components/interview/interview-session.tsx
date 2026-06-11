"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { InterviewAnswerComposer } from "@/components/interview/interview-answer-composer";
import { InterviewFollowUpStep } from "@/components/interview/interview-follow-up-step";
import { InterviewQuestionNav } from "@/components/interview/interview-question-nav";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api } from "@/lib/api";
import {
  CORE_QUESTIONS_TOTAL,
  INTERVIEW_CONTENT_CLASS,
  INTERVIEW_COMPOSER_SLOT_CLASS,
  INTERVIEW_MIDDLE_CLASS,
  INTERVIEW_MIDDLE_BOTTOM_SPACER_CLASS,
  INTERVIEW_MIDDLE_TOP_SPACER_CLASS,
  INTERVIEW_NAV_FOOTER_CLASS,
  INTERVIEW_PAGE_INNER_CLASS,
  INTERVIEW_PAGE_MAIN_CLASS,
  INTERVIEW_QUESTION_SLOT_CLASS,
} from "@/lib/interview-layout";
import {
  findFirstUnsubmittedStepIndex,
  findStepIndexById,
  getCoreProgressValue,
  getParentCoreQuestion,
  isCoreFiveStep,
  isFollowUpStep,
  isLastTimelineStep,
  isQuestionSubmitted,
  type Interview,
  type InterviewQuestion,
} from "@/lib/interviews";
import { cn } from "@/lib/utils";

type InterviewSessionProps = {
  interview: Interview;
};

export function InterviewSession({ interview }: InterviewSessionProps) {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const currentQuestion = questions[currentStepIndex];
  const isFollowUp = currentQuestion ? isFollowUpStep(currentQuestion) : false;
  const parentCoreQuestion =
    currentQuestion && isFollowUp
      ? getParentCoreQuestion(questions, currentQuestion)
      : undefined;
  const isLastStep = currentQuestion
    ? isLastTimelineStep(questions, currentStepIndex)
    : false;
  const showSubmitInterviewLabel = currentQuestion
    ? isCoreFiveStep(currentQuestion)
    : false;
  const progressValue = currentQuestion
    ? getCoreProgressValue(currentQuestion)
    : 0;
  const interactionDisabled = isSaving || isEvaluating;

  useEffect(() => {
    let cancelled = false;

    void api
      .listInterviewQuestions(interview.id)
      .then((data) => {
        if (cancelled) {
          return;
        }

        if (data.length === 0) {
          toast.error(
            "This interview has no questions yet. Start a new interview from the home page.",
          );
          setQuestions([]);
          return;
        }

        setQuestions(data);
        const resumeIndex = findFirstUnsubmittedStepIndex(data);
        setCurrentStepIndex(resumeIndex);
        setAnswer(data[resumeIndex]?.answer ?? "");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof ApiError
            ? error.message
            : "Could not load interview questions.";
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [interview.id]);

  useEffect(() => {
    if (currentQuestion) {
      setAnswer(currentQuestion.answer ?? "");
    }
  }, [currentQuestion]);

  const goToStep = useCallback(
    (questionId: string | null, updatedQuestions: InterviewQuestion[]) => {
      if (!questionId) {
        return;
      }

      const nextIndex = findStepIndexById(updatedQuestions, questionId);
      if (nextIndex >= 0) {
        setCurrentStepIndex(nextIndex);
        setAnswer(updatedQuestions[nextIndex]?.answer ?? "");
      }
    },
    [],
  );

  async function handleSubmit() {
    const trimmed = answer.trim();
    if (!trimmed || !currentQuestion || interactionDisabled) {
      return;
    }

    const isCore = !isFollowUpStep(currentQuestion);
    if (isCore) {
      setIsEvaluating(true);
    } else {
      setIsSaving(true);
    }

    try {
      const result = await api.submitInterviewAnswer(
        interview.id,
        currentQuestion.id,
        trimmed,
      );

      setQuestions(result.questions);

      const savedIndex = findStepIndexById(result.questions, result.saved.id);
      const savedQuestion =
        savedIndex >= 0 ? result.questions[savedIndex] : result.saved;

      if (result.next_question_id) {
        goToStep(result.next_question_id, result.questions);
        return;
      }

      if (
        isCoreFiveStep(savedQuestion) ||
        (isFollowUpStep(savedQuestion) && savedQuestion.core_sequence === 5)
      ) {
        toast.success("Interview submitted.", {
          description: "Summary and scoring will be added in a later step.",
        });
        return;
      }

      if (isCore && savedIndex >= 0) {
        setCurrentStepIndex(savedIndex);
        setAnswer(result.saved.answer ?? trimmed);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not save your answer.";
      toast.error(message);
    } finally {
      setIsSaving(false);
      setIsEvaluating(false);
    }
  }

  function handlePrevious() {
    if (currentStepIndex === 0 || interactionDisabled) {
      return;
    }

    setCurrentStepIndex((index) => index - 1);
  }

  function handleNext() {
    if (isLastStep || interactionDisabled || !currentQuestion) {
      return;
    }

    setCurrentStepIndex((index) => Math.min(index + 1, questions.length - 1));
  }

  if (isLoading) {
    return (
      <main className={INTERVIEW_PAGE_MAIN_CLASS}>
        <div className={`${INTERVIEW_PAGE_INNER_CLASS} gap-6`}>
          <Skeleton className="mx-auto h-9 w-64" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="mx-auto mt-10 h-32 w-full max-w-2xl md:h-36" />
          <div className={`${INTERVIEW_MIDDLE_CLASS} min-h-48`}>
            <div className="flex-1" aria-hidden="true" />
            <Skeleton className="mx-auto h-72 w-full max-w-2xl" />
            <div className="flex-1" aria-hidden="true" />
          </div>
          <Skeleton className="h-12 w-full max-w-2xl" />
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main className={INTERVIEW_PAGE_MAIN_CLASS}>
        <div className={INTERVIEW_PAGE_INNER_CLASS}>
          <p className="text-center text-muted-foreground">
            No questions available for this interview.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={INTERVIEW_PAGE_MAIN_CLASS}>
      <div className={INTERVIEW_PAGE_INNER_CLASS}>
        <header className="flex flex-col gap-4">
          <h1 className="text-center text-2xl font-bold tracking-tight text-balance md:text-3xl">
            {interview.category}
          </h1>
          <Progress value={progressValue} className="w-full flex-col gap-2">
            <ProgressLabel>
              Question {currentQuestion.core_sequence} of {CORE_QUESTIONS_TOTAL}
            </ProgressLabel>
          </Progress>
        </header>

        {isFollowUp && parentCoreQuestion ? (
          <InterviewFollowUpStep
            parentQuestion={parentCoreQuestion}
            followUpQuestion={currentQuestion}
            answer={answer}
            disabled={interactionDisabled}
            isLastQuestion={showSubmitInterviewLabel}
            isSaving={isSaving}
            onAnswerChange={setAnswer}
            onSubmit={() => void handleSubmit()}
          />
        ) : (
          <>
            <section
              className={cn(
                INTERVIEW_CONTENT_CLASS,
                INTERVIEW_QUESTION_SLOT_CLASS,
              )}
            >
              {isEvaluating ? (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Reviewing your answer…
                  </p>
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <p className="text-center text-xl leading-relaxed font-medium text-pretty md:text-2xl">
                  {currentQuestion.question}
                </p>
              )}
            </section>

            <div className={INTERVIEW_MIDDLE_CLASS}>
              <div
                className={INTERVIEW_MIDDLE_TOP_SPACER_CLASS}
                aria-hidden="true"
              />

              <div className={INTERVIEW_COMPOSER_SLOT_CLASS}>
                <InterviewAnswerComposer
                  answer={answer}
                  disabled={interactionDisabled}
                  isLastQuestion={showSubmitInterviewLabel}
                  isSaving={isSaving || isEvaluating}
                  onAnswerChange={setAnswer}
                  onSubmit={() => void handleSubmit()}
                />
              </div>

              <div
                className={INTERVIEW_MIDDLE_BOTTOM_SPACER_CLASS}
                aria-hidden="true"
              />
            </div>
          </>
        )}

        <footer className={INTERVIEW_NAV_FOOTER_CLASS}>
          <InterviewQuestionNav
            canGoPrevious={currentStepIndex > 0}
            canGoNext={
              !isLastStep && isQuestionSubmitted(currentQuestion)
            }
            isLastStep={isLastStep}
            isSaving={isSaving}
            isEvaluating={isEvaluating}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        </footer>
      </div>
    </main>
  );
}

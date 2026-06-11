"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { InterviewAnswerComposer } from "@/components/interview/interview-answer-composer";
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
  findFirstUnsubmittedIndex,
  isQuestionSubmitted,
  type Interview,
  type InterviewQuestion,
} from "@/lib/interviews";

type InterviewSessionProps = {
  interview: Interview;
};

export function InterviewSession({ interview }: InterviewSessionProps) {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === CORE_QUESTIONS_TOTAL - 1;
  const progressValue =
    questions.length > 0
      ? ((currentIndex + 1) / CORE_QUESTIONS_TOTAL) * 100
      : 0;

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
        const resumeIndex = findFirstUnsubmittedIndex(data);
        setCurrentIndex(resumeIndex);
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

  const saveCurrentAnswer = useCallback(async (): Promise<boolean> => {
    const trimmed = answer.trim();
    if (!trimmed || !currentQuestion) {
      return false;
    }

    setIsSaving(true);
    try {
      const updated = await api.updateInterviewAnswer(
        interview.id,
        currentQuestion.id,
        trimmed,
      );

      setQuestions((previous) =>
        previous.map((question) =>
          question.id === updated.id ? updated : question,
        ),
      );
      setAnswer(updated.answer ?? trimmed);
      return true;
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not save your answer.";
      toast.error(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [answer, currentQuestion, interview.id]);

  async function handleSubmit() {
    const saved = await saveCurrentAnswer();
    if (!saved) {
      return;
    }

    if (isLastQuestion) {
      toast.success("Interview submitted.", {
        description: "Summary and scoring will be added in a later step.",
      });
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
  }

  function handlePrevious() {
    if (currentIndex === 0 || isSaving) {
      return;
    }

    setCurrentIndex((index) => index - 1);
  }

  function handleNext() {
    if (isLastQuestion || isSaving) {
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
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
              Question {currentIndex + 1} of {CORE_QUESTIONS_TOTAL}
            </ProgressLabel>
          </Progress>
        </header>

        <section
          className={`${INTERVIEW_CONTENT_CLASS} ${INTERVIEW_QUESTION_SLOT_CLASS}`}
        >
          <p className="text-center text-xl leading-relaxed font-medium text-pretty md:text-2xl">
            {currentQuestion.question}
          </p>
        </section>

        <div className={INTERVIEW_MIDDLE_CLASS}>
          <div className={INTERVIEW_MIDDLE_TOP_SPACER_CLASS} aria-hidden="true" />

          <div className={`${INTERVIEW_CONTENT_CLASS} ${INTERVIEW_COMPOSER_SLOT_CLASS}`}>
            <InterviewAnswerComposer
              answer={answer}
              disabled={isSaving}
              isLastQuestion={isLastQuestion}
              isSaving={isSaving}
              onAnswerChange={setAnswer}
              onSubmit={() => void handleSubmit()}
            />
          </div>

          <div className={INTERVIEW_MIDDLE_BOTTOM_SPACER_CLASS} aria-hidden="true" />
        </div>

        <footer className={INTERVIEW_NAV_FOOTER_CLASS}>
          <InterviewQuestionNav
            canGoPrevious={currentIndex > 0}
            canGoNext={
              !isLastQuestion && isQuestionSubmitted(currentQuestion)
            }
            isLastQuestion={isLastQuestion}
            isSaving={isSaving}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        </footer>
      </div>
    </main>
  );
}

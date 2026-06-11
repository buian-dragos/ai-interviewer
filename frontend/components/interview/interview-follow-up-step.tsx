"use client";

import { useEffect, useState } from "react";

import { InterviewAnswerComposer } from "@/components/interview/interview-answer-composer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  INTERVIEW_COMPOSER_SLOT_CLASS,
  INTERVIEW_CONTENT_CLASS,
} from "@/lib/interview-layout";
import type { InterviewQuestion } from "@/lib/interviews";
import { cn } from "@/lib/utils";

type FollowUpPanel = "original" | "follow-up";

type InterviewFollowUpStepProps = {
  parentQuestion: InterviewQuestion;
  followUpQuestion: InterviewQuestion;
  answer: string;
  disabled?: boolean;
  isLastQuestion: boolean;
  isSaving?: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
};

export function InterviewFollowUpStep({
  parentQuestion,
  followUpQuestion,
  answer,
  disabled = false,
  isLastQuestion,
  isSaving = false,
  onAnswerChange,
  onSubmit,
}: InterviewFollowUpStepProps) {
  const [openPanel, setOpenPanel] = useState<FollowUpPanel[]>(["follow-up"]);

  useEffect(() => {
    setOpenPanel(["follow-up"]);
  }, [followUpQuestion.id]);

  function handlePanelChange(nextValue: FollowUpPanel[]) {
    if (nextValue.length === 0) {
      return;
    }

    setOpenPanel(nextValue);
  }

  function switchToPanel(panel: FollowUpPanel) {
    setOpenPanel([panel]);
  }

  return (
    <div
      className={cn(
        INTERVIEW_CONTENT_CLASS,
        "mt-10 flex min-h-0 flex-1 flex-col md:mt-14",
      )}
    >
      <Accordion
        keepMounted
        value={openPanel}
        onValueChange={handlePanelChange}
        className="flex min-h-0 flex-1 flex-col"
      >
        <AccordionItem value="original" className="shrink-0 border-b border-border">
          <AccordionTrigger
            className="items-start gap-3 py-2 hover:no-underline"
            onClick={() => {
              if (openPanel.includes("original")) {
                switchToPanel("follow-up");
              }
            }}
          >
            <span className="flex-1 text-left text-xl leading-relaxed font-medium text-pretty md:text-2xl">
              {parentQuestion.question}
            </span>
            <Badge variant="outline" className="mt-0.5 shrink-0">
              Original question
            </Badge>
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Your answer
              </p>
              <p className="mt-1 text-sm leading-relaxed break-words">
                {parentQuestion.answer}
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="follow-up" className="shrink-0">
          <AccordionTrigger
            className="shrink-0 items-start gap-3 py-2 hover:no-underline"
            onClick={() => {
              if (openPanel.includes("follow-up")) {
                switchToPanel("original");
              }
            }}
          >
            <span className="flex-1 text-left text-xl leading-relaxed font-medium text-pretty md:text-2xl">
              {followUpQuestion.question}
            </span>
            <Badge variant="secondary" className="mt-0.5 shrink-0">
              Follow-up
            </Badge>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <div className="flex flex-col">
              <div
                className="min-h-16 shrink-0 md:min-h-24"
                aria-hidden="true"
              />

              <div className={INTERVIEW_COMPOSER_SLOT_CLASS}>
                <InterviewAnswerComposer
                  answer={answer}
                  disabled={disabled}
                  isLastQuestion={isLastQuestion}
                  isSaving={isSaving}
                  onAnswerChange={onAnswerChange}
                  onSubmit={onSubmit}
                />
              </div>

              <div
                className="min-h-12 shrink-0 md:min-h-16"
                aria-hidden="true"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

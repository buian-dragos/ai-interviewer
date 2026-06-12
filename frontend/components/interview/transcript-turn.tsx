import { ChevronDownIcon } from "lucide-react";

import { AnalysisMetricLabel } from "@/components/interview/analysis-metric-label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ADDRESSED_BADGE_CLASS,
  DEPTH_BADGE_CLASS,
  EVALUATION_PILL_CLASS,
  formatAddressedQuestion,
  formatDepthLabel,
  formatSentimentLabel,
  getAddressedBadgeKey,
} from "@/components/interview/evaluation-badges";
import { SentimentMeter } from "@/components/interview/sentiment-meter";
import {
  formatAnswerDuration,
  formatInterviewDate,
  formatQuestionLabel,
  getParentCoreQuestion,
  hasImprovedFromCoreQuestion,
  isFollowUpStep,
  questionHasFollowUp,
  type InterviewQuestion,
} from "@/lib/interviews";
import { cn } from "@/lib/utils";

function hasAnalysisData(question: InterviewQuestion): boolean {
  return (
    question.answer_depth != null ||
    question.answered_question != null ||
    question.sentiment_label != null ||
    question.sentiment_score != null ||
    (question.keywords?.length ?? 0) > 0
  );
}

function buildAnalysisSummary(question: InterviewQuestion): string {
  const parts: string[] = [];

  if (question.answer_depth != null) {
    parts.push(formatDepthLabel(question.answer_depth));
  }

  if (question.sentiment_label != null) {
    parts.push(formatSentimentLabel(question.sentiment_label));
  }

  const keywordCount = question.keywords?.length ?? 0;
  if (keywordCount > 0) {
    parts.push(`${keywordCount} ${keywordCount === 1 ? "keyword" : "keywords"}`);
  }

  return parts.join(" · ");
}

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        EVALUATION_PILL_CLASS,
        ADDRESSED_BADGE_CLASS[value ? "yes" : "no"],
      )}
    >
      {value ? "Yes" : "No"}
    </Badge>
  );
}

type TranscriptTurnProps = {
  question: InterviewQuestion;
  allQuestions: InterviewQuestion[];
};

export function TranscriptTurn({
  question,
  allQuestions,
}: TranscriptTurnProps) {
  const isFollowUp = isFollowUpStep(question);
  const analysisSummary = buildAnalysisSummary(question);
  const hasAnalysis = hasAnalysisData(question);
  const questionLabel = formatQuestionLabel(question);
  const parentCore = isFollowUp
    ? getParentCoreQuestion(allQuestions, question)
    : undefined;
  const followUpAsked = !isFollowUp
    ? questionHasFollowUp(allQuestions, question.id)
    : null;
  const improvedFromCore =
    isFollowUp && parentCore
      ? hasImprovedFromCoreQuestion(parentCore, question)
      : null;
  const showMetricsRow =
    question.answer_depth != null ||
    question.answered_question != null ||
    followUpAsked != null ||
    improvedFromCore != null;
  const answerDuration =
    question.answered_at != null
      ? formatAnswerDuration(question.created_at, question.answered_at)
      : null;

  return (
    <article
      className={cn(
        "space-y-4",
        isFollowUp && "border-l-2 border-border pl-4",
      )}
    >
      <div className="pl-4">
        <span className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {questionLabel}
        </span>
      </div>

      <Card>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Interviewer
          </p>
          <p className="text-base leading-relaxed break-words md:text-lg">
            {question.question}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">You</p>
          <p className="text-base leading-relaxed break-words md:text-lg">
            {question.answer}
          </p>
        </CardContent>
      </Card>

      {question.answered_at ? (
        <p className="pl-4 text-sm text-muted-foreground">
          {formatInterviewDate(question.answered_at)}
          {answerDuration ? ` · ${answerDuration} to answer` : null}
        </p>
      ) : null}

      {hasAnalysis || showMetricsRow ? (
        <details className="group pl-4">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-sm py-1 text-base font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:text-lg [&::-webkit-details-marker]:hidden">
            <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            <span>Analysis</span>
            {analysisSummary ? (
              <span className="text-sm font-normal text-muted-foreground md:text-base">
                {analysisSummary}
              </span>
            ) : null}
          </summary>
          <div className="mt-4 space-y-5 border-t border-border pt-4 pl-8">
            {showMetricsRow ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {question.answer_depth != null ? (
                  <div className="space-y-2">
                    <p className="text-base font-medium text-foreground">
                      Depth
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        EVALUATION_PILL_CLASS,
                        DEPTH_BADGE_CLASS[question.answer_depth],
                      )}
                    >
                      {formatDepthLabel(question.answer_depth)}
                    </Badge>
                  </div>
                ) : null}

                {question.answered_question != null ? (
                  <div className="space-y-2">
                    <p className="text-base font-medium text-foreground">
                      Addressed question
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        EVALUATION_PILL_CLASS,
                        ADDRESSED_BADGE_CLASS[
                          getAddressedBadgeKey(question.answered_question)
                        ],
                      )}
                    >
                      {formatAddressedQuestion(question.answered_question)}
                    </Badge>
                  </div>
                ) : null}

                {followUpAsked != null ? (
                  <div className="space-y-2">
                    <AnalysisMetricLabel
                      label="Follow-up asked?"
                      tooltip="Whether the interviewer requested a follow-up because your first answer lacked depth or did not fully address the question."
                    />
                    <YesNoBadge value={followUpAsked} />
                  </div>
                ) : null}

                {improvedFromCore != null ? (
                  <div className="space-y-2">
                    <AnalysisMetricLabel
                      label="Improved on follow-up?"
                      tooltip="Whether your follow-up answer showed greater depth or better addressed the question than your original answer."
                    />
                    <YesNoBadge value={improvedFromCore} />
                  </div>
                ) : null}
              </div>
            ) : null}

            {question.evaluation_reason ? (
              <div className="space-y-2">
                <p className="text-base font-medium text-foreground">
                  Evaluation
                </p>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {question.evaluation_reason}
                </p>
              </div>
            ) : null}

            {question.suggestions ? (
              <div className="space-y-2">
                <p className="text-base font-medium text-foreground">
                  Suggestions
                </p>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {question.suggestions}
                </p>
              </div>
            ) : null}

            {question.sentiment_label != null &&
            question.sentiment_score != null ? (
              <div className="space-y-2">
                <p className="text-base font-medium text-foreground">
                  Sentiment
                </p>
                <SentimentMeter
                  label={question.sentiment_label}
                  score={question.sentiment_score}
                  compact
                />
              </div>
            ) : null}

            {(question.keywords?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                <p className="text-base font-medium text-foreground">
                  Keywords
                </p>
                <div className="flex flex-wrap gap-2">
                  {question.keywords?.map((keyword) => (
                    <Badge
                      key={keyword.term}
                      variant="outline"
                      className={EVALUATION_PILL_CLASS}
                    >
                      {keyword.term}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </details>
      ) : (
        <p className="pl-4 text-base text-muted-foreground">
          Analysis not available for this answer.
        </p>
      )}
    </article>
  );
}

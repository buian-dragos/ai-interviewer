export type InterviewStatus = "in_progress" | "completed" | "abandoned";

export type AnswerDepth = "shallow" | "adequate" | "deep";

export type SentimentLabel = "positive" | "negative" | "neutral";

export type KeywordMatch = {
  term: string;
  score: number;
};

export type AnswerSentiment = {
  label: string;
  sequence: number;
  sentiment_label: SentimentLabel;
  sentiment_score: number;
};

export type AnswerEvaluation = {
  answer_depth: AnswerDepth;
  answered_question: boolean;
  evaluation_reason?: string | null;
  suggestions?: string | null;
  sentiment_label?: SentimentLabel;
  sentiment_score?: number;
  keywords?: KeywordMatch[];
};

export type Interview = {
  id: string;
  category: string;
  status: InterviewStatus;
  started_at: string;
  completed_at: string | null;
};

export type Theme = {
  title: string;
  description: string;
};

export type SummaryStatus = "pending" | "ready" | "failed";

export type InterviewSummaryResult = {
  status: SummaryStatus;
  summary?: string | null;
  themes?: Theme[];
  highlights?: string[];
  strengths?: string[];
  growth_areas?: string[];
  overall_sentiment_label?: SentimentLabel | null;
  overall_sentiment_score?: number | null;
  answers_scored?: number;
  answer_sentiments?: AnswerSentiment[];
  top_keywords?: KeywordMatch[];
  keywords?: KeywordMatch[];
  generated_at?: string | null;
  error?: string | null;
};

export type InterviewSummaryResponse = {
  interview: Interview;
  summary: InterviewSummaryResult;
};

export type InterviewQuestion = {
  id: string;
  sequence: number;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  answer_depth: AnswerDepth | null;
  answered_question: boolean | null;
  evaluation_reason: string | null;
  suggestions: string | null;
  follows_question_id: string | null;
  core_sequence: number;
  sentiment_label: SentimentLabel | null;
  sentiment_score: number | null;
  keywords: KeywordMatch[] | null;
};

export type SubmitAnswerResult = {
  saved: InterviewQuestion;
  questions: InterviewQuestion[];
  next_question_id: string | null;
  evaluation: AnswerEvaluation | null;
};

export function isQuestionSubmitted(question: InterviewQuestion): boolean {
  return question.answered_at != null;
}

export function isFollowUpStep(question: InterviewQuestion): boolean {
  return question.follows_question_id != null;
}

export function getCoreProgressValue(question: InterviewQuestion): number {
  return (question.core_sequence / 5) * 100;
}

export function findStepIndexById(
  questions: InterviewQuestion[],
  questionId: string,
): number {
  return questions.findIndex((question) => question.id === questionId);
}

export function findFirstUnsubmittedStepIndex(
  questions: InterviewQuestion[],
): number {
  const index = questions.findIndex((question) => !isQuestionSubmitted(question));
  return index === -1 ? 0 : index;
}

export function getParentCoreQuestion(
  questions: InterviewQuestion[],
  followUp: InterviewQuestion,
): InterviewQuestion | undefined {
  if (!followUp.follows_question_id) {
    return undefined;
  }

  return questions.find((question) => question.id === followUp.follows_question_id);
}

export function isLastTimelineStep(
  questions: InterviewQuestion[],
  stepIndex: number,
): boolean {
  return stepIndex >= questions.length - 1;
}

export function isCoreFiveStep(question: InterviewQuestion): boolean {
  return question.follows_question_id == null && question.core_sequence === 5;
}

export function isFinished(interview: Interview): boolean {
  return interview.status === "completed";
}

export function isInProgress(interview: Interview): boolean {
  return interview.status === "in_progress";
}

export function getInterviewHref(interview: Interview): string {
  return isFinished(interview)
    ? `/interview/${interview.id}/summary`
    : `/interview/${interview.id}`;
}

export function isInterviewPathActive(
  pathname: string,
  interviewId: string,
): boolean {
  return (
    pathname === `/interview/${interviewId}` ||
    pathname === `/interview/${interviewId}/summary` ||
    pathname === `/interview/${interviewId}/transcript`
  );
}

export function formatInterviewDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAnswerDuration(
  createdAt: string,
  answeredAt: string,
): string {
  const elapsedMs = Math.max(
    0,
    new Date(answeredAt).getTime() - new Date(createdAt).getTime(),
  );
  const totalSeconds = Math.round(elapsedMs / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

const DEPTH_RANK: Record<AnswerDepth, number> = {
  shallow: 0,
  adequate: 1,
  deep: 2,
};

export function questionHasFollowUp(
  questions: InterviewQuestion[],
  questionId: string,
): boolean {
  return questions.some(
    (question) => question.follows_question_id === questionId,
  );
}

export function hasImprovedFromCoreQuestion(
  coreQuestion: InterviewQuestion,
  followUpQuestion: InterviewQuestion,
): boolean | null {
  const depthImproved =
    coreQuestion.answer_depth != null &&
    followUpQuestion.answer_depth != null &&
    DEPTH_RANK[followUpQuestion.answer_depth] >
      DEPTH_RANK[coreQuestion.answer_depth];

  const addressedImproved =
    coreQuestion.answered_question === false &&
    followUpQuestion.answered_question === true;

  if (
    coreQuestion.answer_depth == null &&
    coreQuestion.answered_question == null
  ) {
    return null;
  }

  if (
    followUpQuestion.answer_depth == null &&
    followUpQuestion.answered_question == null
  ) {
    return null;
  }

  return depthImproved || addressedImproved;
}

export function formatQuestionLabel(question: InterviewQuestion): string {
  if (question.follows_question_id != null) {
    return `Q${question.core_sequence} follow up`;
  }

  return `Q${question.core_sequence}`;
}

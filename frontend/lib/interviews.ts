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
  answer_depth: AnswerDepth | null;
  follows_question_id: string | null;
  core_sequence: number;
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

export type InterviewStatus = "in_progress" | "completed" | "abandoned";

export type Interview = {
  id: string;
  category: string;
  status: InterviewStatus;
  started_at: string;
  completed_at: string | null;
};

export type InterviewSummary = Interview;

export type InterviewQuestion = {
  id: string;
  sequence: number;
  question: string;
  answer: string | null;
  answered_at: string | null;
};

export function isQuestionSubmitted(question: InterviewQuestion): boolean {
  return question.answered_at != null;
}

export function findFirstUnsubmittedIndex(
  questions: InterviewQuestion[],
): number {
  const index = questions.findIndex((question) => !isQuestionSubmitted(question));
  return index === -1 ? 0 : index;
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
    pathname === `/interview/${interviewId}/summary`
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

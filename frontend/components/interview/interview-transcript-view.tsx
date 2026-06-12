import {
  InterviewResultsHeader,
  InterviewResultsPageShell,
  InterviewResultsSectionDivider,
} from "@/components/interview/interview-results-layout";
import { TranscriptTimeline } from "@/components/interview/transcript-timeline";
import type { Interview, InterviewQuestion } from "@/lib/interviews";

type InterviewTranscriptViewProps = {
  interview: Interview;
  questions: InterviewQuestion[];
};

export function InterviewTranscriptView({
  interview,
  questions,
}: InterviewTranscriptViewProps) {
  return (
    <InterviewResultsPageShell>
      <InterviewResultsHeader
        interview={interview}
        title="Interview Transcript"
        actionLabel="View Summary"
        actionHref={`/interview/${interview.id}/summary`}
      />
      <InterviewResultsSectionDivider />
      <TranscriptTimeline questions={questions} />
    </InterviewResultsPageShell>
  );
}

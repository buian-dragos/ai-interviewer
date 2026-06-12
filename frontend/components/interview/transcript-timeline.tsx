import { Separator } from "@/components/ui/separator";
import { TranscriptTurn } from "@/components/interview/transcript-turn";
import {
  isQuestionSubmitted,
  type InterviewQuestion,
} from "@/lib/interviews";

type TranscriptTimelineProps = {
  questions: InterviewQuestion[];
};

export function TranscriptTimeline({ questions }: TranscriptTimelineProps) {
  const answeredQuestions = questions.filter((question) =>
    isQuestionSubmitted(question),
  );

  if (answeredQuestions.length === 0) {
    return (
      <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
        No answers recorded for this interview.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {answeredQuestions.map((question, index) => (
        <div key={question.id} className="space-y-8">
          <TranscriptTurn question={question} allQuestions={questions} />
          {index < answeredQuestions.length - 1 ? <Separator /> : null}
        </div>
      ))}
    </div>
  );
}

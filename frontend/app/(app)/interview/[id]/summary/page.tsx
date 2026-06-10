import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ApiError, getInterviewServer } from "@/lib/api";
import { formatInterviewDate, isFinished } from "@/lib/interviews";

type InterviewSummaryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InterviewSummaryPage({
  params,
}: InterviewSummaryPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();

  let interview;
  try {
    interview = await getInterviewServer(cookieStore.getAll(), id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  if (!isFinished(interview)) {
    redirect(`/interview/${id}`);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Interview summary
        </h1>
        <p className="text-sm text-muted-foreground">
          Topic: {interview.category}
        </p>
        <p className="text-sm text-muted-foreground">
          Started: {formatInterviewDate(interview.started_at)}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Summary coming soon.
      </p>
    </main>
  );
}

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ApiError, getInterviewServer } from "@/lib/api";
import { isFinished } from "@/lib/interviews";

type InterviewSessionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InterviewSessionPage({
  params,
}: InterviewSessionPageProps) {
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

  if (isFinished(interview)) {
    redirect(`/interview/${id}/summary`);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Interview session
        </h1>
        <p className="text-sm text-muted-foreground">
          Topic: {interview.category}
        </p>
      </div>
    </main>
  );
}

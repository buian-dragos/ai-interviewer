import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { InterviewSession } from "@/components/interview/interview-session";
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

  return <InterviewSession interview={interview} />;
}

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { InterviewSummaryView } from "@/components/interview/interview-summary-view";
import { ApiError, getInterviewServer, getInterviewSummaryServer } from "@/lib/api";
import { isFinished } from "@/lib/interviews";

type InterviewSummaryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InterviewSummaryPage({
  params,
}: InterviewSummaryPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieList = cookieStore.getAll();

  let interview;
  try {
    interview = await getInterviewServer(cookieList, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  if (!isFinished(interview)) {
    redirect(`/interview/${id}`);
  }

  let summaryData;
  try {
    summaryData = await getInterviewSummaryServer(cookieList, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return <InterviewSummaryView interviewId={id} initialData={summaryData} />;
}

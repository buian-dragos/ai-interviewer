import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { InterviewTranscriptView } from "@/components/interview/interview-transcript-view";
import {
  ApiError,
  getInterviewServer,
  listInterviewQuestionsServer,
} from "@/lib/api";
import { isFinished } from "@/lib/interviews";

type InterviewTranscriptPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InterviewTranscriptPage({
  params,
}: InterviewTranscriptPageProps) {
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

  let questions;
  try {
    questions = await listInterviewQuestionsServer(cookieList, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return <InterviewTranscriptView interview={interview} questions={questions} />;
}

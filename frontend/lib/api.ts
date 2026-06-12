import type {
  Interview,
  InterviewQuestion,
  InterviewSummaryResponse,
  SubmitAnswerResult,
} from "@/lib/interviews";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type User = {
  id: string;
  email: string | null;
};

export type SignUpResult = {
  user: User | null;
  confirmation_required: boolean;
  message: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string };
    if (typeof data.detail === "string") {
      return data.detail;
    }
  } catch {
    // ignore parse errors
  }
  return "Something went wrong. Please try again.";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  signUp(email: string, password: string) {
    return request<SignUpResult>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  signIn(email: string, password: string) {
    return request<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  signOut() {
    return request<void>("/auth/logout", { method: "POST" });
  },

  getMe() {
    return request<User>("/auth/me");
  },

  createInterview(category: string) {
    return request<Interview>("/interviews", {
      method: "POST",
      body: JSON.stringify({ category }),
    });
  },

  listInterviews() {
    return request<Interview[]>("/interviews");
  },

  getInterview(id: string) {
    return request<Interview>(`/interviews/${id}`);
  },

  listInterviewQuestions(interviewId: string) {
    return request<InterviewQuestion[]>(`/interviews/${interviewId}/questions`);
  },

  updateInterviewAnswer(
    interviewId: string,
    questionId: string,
    answer: string,
  ) {
    return request<InterviewQuestion>(
      `/interviews/${interviewId}/questions/${questionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ answer }),
      },
    );
  },

  submitInterviewAnswer(
    interviewId: string,
    questionId: string,
    answer: string,
  ) {
    return request<SubmitAnswerResult>(
      `/interviews/${interviewId}/questions/${questionId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ answer }),
      },
    );
  },

  getInterviewSummary(interviewId: string) {
    return request<InterviewSummaryResponse>(`/interviews/${interviewId}/summary`);
  },
};

export function getApiUrl() {
  return API_URL;
}

function buildCookieHeader(
  cookieList: Array<{ name: string; value: string }>,
): string {
  return cookieList.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

export async function getMeServer(
  cookieList: Array<{ name: string; value: string }>,
): Promise<User> {
  const cookieHeader = buildCookieHeader(cookieList);

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  return response.json() as Promise<User>;
}

async function requestServer<T>(
  path: string,
  cookieList: Array<{ name: string; value: string }>,
): Promise<T> {
  const cookieHeader = buildCookieHeader(cookieList);

  const response = await fetch(`${API_URL}${path}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  return response.json() as Promise<T>;
}

export async function listInterviewsServer(
  cookieList: Array<{ name: string; value: string }>,
): Promise<Interview[]> {
  return requestServer<Interview[]>("/interviews", cookieList);
}

export async function getInterviewServer(
  cookieList: Array<{ name: string; value: string }>,
  id: string,
): Promise<Interview> {
  return requestServer<Interview>(`/interviews/${id}`, cookieList);
}

export async function getInterviewSummaryServer(
  cookieList: Array<{ name: string; value: string }>,
  id: string,
): Promise<InterviewSummaryResponse> {
  return requestServer<InterviewSummaryResponse>(
    `/interviews/${id}/summary`,
    cookieList,
  );
}

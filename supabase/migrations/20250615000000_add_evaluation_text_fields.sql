alter table public.interview_questions
  add column if not exists evaluation_reason text,
  add column if not exists suggestions text;

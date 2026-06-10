create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  result jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index interviews_user_id_idx on public.interviews (user_id);

create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  follows_question_id uuid references public.interview_questions(id) on delete cascade,
  answer_depth text not null,
  sequence int not null,
  question text not null,
  answer text,
  sentiment_label text
    check (sentiment_label is null or sentiment_label in ('positive', 'negative', 'neutral')),
  sentiment_score numeric(6, 5),
  keywords jsonb not null default '[]'::jsonb,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (interview_id, sequence)
);

create index interview_questions_interview_id_idx
  on public.interview_questions (interview_id);

create index interview_questions_follows_question_id_idx
  on public.interview_questions (follows_question_id);

alter table public.interviews enable row level security;
alter table public.interview_questions enable row level security;

create policy "Users read own interviews"
  on public.interviews for select
  using (auth.uid() = user_id);

create policy "Users insert own interviews"
  on public.interviews for insert
  with check (auth.uid() = user_id);

create policy "Users update own interviews"
  on public.interviews for update
  using (auth.uid() = user_id);

create policy "Users read own interview questions"
  on public.interview_questions for select
  using (
    interview_id in (
      select id from public.interviews where user_id = auth.uid()
    )
  );

create policy "Users insert own interview questions"
  on public.interview_questions for insert
  with check (
    interview_id in (
      select id from public.interviews where user_id = auth.uid()
    )
  );

create policy "Users update own interview questions"
  on public.interview_questions for update
  using (
    interview_id in (
      select id from public.interviews where user_id = auth.uid()
    )
  );

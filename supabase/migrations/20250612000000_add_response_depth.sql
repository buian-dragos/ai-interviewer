alter table public.interview_questions
  add column response_depth text
    check (response_depth is null or response_depth in ('shallow', 'adequate', 'deep'));

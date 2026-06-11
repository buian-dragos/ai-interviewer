-- Repurpose answer_depth for evaluation depth; use follows_question_id for follow-ups.

update public.interview_questions
set answer_depth = response_depth
where response_depth is not null;

alter table public.interview_questions
  alter column answer_depth drop not null;

update public.interview_questions
set answer_depth = null
where answer_depth in ('core', 'follow_up');

alter table public.interview_questions
  drop column if exists response_depth;

alter table public.interview_questions
  drop constraint if exists interview_questions_answer_depth_check;

alter table public.interview_questions
  add constraint interview_questions_answer_depth_check
  check (answer_depth is null or answer_depth in ('shallow', 'adequate', 'deep'));

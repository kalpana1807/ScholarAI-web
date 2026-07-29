-- Add DEFAULT auth.uid() to user_id columns so client inserts without user_id succeed.
-- This satisfies the INSERT WITH CHECK (auth.uid() = user_id) policy.
alter table public.subjects alter column user_id set default auth.uid();
alter table public.notes alter column user_id set default auth.uid();
alter table public.quizzes alter column user_id set default auth.uid();
alter table public.flashcards alter column user_id set default auth.uid();
alter table public.study_plans alter column user_id set default auth.uid();
alter table public.study_sessions alter column user_id set default auth.uid();
alter table public.chat_threads alter column user_id set default auth.uid();
alter table public.chat_messages alter column user_id set default auth.uid();

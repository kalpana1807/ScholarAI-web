-- AI Study Companion schema
-- Profiles extend auth.users with display info.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  avatar_url text,
  learning_goal text,
  target_exam text,
  dark_mode boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  color text not null default '#3b66ff',
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  content text not null default '',
  summary text,
  key_points text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null default 'Quiz',
  questions jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  total integer not null default 0,
  difficulty text not null default 'medium',
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  deck_name text not null default 'General',
  question text not null,
  answer text not null,
  reviewed boolean not null default false,
  review_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  task text not null,
  due_date date not null,
  completed boolean not null default false,
  priority text not null default 'medium',
  created_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  duration_min integer not null default 0,
  session_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS everywhere
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.notes enable row level security;
alter table public.quizzes enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_sessions enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

-- Helper to drop & recreate policies cleanly
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','subjects','notes','quizzes','flashcards','study_plans','study_sessions','chat_threads','chat_messages'
  ]
  loop
    execute format('drop policy if exists select_own on public.%I;', t);
    execute format('drop policy if exists insert_own on public.%I;', t);
    execute format('drop policy if exists update_own on public.%I;', t);
    execute format('drop policy if exists delete_own on public.%I;', t);
  end loop;
end$$;

-- profiles
create policy select_own on public.profiles for select to authenticated using (auth.uid() = id);
create policy insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy delete_own on public.profiles for delete to authenticated using (auth.uid() = id);

-- subjects
create policy select_own on public.subjects for select to authenticated using (auth.uid() = user_id);
create policy insert_own on public.subjects for insert to authenticated with check (auth.uid() = user_id);
create policy update_own on public.subjects for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy delete_own on public.subjects for delete to authenticated using (auth.uid() = user_id);

-- notes
create policy select_own on public.notes for select to authenticated using (auth.uid() = user_id);
create policy insert_own on public.notes for insert to authenticated with check (auth.uid() = user_id);
create policy update_own on public.notes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy delete_own on public.notes for delete to authenticated using (auth.uid() = user_id);

-- quizzes
create policy select_own on public.quizzes for select to authenticated using (auth.uid() = user_id);
create policy insert_own on public.quizzes for insert to authenticated with check (auth.uid() = user_id);
create policy update_own on public.quizzes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy delete_own on public.quizzes for delete to authenticated using (auth.uid() = user_id);

-- flashcards
create policy select_own on public.flashcards for select to authenticated using (auth.uid() = user_id);
create policy insert_own on public.flashcards for insert to authenticated with check (auth.uid() = user_id);
create policy update_own on public.flashcards for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy delete_own on public.flashcards for delete to authenticated using (auth.uid() = user_id);

-- study_plans
create policy select_own on public.study_plans for select to authenticated using (auth.uid() = user_id);
create policy insert_own on public.study_plans for insert to authenticated with check (auth.uid() = user_id);
create policy update_own on public.study_plans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy delete_own on public.study_plans for delete to authenticated using (auth.uid() = user_id);

-- study_sessions
create policy select_own on public.study_sessions for select to authenticated using (auth.uid() = user_id);
create policy insert_own on public.study_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy update_own on public.study_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy delete_own on public.study_sessions for delete to authenticated using (auth.uid() = user_id);

-- chat_threads
create policy select_own on public.chat_threads for select to authenticated using (auth.uid() = user_id);
create policy insert_own on public.chat_threads for insert to authenticated with check (auth.uid() = user_id);
create policy update_own on public.chat_threads for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy delete_own on public.chat_threads for delete to authenticated using (auth.uid() = user_id);

-- chat_messages
create policy select_own on public.chat_messages for select to authenticated using (auth.uid() = user_id);
create policy insert_own on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);
create policy update_own on public.chat_messages for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy delete_own on public.chat_messages for delete to authenticated using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_subjects_user on public.subjects(user_id);
create index if not exists idx_notes_user on public.notes(user_id);
create index if not exists idx_notes_created on public.notes(created_at desc);
create index if not exists idx_quizzes_user on public.quizzes(user_id);
create index if not exists idx_flashcards_user on public.flashcards(user_id);
create index if not exists idx_study_plans_user on public.study_plans(user_id);
create index if not exists idx_study_plans_due on public.study_plans(due_date);
create index if not exists idx_sessions_user on public.study_sessions(user_id);
create index if not exists idx_sessions_date on public.study_sessions(session_date);
create index if not exists idx_chat_threads_user on public.chat_threads(user_id);
create index if not exists idx_chat_messages_thread on public.chat_messages(thread_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

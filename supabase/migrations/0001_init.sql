create extension if not exists vector;

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  resume_text text,
  resume_embedding vector(384),       -- gte-small dims
  created_at timestamptz default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  company text not null,
  role_title text not null,
  jd_text text not null,
  jd_embedding vector(384),
  match_score int,                    -- 0-100
  status text default 'saved'         -- saved|applied|interviewing|offer|rejected
    check (status in ('saved','applied','interviewing','offer','rejected')),
  next_action_at timestamptz,
  analysis jsonb,                     -- bullets, STAR, keywords, gaps
  created_at timestamptz default now()
);

create table telemetry (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  endpoint text,
  model text,
  prompt_tokens int,
  completion_tokens int,
  est_cost_usd numeric(10,6),
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table applications enable row level security;
alter table telemetry enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id);
create policy "own apps" on applications
  for all using (auth.uid() = user_id);
create policy "own telemetry" on telemetry
  for all using (auth.uid() = user_id);

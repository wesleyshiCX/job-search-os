-- ============================================
-- RESUMES
-- ============================================
create table resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  label text not null default 'Default',
  file_path text not null,
  file_type text not null default 'pdf',
  raw_text text not null,
  embedding vector(384),
  is_active boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table resumes enable row level security;

create policy "Users see own resumes"
  on resumes for select
  using (auth.uid() = user_id);

create policy "Users insert own resumes"
  on resumes for insert
  with check (auth.uid() = user_id);

create policy "Users update own resumes"
  on resumes for update
  using (auth.uid() = user_id);

create policy "Users delete own resumes"
  on resumes for delete
  using (auth.uid() = user_id);

-- Only one active resume per user
create unique index resumes_one_active_per_user
  on resumes (user_id) where is_active = true;

-- ============================================
-- CONTACTS
-- ============================================
create table contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  title text,
  company text,
  email text,
  linkedin_url text,
  phone text,
  notes text,
  warmth text not null default 'cold'
    check (warmth in ('cold','warm','hot','advocate')),
  created_at timestamptz default now()
);

alter table contacts enable row level security;

create policy "Users see own contacts"
  on contacts for select
  using (auth.uid() = user_id);

create policy "Users insert own contacts"
  on contacts for insert
  with check (auth.uid() = user_id);

create policy "Users update own contacts"
  on contacts for update
  using (auth.uid() = user_id);

create policy "Users delete own contacts"
  on contacts for delete
  using (auth.uid() = user_id);

-- ============================================
-- APPLICATION ↔ CONTACTS JUNCTION
-- ============================================
create table application_contacts (
  application_id uuid references applications not null on delete cascade,
  contact_id uuid references contacts not null on delete cascade,
  role text not null default 'recruiter'
    check (role in ('recruiter','hiring_manager','referral','interviewer','other')),
  primary key (application_id, contact_id)
);

alter table application_contacts enable row level security;

create policy "Users see own app contacts"
  on application_contacts for select
  using (
    application_id in (
      select id from applications where user_id = auth.uid()
    )
  );

create policy "Users insert own app contacts"
  on application_contacts for insert
  with check (
    application_id in (
      select id from applications where user_id = auth.uid()
    )
    and contact_id in (
      select id from contacts where user_id = auth.uid()
    )
  );

create policy "Users delete own app contacts"
  on application_contacts for delete
  using (
    application_id in (
      select id from applications where user_id = auth.uid()
    )
  );

-- ============================================
-- CONTACT INTERACTIONS
-- ============================================
create table contact_interactions (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references contacts not null on delete cascade,
  interaction_type text not null
    check (interaction_type in (
      'email_sent','email_received','call','interview',
      'linkedin_connect','coffee_chat','follow_up','other'
    )),
  notes text,
  occurred_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table contact_interactions enable row level security;

create policy "Users see own interactions"
  on contact_interactions for select
  using (
    contact_id in (
      select id from contacts where user_id = auth.uid()
    )
  );

create policy "Users insert own interactions"
  on contact_interactions for insert
  with check (
    contact_id in (
      select id from contacts where user_id = auth.uid()
    )
  );

create policy "Users delete own interactions"
  on contact_interactions for delete
  using (
    contact_id in (
      select id from contacts where user_id = auth.uid()
    )
  );

-- ============================================
-- STORAGE BUCKET FOR RESUMES
-- ============================================
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false);

create policy "Users upload own resumes"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own resumes"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own resumes"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- FOLLOW-UP REMINDER COLUMN ON APPLICATIONS
-- ============================================
alter table applications
  add column if not exists follow_up_at timestamptz,
  add column if not exists source_url text;

-- ============================================
-- HELPER: mark resume active (unsets others)
-- ============================================
create or replace function set_active_resume(p_resume_id uuid, p_user_id uuid)
returns void as $$
begin
  update resumes set is_active = false where user_id = p_user_id and is_active = true;
  update resumes set is_active = true where id = p_resume_id and user_id = p_user_id;
end;
$$ language plpgsql security definer;

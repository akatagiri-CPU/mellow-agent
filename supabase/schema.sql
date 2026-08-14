-- AI Bucho app schema: companies, per-company users, and data isolation via RLS.

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('mellow_admin', 'company_user');
  end if;
end $$;

-- One row per auth.users id. mellow_admin rows have company_id = null.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid references companies (id) on delete cascade,
  role user_role not null default 'company_user',
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  constraint company_user_requires_company
    check (role = 'mellow_admin' or company_id is not null)
);

create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from profiles where id = auth.uid();
$$;

alter table companies enable row level security;
alter table profiles enable row level security;

-- MELLOW staff can see and manage every company; company users can see only their own.
drop policy if exists companies_select on companies;
create policy companies_select on companies
  for select using (
    current_user_role() = 'mellow_admin'
    or id = current_user_company_id()
  );

drop policy if exists companies_write on companies;
create policy companies_write on companies
  for all using (current_user_role() = 'mellow_admin')
  with check (current_user_role() = 'mellow_admin');

-- MELLOW staff can see/manage every profile; company users can see only their own company's profiles.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select using (
    current_user_role() = 'mellow_admin'
    or company_id = current_user_company_id()
  );

drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles
  for insert with check (current_user_role() = 'mellow_admin');

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles
  for update using (current_user_role() = 'mellow_admin' or id = auth.uid());

-- Recruitment (採用管理): candidates and their interview scores, scoped per company.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'candidate_status') then
    create type candidate_status as enum (
      'applied', 'interviewing', 'offered', 'hired', 'rejected'
    );
  end if;
end $$;

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  email text,
  status candidate_status not null default 'applied',
  resume_text text not null default '',
  ai_trait_summary text[],
  ai_interview_questions text[],
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidate_scores (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates (id) on delete cascade,
  scorer_id uuid not null references profiles (id),
  score int not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table candidates enable row level security;
alter table candidate_scores enable row level security;

drop policy if exists candidates_select on candidates;
create policy candidates_select on candidates
  for select using (
    current_user_role() = 'mellow_admin'
    or company_id = current_user_company_id()
  );

drop policy if exists candidates_write on candidates;
create policy candidates_write on candidates
  for all using (
    current_user_role() = 'mellow_admin'
    or company_id = current_user_company_id()
  )
  with check (
    current_user_role() = 'mellow_admin'
    or company_id = current_user_company_id()
  );

drop policy if exists candidate_scores_select on candidate_scores;
create policy candidate_scores_select on candidate_scores
  for select using (
    current_user_role() = 'mellow_admin'
    or exists (
      select 1 from candidates c
      where c.id = candidate_scores.candidate_id
        and c.company_id = current_user_company_id()
    )
  );

drop policy if exists candidate_scores_write on candidate_scores;
create policy candidate_scores_write on candidate_scores
  for all using (
    current_user_role() = 'mellow_admin'
    or exists (
      select 1 from candidates c
      where c.id = candidate_scores.candidate_id
        and c.company_id = current_user_company_id()
    )
  )
  with check (
    current_user_role() = 'mellow_admin'
    or exists (
      select 1 from candidates c
      where c.id = candidate_scores.candidate_id
        and c.company_id = current_user_company_id()
    )
  );

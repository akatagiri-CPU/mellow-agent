-- AI Bucho app schema: companies, per-company users, and data isolation via RLS.

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sfa_url text,
  created_at timestamptz not null default now()
);

alter table companies add column if not exists sfa_url text;

-- 会社名の重複登録を防ぐ。既存データに重複がある場合は作成をスキップするので、
-- 先に重複を解消してから再実行してください。
do $$
begin
  create unique index if not exists companies_name_unique_idx on companies (lower(name));
exception
  when unique_violation then
    raise notice '重複した会社名が存在するため companies_name_unique_idx を作成できませんでした。管理画面で重複を削除してから schema.sql を再実行してください。';
end $$;

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
  ai_strengths text[],
  ai_concerns text[],
  ai_blank_spots text[],
  ai_axis_questions jsonb,
  ai_analyzed_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 面接前サポート導入前の旧カラムからの移行（既存テーブルにも安全に適用可能）。
alter table candidates drop column if exists ai_trait_summary;
alter table candidates drop column if exists ai_interview_questions;
alter table candidates add column if not exists ai_strengths text[];
alter table candidates add column if not exists ai_concerns text[];
alter table candidates add column if not exists ai_blank_spots text[];
alter table candidates add column if not exists ai_axis_questions jsonb;
alter table candidates add column if not exists ai_analyzed_at timestamptz;

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

-- Sales (営業管理): deals and their progress logs, scoped per company.
-- stage is plain text (no DB enum/check) so per-company custom pipelines
-- can be introduced later without a schema migration; the standard
-- 6-stage list is validated at the application layer for now.

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  customer_name text,
  acquisition_channel text,
  owner_name text,
  stage text not null default 'approach',
  amount numeric,
  next_action text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists deal_logs (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals (id) on delete cascade,
  logged_at date not null default current_date,
  handled_by text,
  content text,
  stage text not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists deals_company_id_idx on deals (company_id);
create index if not exists deal_logs_deal_id_idx on deal_logs (deal_id);

alter table deals enable row level security;
alter table deal_logs enable row level security;

drop policy if exists deals_select on deals;
create policy deals_select on deals
  for select using (
    current_user_role() = 'mellow_admin'
    or company_id = current_user_company_id()
  );

drop policy if exists deals_write on deals;
create policy deals_write on deals
  for all using (
    current_user_role() = 'mellow_admin'
    or company_id = current_user_company_id()
  )
  with check (
    current_user_role() = 'mellow_admin'
    or company_id = current_user_company_id()
  );

drop policy if exists deal_logs_select on deal_logs;
create policy deal_logs_select on deal_logs
  for select using (
    current_user_role() = 'mellow_admin'
    or exists (
      select 1 from deals d
      where d.id = deal_logs.deal_id
        and d.company_id = current_user_company_id()
    )
  );

drop policy if exists deal_logs_write on deal_logs;
create policy deal_logs_write on deal_logs
  for all using (
    current_user_role() = 'mellow_admin'
    or exists (
      select 1 from deals d
      where d.id = deal_logs.deal_id
        and d.company_id = current_user_company_id()
    )
  )
  with check (
    current_user_role() = 'mellow_admin'
    or exists (
      select 1 from deals d
      where d.id = deal_logs.deal_id
        and d.company_id = current_user_company_id()
    )
  );

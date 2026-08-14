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

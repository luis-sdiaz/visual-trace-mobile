-- Migration: Create public.comparisons base table and RLS policies
-- Baseline schema aligned with Supabase Production verified state.
-- Prerequisite for ai_analysis_reports, ai_usage_limits, attempts, and storage policies.

create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  initial_image_path text,
  final_image_path text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'analyzed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comparisons enable row level security;

-- Row Level Security policies matching production names and rules
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comparisons' and policyname = 'Users can view own comparisons'
  ) then
    create policy "Users can view own comparisons"
      on public.comparisons for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comparisons' and policyname = 'Users can create own comparisons'
  ) then
    create policy "Users can create own comparisons"
      on public.comparisons for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comparisons' and policyname = 'Users can update own comparisons'
  ) then
    create policy "Users can update own comparisons"
      on public.comparisons for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comparisons' and policyname = 'Users can delete own comparisons'
  ) then
    create policy "Users can delete own comparisons"
      on public.comparisons for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Indexes matching verified production schema:
-- 1. comparisons_pkey (automatically created by PRIMARY KEY on id)
-- 2. comparisons_user_id_idx (foreign key and filter by user)
create index if not exists comparisons_user_id_idx
  on public.comparisons (user_id);

-- 3. comparisons_created_at_idx (sorting and recent comparisons)
create index if not exists comparisons_created_at_idx
  on public.comparisons (created_at desc);

-- OPTIONAL OPTIMIZATION EVALUATION:
-- A composite index `comparisons_user_id_created_at_idx` on (user_id, created_at desc)
-- can optimize paginated queries filtering by user_id and ordering by created_at.
-- In production, the existing individual indexes (comparisons_user_id_idx, comparisons_created_at_idx)
-- adequately cover current query patterns without unnecessary write overhead.
-- If high-scale user pagination requires it in the future, it should be added via a dedicated migration.

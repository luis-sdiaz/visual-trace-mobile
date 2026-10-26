-- Idempotent consolidation of AI analysis tables, attempts, RPCs, and service_role permissions.

-- 1. Table: ai_analysis_reports
create table if not exists public.ai_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.comparisons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null check (char_length(model) between 1 and 100),
  contract_version text not null,
  result jsonb not null check (
    jsonb_typeof(result) = 'object'
    and result ->> 'contractVersion' = contract_version
  ),
  initial_image_path text not null,
  final_image_path text not null,
  created_at timestamptz not null default now(),
  unique (comparison_id, initial_image_path, final_image_path)
);

alter table public.ai_analysis_reports enable row level security;

drop policy if exists "Users can read current reports for their comparisons" on public.ai_analysis_reports;
create policy "Users can read current reports for their comparisons"
on public.ai_analysis_reports
for select
to authenticated
using (
  ai_analysis_reports.user_id = auth.uid()
  and exists (
    select 1
    from public.comparisons c
    where c.id = ai_analysis_reports.comparison_id
      and c.user_id = auth.uid()
      and c.initial_image_path = ai_analysis_reports.initial_image_path
      and c.final_image_path = ai_analysis_reports.final_image_path
  )
);

grant select on public.ai_analysis_reports to authenticated;
grant all on public.ai_analysis_reports to service_role;

-- 2. Table: ai_analysis_attempts
create table if not exists public.ai_analysis_attempts (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.comparisons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  initial_image_path text not null,
  final_image_path text not null,
  status text not null check (status in ('reserved', 'succeeded', 'failed_uncertain')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_analysis_attempts_created_at_idx
on public.ai_analysis_attempts (created_at);

create index if not exists ai_analysis_attempts_user_created_at_idx
on public.ai_analysis_attempts (user_id, created_at);

create unique index if not exists ai_analysis_attempts_one_active_version_idx
on public.ai_analysis_attempts (comparison_id, initial_image_path, final_image_path)
where status = 'reserved';

alter table public.ai_analysis_attempts enable row level security;
revoke all on public.ai_analysis_attempts from anon, authenticated;
grant all on public.ai_analysis_attempts to service_role;

-- 3. Table: ai_usage_limits (fallback configuration table)
create table if not exists public.ai_usage_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_usage_limits enable row level security;
grant all on public.ai_usage_limits to service_role;
grant select on public.ai_usage_limits to authenticated;

-- 4. RPC: reserve_ai_analysis_usage (drop obsolete overloads first)
drop function if exists public.reserve_ai_analysis_usage(
  uuid, uuid, text, text, integer, integer, integer
);

create or replace function public.reserve_ai_analysis_usage(
  p_comparison_id uuid,
  p_user_id uuid,
  p_initial_image_path text,
  p_final_image_path text,
  p_global_per_minute integer,
  p_global_per_day integer,
  p_user_per_day integer,
  p_comparison_per_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cached_report public.ai_analysis_reports;
  active_attempt public.ai_analysis_attempts;
  new_attempt public.ai_analysis_attempts;
begin
  if p_global_per_minute not between 1 and 3
    or p_global_per_day not between 1 and 10
    or p_user_per_day not between 1 and 6
    or p_comparison_per_day not between 1 and 3 then
    raise exception 'invalid_usage_configuration' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('visualtrace_ai_usage'));

  if not exists (
    select 1 from public.comparisons c
    where c.id = p_comparison_id and c.user_id = p_user_id
      and c.initial_image_path = p_initial_image_path
      and c.final_image_path = p_final_image_path
  ) then
    raise exception 'comparison_images_changed' using errcode = 'P0001';
  end if;

  select * into cached_report
  from public.ai_analysis_reports r
  where r.comparison_id = p_comparison_id
    and r.user_id = p_user_id
    and r.initial_image_path = p_initial_image_path
    and r.final_image_path = p_final_image_path;

  if cached_report.id is not null then
    return jsonb_build_object('action', 'cached', 'report', to_jsonb(cached_report));
  end if;

  update public.ai_analysis_attempts
  set status = 'failed_uncertain', completed_at = now()
  where comparison_id = p_comparison_id
    and initial_image_path = p_initial_image_path
    and final_image_path = p_final_image_path
    and status = 'reserved'
    and created_at <= now() - interval '5 minutes';

  select * into active_attempt
  from public.ai_analysis_attempts a
  where a.comparison_id = p_comparison_id
    and a.initial_image_path = p_initial_image_path
    and a.final_image_path = p_final_image_path
    and a.status = 'reserved';

  if active_attempt.id is not null then
    return jsonb_build_object('action', 'in_progress', 'attemptId', active_attempt.id);
  end if;

  if (select count(*) from public.ai_analysis_attempts where created_at >= now() - interval '1 minute')
    >= p_global_per_minute then
    return jsonb_build_object('action', 'limited', 'scope', 'global_minute');
  end if;

  if (select count(*) from public.ai_analysis_attempts
      where (created_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date)
    >= p_global_per_day then
    return jsonb_build_object('action', 'limited', 'scope', 'global_day');
  end if;

  if (select count(*) from public.ai_analysis_attempts
      where user_id = p_user_id
        and (created_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date)
    >= p_user_per_day then
    return jsonb_build_object('action', 'limited', 'scope', 'user_day');
  end if;

  if (select count(*) from public.ai_analysis_attempts
      where comparison_id = p_comparison_id
        and (created_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date)
    >= p_comparison_per_day then
    return jsonb_build_object('action', 'limited', 'scope', 'comparison_day');
  end if;

  insert into public.ai_analysis_attempts (
    comparison_id, user_id, initial_image_path, final_image_path, status
  ) values (
    p_comparison_id, p_user_id, p_initial_image_path, p_final_image_path, 'reserved'
  ) returning * into new_attempt;

  return jsonb_build_object('action', 'reserved', 'attemptId', new_attempt.id);
end;
$$;

revoke all on function public.reserve_ai_analysis_usage(
  uuid, uuid, text, text, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.reserve_ai_analysis_usage(
  uuid, uuid, text, text, integer, integer, integer, integer
) to service_role;

-- 5. RPC: persist_ai_analysis_report
create or replace function public.persist_ai_analysis_report(
  p_comparison_id uuid,
  p_user_id uuid,
  p_model text,
  p_contract_version text,
  p_result jsonb,
  p_initial_image_path text,
  p_final_image_path text
)
returns public.ai_analysis_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_report public.ai_analysis_reports;
begin
  if not exists (
    select 1 from public.comparisons c
    where c.id = p_comparison_id
      and c.user_id = p_user_id
      and c.initial_image_path = p_initial_image_path
      and c.final_image_path = p_final_image_path
      and c.initial_image_path is not null
      and c.final_image_path is not null
  ) then
    raise exception 'comparison_images_changed' using errcode = 'P0001';
  end if;

  insert into public.ai_analysis_reports (
    comparison_id, user_id, model, contract_version, result,
    initial_image_path, final_image_path
  ) values (
    p_comparison_id, p_user_id, p_model, p_contract_version, p_result,
    p_initial_image_path, p_final_image_path
  )
  on conflict (comparison_id, initial_image_path, final_image_path)
  do nothing
  returning * into saved_report;

  if saved_report.id is null then
    select * into strict saved_report
    from public.ai_analysis_reports
    where comparison_id = p_comparison_id
      and initial_image_path = p_initial_image_path
      and final_image_path = p_final_image_path;
  end if;

  update public.comparisons
  set status = 'analyzed', updated_at = now()
  where id = p_comparison_id
    and user_id = p_user_id
    and initial_image_path = p_initial_image_path
    and final_image_path = p_final_image_path;

  if not found then
    raise exception 'comparison_images_changed' using errcode = 'P0001';
  end if;

  return saved_report;
end;
$$;

revoke all on function public.persist_ai_analysis_report(uuid, uuid, text, text, jsonb, text, text)
from public, anon, authenticated;
grant execute on function public.persist_ai_analysis_report(uuid, uuid, text, text, jsonb, text, text)
to service_role;

-- 6. RPC: complete_ai_analysis_usage
create or replace function public.complete_ai_analysis_usage(
  p_attempt_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('succeeded', 'failed_uncertain') then
    raise exception 'invalid_attempt_status' using errcode = 'P0001';
  end if;

  update public.ai_analysis_attempts
  set status = p_status, completed_at = now()
  where id = p_attempt_id and status = 'reserved';
end;
$$;

revoke all on function public.complete_ai_analysis_usage(uuid, text)
from public, anon, authenticated;
grant execute on function public.complete_ai_analysis_usage(uuid, text)
to service_role;

-- 7. Notify PostgREST to reload its schema cache
notify pgrst, 'reload schema';


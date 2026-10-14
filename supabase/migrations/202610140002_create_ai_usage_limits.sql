create table public.ai_analysis_attempts (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.comparisons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  initial_image_path text not null,
  final_image_path text not null,
  status text not null check (status in ('reserved', 'succeeded', 'failed_uncertain')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (comparison_id, initial_image_path, final_image_path)
);

create index ai_analysis_attempts_created_at_idx
on public.ai_analysis_attempts (created_at);

create index ai_analysis_attempts_user_created_at_idx
on public.ai_analysis_attempts (user_id, created_at);

alter table public.ai_analysis_attempts enable row level security;
revoke all on public.ai_analysis_attempts from anon, authenticated;

create or replace function public.reserve_ai_analysis_usage(
  p_comparison_id uuid,
  p_user_id uuid,
  p_initial_image_path text,
  p_final_image_path text,
  p_global_per_minute integer,
  p_global_per_day integer,
  p_user_per_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cached_report public.ai_analysis_reports;
  existing_attempt public.ai_analysis_attempts;
  new_attempt public.ai_analysis_attempts;
begin
  if p_global_per_minute not between 1 and 3
    or p_global_per_day not between 1 and 10
    or p_user_per_day not between 1 and 6 then
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

  select * into existing_attempt
  from public.ai_analysis_attempts a
  where a.comparison_id = p_comparison_id
    and a.initial_image_path = p_initial_image_path
    and a.final_image_path = p_final_image_path;

  if existing_attempt.id is not null then
    return jsonb_build_object('action', 'in_progress', 'attemptId', existing_attempt.id);
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

  insert into public.ai_analysis_attempts (
    comparison_id, user_id, initial_image_path, final_image_path, status
  ) values (
    p_comparison_id, p_user_id, p_initial_image_path, p_final_image_path, 'reserved'
  ) returning * into new_attempt;

  return jsonb_build_object('action', 'reserved', 'attemptId', new_attempt.id);
end;
$$;

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

revoke all on function public.reserve_ai_analysis_usage(uuid, uuid, text, text, integer, integer, integer)
from public, anon, authenticated;
revoke all on function public.complete_ai_analysis_usage(uuid, text)
from public, anon, authenticated;
grant execute on function public.reserve_ai_analysis_usage(uuid, uuid, text, text, integer, integer, integer)
to service_role;
grant execute on function public.complete_ai_analysis_usage(uuid, text)
to service_role;

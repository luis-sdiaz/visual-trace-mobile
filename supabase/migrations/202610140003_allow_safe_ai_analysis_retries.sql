-- Keep every attempt for quota accounting and audit, but allow more than one
-- historical attempt for the same immutable pair of image paths.
do $$
declare
  historical_unique_constraint name;
begin
  select c.conname
  into historical_unique_constraint
  from pg_constraint c
  where c.conrelid = 'public.ai_analysis_attempts'::regclass
    and c.contype = 'u'
    and (
      select array_agg(a.attname order by key_columns.ordinality)
      from unnest(c.conkey) with ordinality as key_columns(attnum, ordinality)
      join pg_attribute a
        on a.attrelid = c.conrelid and a.attnum = key_columns.attnum
    ) = array['comparison_id', 'initial_image_path', 'final_image_path']::name[];

  if historical_unique_constraint is not null then
    execute format(
      'alter table public.ai_analysis_attempts drop constraint %I',
      historical_unique_constraint
    );
  end if;
end;
$$;

-- This database constraint is the final concurrency guard even if application
-- code changes or two transactions reach the insert at nearly the same time.
create unique index if not exists ai_analysis_attempts_one_active_version_idx
on public.ai_analysis_attempts (comparison_id, initial_image_path, final_image_path)
where status = 'reserved';

drop function if exists public.reserve_ai_analysis_usage(
  uuid, uuid, text, text, integer, integer, integer
);

create function public.reserve_ai_analysis_usage(
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

  -- Serialize the read/check/insert sequence so quota counters and per-version
  -- reservations cannot race. The partial unique index remains a second guard.
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

  -- Five minutes is deliberately longer than the Edge Function's Gemini
  -- timeout. An abandoned reservation becomes uncertain, remains billable for
  -- quota purposes, and no longer blocks this image version forever.
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

  -- All statuses count. Failed and expired attempts are intentionally not
  -- removed or refunded because the provider outcome may be unknown.
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

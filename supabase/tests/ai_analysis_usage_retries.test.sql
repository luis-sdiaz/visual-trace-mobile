begin;

insert into auth.users (id, email)
values ('33333333-3333-4333-8333-333333333333', 'usage-retry@visualtrace.test');

insert into public.comparisons (
  id,
  user_id,
  name,
  initial_image_path,
  final_image_path,
  status
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '33333333-3333-4333-8333-333333333333',
  'Usage retry integration',
  '33333333-3333-4333-8333-333333333333/cccccccc-cccc-4ccc-8ccc-cccccccccccc/initial.jpg',
  '33333333-3333-4333-8333-333333333333/cccccccc-cccc-4ccc-8ccc-cccccccccccc/final.jpg',
  'ready'
);

set local role service_role;

do $$
declare
  target_comparison_id constant uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  target_user_id constant uuid := '33333333-3333-4333-8333-333333333333';
  initial_path constant text :=
    '33333333-3333-4333-8333-333333333333/cccccccc-cccc-4ccc-8ccc-cccccccccccc/initial.jpg';
  final_path constant text :=
    '33333333-3333-4333-8333-333333333333/cccccccc-cccc-4ccc-8ccc-cccccccccccc/final.jpg';
  first_reservation jsonb;
  duplicate_reservation jsonb;
  reservation jsonb;
begin
  first_reservation := public.reserve_ai_analysis_usage(
    target_comparison_id, target_user_id, initial_path, final_path, 3, 10, 6, 3
  );
  if first_reservation ->> 'action' <> 'reserved' then
    raise exception 'First analysis attempt was not reserved';
  end if;

  duplicate_reservation := public.reserve_ai_analysis_usage(
    target_comparison_id, target_user_id, initial_path, final_path, 3, 10, 6, 3
  );
  if duplicate_reservation ->> 'action' <> 'in_progress'
    or duplicate_reservation ->> 'attemptId' <> first_reservation ->> 'attemptId' then
    raise exception 'Concurrent duplicate was not deduplicated';
  end if;

  update public.ai_analysis_attempts
  set created_at = now() - interval '6 minutes'
  where id = (first_reservation ->> 'attemptId')::uuid;

  reservation := public.reserve_ai_analysis_usage(
    target_comparison_id, target_user_id, initial_path, final_path, 3, 10, 6, 3
  );
  if reservation ->> 'action' <> 'reserved' then
    raise exception 'Expired reservation did not allow a retry';
  end if;
  perform public.complete_ai_analysis_usage(
    (reservation ->> 'attemptId')::uuid,
    'failed_uncertain'
  );

  reservation := public.reserve_ai_analysis_usage(
    target_comparison_id, target_user_id, initial_path, final_path, 3, 10, 6, 3
  );
  if reservation ->> 'action' <> 'reserved' then
    raise exception 'Third comparison attempt was not reserved';
  end if;
  perform public.complete_ai_analysis_usage(
    (reservation ->> 'attemptId')::uuid,
    'failed_uncertain'
  );

  reservation := public.reserve_ai_analysis_usage(
    target_comparison_id, target_user_id, initial_path, final_path, 3, 10, 6, 3
  );
  if reservation ->> 'action' <> 'limited'
    or reservation ->> 'scope' <> 'comparison_day' then
    raise exception 'Per-comparison daily limit was not enforced';
  end if;

  if (
    select count(*)
    from public.ai_analysis_attempts
    where ai_analysis_attempts.comparison_id = target_comparison_id
      and status = 'failed_uncertain'
  ) <> 3 then
    raise exception 'Retry history was not preserved conservatively';
  end if;
end;
$$;

reset role;
rollback;

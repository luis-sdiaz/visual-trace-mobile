begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'rls-owner@visualtrace.test'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'rls-other@visualtrace.test');

insert into public.comparisons (
  id, user_id, name, initial_image_path, final_image_path, status
) values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'RLS target', 'owner/target/initial.jpg', 'owner/target/final.jpg', 'ready'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Same-owner decoy', 'owner/target/initial.jpg', 'owner/target/final.jpg', 'ready'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Usage RPC', 'owner/usage/initial.jpg', 'owner/usage/final.jpg', 'ready'
  );

set local role service_role;

do $$
begin
  perform public.persist_ai_analysis_report(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'gemini-test',
    '1.0',
    '{"contractVersion":"1.0","hasVisibleChanges":false,"summary":"Sin cambios","differences":[],"observations":[],"uncertainties":[]}'::jsonb,
    'owner/target/initial.jpg',
    'owner/target/final.jpg'
  );
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);

do $$
begin
  if (select count(*) from public.ai_analysis_reports) <> 1 then
    raise exception 'Owner cannot read the current report';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  true
);

do $$
begin
  if exists (select 1 from public.ai_analysis_reports) then
    raise exception 'Another user can read the owner report';
  end if;
end;
$$;

reset role;
update public.comparisons
set initial_image_path = 'owner/target/initial-replaced.jpg', status = 'ready'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);

do $$
begin
  if exists (select 1 from public.ai_analysis_reports) then
    raise exception 'Report remains visible after replacing the initial image';
  end if;
end;
$$;

reset role;
update public.comparisons
set initial_image_path = 'owner/target/initial.jpg',
    final_image_path = 'owner/target/final-replaced.jpg'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);

do $$
begin
  if exists (select 1 from public.ai_analysis_reports) then
    raise exception 'Report remains visible after replacing the final image';
  end if;
end;
$$;

reset role;
update public.comparisons
set initial_image_path = 'owner/target/initial-replaced.jpg',
    final_image_path = 'owner/target/final-replaced.jpg'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);

do $$
begin
  if exists (select 1 from public.ai_analysis_reports) then
    raise exception 'Report remains visible after replacing both images';
  end if;
end;
$$;

reset role;

do $$
begin
  if (select count(*) from public.ai_analysis_reports) <> 1 then
    raise exception 'Historical report was deleted instead of hidden';
  end if;
end;
$$;

set local role service_role;

do $$
declare
  reservation jsonb;
begin
  perform public.persist_ai_analysis_report(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'gemini-test',
    '1.0',
    '{"contractVersion":"1.0","hasVisibleChanges":true,"summary":"Cambios visibles","differences":[],"observations":[],"uncertainties":[]}'::jsonb,
    'owner/target/initial-replaced.jpg',
    'owner/target/final-replaced.jpg'
  );

  reservation := public.reserve_ai_analysis_usage(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'owner/usage/initial.jpg',
    'owner/usage/final.jpg',
    3, 10, 6, 3
  );

  if reservation ->> 'action' <> 'reserved' then
    raise exception 'Usage reservation RPC no longer works';
  end if;

  perform public.complete_ai_analysis_usage(
    (reservation ->> 'attemptId')::uuid,
    'succeeded'
  );
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);

do $$
begin
  if (select count(*) from public.ai_analysis_reports) <> 1 then
    raise exception 'Current replacement report is not the only visible report';
  end if;

  if exists (
    select 1
    from public.ai_analysis_reports
    where initial_image_path = 'owner/target/initial.jpg'
  ) then
    raise exception 'The historical report became visible through another comparison';
  end if;

  if has_table_privilege('authenticated', 'public.ai_analysis_reports', 'INSERT')
    or has_table_privilege('authenticated', 'public.ai_analysis_reports', 'UPDATE')
    or has_table_privilege('authenticated', 'public.ai_analysis_reports', 'DELETE') then
    raise exception 'Authenticated received write privileges on reports';
  end if;

  begin
    insert into public.ai_analysis_reports (
      comparison_id, user_id, model, contract_version, result,
      initial_image_path, final_image_path
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'forged', '1.0', '{"contractVersion":"1.0"}'::jsonb,
      'forged/initial.jpg', 'forged/final.jpg'
    );
    raise exception 'Authenticated inserted a forged report';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

do $$
declare
  policy_count integer;
  active_index_predicate text;
begin
  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'ai_analysis_attempts';

  if policy_count <> 0
    or not (select relrowsecurity from pg_class where oid = 'public.ai_analysis_attempts'::regclass) then
    raise exception 'Attempt-table RLS changed';
  end if;

  select pg_get_expr(i.indpred, i.indrelid)
  into active_index_predicate
  from pg_index i
  join pg_class c on c.oid = i.indexrelid
  where c.relname = 'ai_analysis_attempts_one_active_version_idx';

  if active_index_predicate is null
    or active_index_predicate not like '%status%reserved%' then
    raise exception 'Active-attempt uniqueness changed';
  end if;

  if (select status from public.ai_analysis_attempts limit 1) <> 'succeeded' then
    raise exception 'Usage completion RPC did not preserve its behavior';
  end if;
end;
$$;

rollback;

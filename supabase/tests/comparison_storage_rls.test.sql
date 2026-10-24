begin;

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'comparison-images'
      and public = false
      and file_size_limit = 10485760
      and allowed_mime_types = array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif'
      ]::text[]
  ) then
    raise exception 'Comparison image bucket configuration is invalid';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'comparison_images_%_own'
  ) <> 4 then
    raise exception 'Comparison image policies are incomplete';
  end if;
end;
$$;

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'storage-owner@visualtrace.test'),
  ('22222222-2222-4222-8222-222222222222', 'storage-other@visualtrace.test');

insert into public.comparisons (id, user_id, name) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Owner comparison'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Other comparison'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

insert into storage.objects (bucket_id, name, owner_id) values
  (
    'comparison-images',
    '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/initial.jpg',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'comparison-images',
    '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/final-version-2.png',
    '11111111-1111-4111-8111-111111111111'
  );

do $$
declare
  affected_rows integer;
  invalid_path text;
begin
  if (
    select count(*)
    from storage.objects
    where bucket_id = 'comparison-images'
  ) <> 2 then
    raise exception 'Owner cannot read comparison images';
  end if;

  update storage.objects
  set user_metadata = '{"validated":true}'::jsonb
  where name =
    '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/initial.jpg';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'Owner cannot update a comparison image';
  end if;

  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects
  where name =
    '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/final-version-2.png';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'Owner cannot delete a comparison image';
  end if;

  foreach invalid_path in array array[
    '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/archive/initial.jpg',
    '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/../initial.jpg',
    '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/initial.gif',
    '11111111-1111-4111-8111-111111111111/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/final.jpg'
  ] loop
    begin
      insert into storage.objects (bucket_id, name, owner_id)
      values (
        'comparison-images',
        invalid_path,
        '11111111-1111-4111-8111-111111111111'
      );
      raise exception 'Invalid path was accepted: %', invalid_path;
    exception when insufficient_privilege then
      null;
    end;
  end loop;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);

do $$
declare
  affected_rows integer;
begin
  if exists (
    select 1
    from storage.objects
    where bucket_id = 'comparison-images'
  ) then
    raise exception 'Another user can read or authorize signed access to owner images';
  end if;

  update storage.objects
  set user_metadata = '{"forged":true}'::jsonb
  where bucket_id = 'comparison-images';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'Another user updated an owner image';
  end if;

  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects
  where bucket_id = 'comparison-images';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'Another user deleted an owner image';
  end if;

  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'comparison-images',
      '22222222-2222-4222-8222-222222222222/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/final.jpg',
      '22222222-2222-4222-8222-222222222222'
    );
    raise exception 'Another user uploaded into the owner comparison';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
rollback;

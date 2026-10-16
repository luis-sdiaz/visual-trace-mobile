insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'comparison-images',
  'comparison-images',
  false,
  6291456,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view own comparison images" on storage.objects;
drop policy if exists "Users can upload own comparison images" on storage.objects;
drop policy if exists "Users can update own comparison images" on storage.objects;
drop policy if exists "Users can delete own comparison images" on storage.objects;

drop policy if exists "VT local read own images" on storage.objects;
drop policy if exists "VT local upload own images" on storage.objects;
drop policy if exists "VT local update own images" on storage.objects;
drop policy if exists "VT local delete own images" on storage.objects;

create policy "comparison_images_select_own"
on storage.objects
for select
to authenticated
using (
  storage.objects.bucket_id = 'comparison-images'
  and cardinality(storage.foldername(storage.objects.name)) = 2
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and storage.filename(storage.objects.name) ~
    '^(initial|final)(-[a-z0-9]+(-[a-z0-9]+)*)?\.(jpg|jpeg|png|webp|heic|heif)$'
  and exists (
    select 1
    from public.comparisons as comparison
    where comparison.id::text = (storage.foldername(storage.objects.name))[2]
      and comparison.user_id = auth.uid()
  )
);

create policy "comparison_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  storage.objects.bucket_id = 'comparison-images'
  and cardinality(storage.foldername(storage.objects.name)) = 2
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and storage.filename(storage.objects.name) ~
    '^(initial|final)(-[a-z0-9]+(-[a-z0-9]+)*)?\.(jpg|jpeg|png|webp|heic|heif)$'
  and exists (
    select 1
    from public.comparisons as comparison
    where comparison.id::text = (storage.foldername(storage.objects.name))[2]
      and comparison.user_id = auth.uid()
  )
);

create policy "comparison_images_update_own"
on storage.objects
for update
to authenticated
using (
  storage.objects.bucket_id = 'comparison-images'
  and cardinality(storage.foldername(storage.objects.name)) = 2
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and storage.filename(storage.objects.name) ~
    '^(initial|final)(-[a-z0-9]+(-[a-z0-9]+)*)?\.(jpg|jpeg|png|webp|heic|heif)$'
  and exists (
    select 1
    from public.comparisons as comparison
    where comparison.id::text = (storage.foldername(storage.objects.name))[2]
      and comparison.user_id = auth.uid()
  )
)
with check (
  storage.objects.bucket_id = 'comparison-images'
  and cardinality(storage.foldername(storage.objects.name)) = 2
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and storage.filename(storage.objects.name) ~
    '^(initial|final)(-[a-z0-9]+(-[a-z0-9]+)*)?\.(jpg|jpeg|png|webp|heic|heif)$'
  and exists (
    select 1
    from public.comparisons as comparison
    where comparison.id::text = (storage.foldername(storage.objects.name))[2]
      and comparison.user_id = auth.uid()
  )
);

create policy "comparison_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  storage.objects.bucket_id = 'comparison-images'
  and cardinality(storage.foldername(storage.objects.name)) = 2
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and storage.filename(storage.objects.name) ~
    '^(initial|final)(-[a-z0-9]+(-[a-z0-9]+)*)?\.(jpg|jpeg|png|webp|heic|heif)$'
  and exists (
    select 1
    from public.comparisons as comparison
    where comparison.id::text = (storage.foldername(storage.objects.name))[2]
      and comparison.user_id = auth.uid()
  )
);

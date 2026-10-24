INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('comparison-images', 'comparison-images', false, 10485760) ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

drop policy if exists "Users can view own comparison images" on storage.objects;
drop policy if exists "Users can upload own comparison images" on storage.objects;
drop policy if exists "Users can update own comparison images" on storage.objects;
drop policy if exists "Users can delete own comparison images" on storage.objects;

drop policy if exists "VT local read own images" on storage.objects;
drop policy if exists "VT local upload own images" on storage.objects;
drop policy if exists "VT local update own images" on storage.objects;
drop policy if exists "VT local delete own images" on storage.objects;

do $$
begin
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
exception
  when duplicate_object then null;
end $$;

do $$
begin
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
exception
  when duplicate_object then null;
end $$;

do $$
begin
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
exception
  when duplicate_object then null;
end $$;

do $$
begin
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
exception
  when duplicate_object then null;
end $$;

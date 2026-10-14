create table public.ai_analysis_reports (
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

create policy "Users can read current reports for their comparisons"
on public.ai_analysis_reports
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.comparisons c
    where c.id = comparison_id
      and c.user_id = auth.uid()
      and c.initial_image_path = initial_image_path
      and c.final_image_path = final_image_path
  )
);

revoke insert, update, delete on public.ai_analysis_reports from anon, authenticated;
grant select on public.ai_analysis_reports to authenticated;

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

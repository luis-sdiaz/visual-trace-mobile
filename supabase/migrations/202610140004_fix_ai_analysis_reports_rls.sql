begin;

drop policy "Users can read current reports for their comparisons"
on public.ai_analysis_reports;

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

commit;

-- Only safety representatives may create halted_work records; others keep deviation/ROS/etc.

drop policy if exists hse_insert_own on public.hse_records;

create policy hse_insert_own on public.hse_records
  for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
    and (
      record_type <> 'halted_work'
      or exists (
        select 1 from public.organization_members om
        join public.roles r on r.id = om.role_id
        where om.organization_id = hse_records.organization_id
          and om.user_id = (select auth.uid())
          and r.code = 'safety_rep'
      )
    )
  );

-- Allow deviation status used after AMU escalation
alter table public.hse_records drop constraint if exists hse_records_status_check;
alter table public.hse_records
  add constraint hse_records_status_check check (
    status in ('open', 'in_progress', 'closed', 'escalated_to_amu')
  );

-- Allow safety representatives (VO) to run inspections and record responses.

drop policy if exists hi_write on public.hse_inspections;
create policy hi_write on public.hse_inspections
  for all to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'hse.write')
      or public.has_capability(organization_id, 'org.admin')
      or exists (
        select 1 from public.organization_members om
        join public.roles r on r.id = om.role_id
        where om.organization_id = hse_inspections.organization_id
          and om.user_id = (select auth.uid())
          and r.code = 'safety_rep'
      )
    )
  )
  with check (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'hse.write')
      or public.has_capability(organization_id, 'org.admin')
      or exists (
        select 1 from public.organization_members om
        join public.roles r on r.id = om.role_id
        where om.organization_id = hse_inspections.organization_id
          and om.user_id = (select auth.uid())
          and r.code = 'safety_rep'
      )
    )
  );

drop policy if exists hir_write on public.hse_inspection_responses;
create policy hir_write on public.hse_inspection_responses
  for all to authenticated
  using (
    exists (
      select 1 from public.hse_inspections i
      where i.id = inspection_id
        and public.is_org_member(i.organization_id)
        and (
          public.has_capability(i.organization_id, 'hse.write')
          or public.has_capability(i.organization_id, 'org.admin')
          or exists (
            select 1 from public.organization_members om
            join public.roles r on r.id = om.role_id
            where om.organization_id = i.organization_id
              and om.user_id = (select auth.uid())
              and r.code = 'safety_rep'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.hse_inspections i
      where i.id = inspection_id
        and public.is_org_member(i.organization_id)
        and (
          public.has_capability(i.organization_id, 'hse.write')
          or public.has_capability(i.organization_id, 'org.admin')
          or exists (
            select 1 from public.organization_members om
            join public.roles r on r.id = om.role_id
            where om.organization_id = i.organization_id
              and om.user_id = (select auth.uid())
              and r.code = 'safety_rep'
          )
        )
    )
  );

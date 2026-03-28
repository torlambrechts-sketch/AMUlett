-- HSE: allow hse.write / org.admin to update records (triage, closure).

drop policy if exists hse_update_hse_write on public.hse_records;
create policy hse_update_hse_write on public.hse_records
  for update to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'hse.write')
      or public.has_capability(organization_id, 'org.admin')
    )
  )
  with check (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'hse.write')
      or public.has_capability(organization_id, 'org.admin')
    )
  );

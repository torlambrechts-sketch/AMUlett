-- Allow safety representatives (VO) to upload and delete HSE attachments in their org.

drop policy if exists hse_files_insert on storage.objects;
create policy hse_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'hse-attachments'
    and exists (
      select 1 from public.organization_members m
      join public.roles r on r.id = m.role_id
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'hse.write')
          or public.has_capability(m.organization_id, 'org.admin')
          or r.code = 'safety_rep'
        )
    )
  );

drop policy if exists hse_files_delete on storage.objects;
create policy hse_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'hse-attachments'
    and exists (
      select 1 from public.organization_members m
      join public.roles r on r.id = m.role_id
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'hse.write')
          or public.has_capability(m.organization_id, 'org.admin')
          or r.code = 'safety_rep'
        )
    )
  );

-- HSE: tighten task visibility for HSE-linked rows and allow VO/hse.write to update linked tasks and checklists.

-- ---------------------------------------------------------------------------
-- Tasks SELECT: org members see general tasks; HSE-linked tasks only when user may see parent HSE row
-- ---------------------------------------------------------------------------
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      source_hse_record_id is null
      or exists (
        select 1 from public.hse_records h
        where h.id = tasks.source_hse_record_id
          and h.organization_id = tasks.organization_id
          and (
            public.has_capability(h.organization_id, 'hse.write')
            or public.has_capability(h.organization_id, 'org.admin')
            or exists (
              select 1 from public.organization_members om
              join public.roles r on r.id = om.role_id
              where om.organization_id = h.organization_id
                and om.user_id = (select auth.uid())
                and r.code = 'safety_rep'
            )
            or h.created_by = (select auth.uid())
          )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Tasks UPDATE: keep tasks.write; add HSE-linked updates for VO / HSE writers
-- ---------------------------------------------------------------------------
drop policy if exists tasks_update_hse on public.tasks;
create policy tasks_update_hse on public.tasks
  for update to authenticated
  using (
    source_hse_record_id is not null
    and public.is_org_member(organization_id)
    and exists (
      select 1 from public.hse_records h
      where h.id = tasks.source_hse_record_id
        and h.organization_id = tasks.organization_id
        and (
          public.has_capability(h.organization_id, 'hse.write')
          or public.has_capability(h.organization_id, 'org.admin')
          or exists (
            select 1 from public.organization_members om
            join public.roles r on r.id = om.role_id
            where om.organization_id = h.organization_id
              and om.user_id = (select auth.uid())
              and r.code = 'safety_rep'
          )
        )
    )
  )
  with check (
    source_hse_record_id is not null
    and public.is_org_member(organization_id)
    and exists (
      select 1 from public.hse_records h
      where h.id = tasks.source_hse_record_id
        and h.organization_id = tasks.organization_id
        and (
          public.has_capability(h.organization_id, 'hse.write')
          or public.has_capability(h.organization_id, 'org.admin')
          or exists (
            select 1 from public.organization_members om
            join public.roles r on r.id = om.role_id
            where om.organization_id = h.organization_id
              and om.user_id = (select auth.uid())
              and r.code = 'safety_rep'
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Task checklist: allow VO / HSE writers when parent task is HSE-linked
-- ---------------------------------------------------------------------------
drop policy if exists task_checklist_write_hse on public.task_checklist_items;
create policy task_checklist_write_hse on public.task_checklist_items
  for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.source_hse_record_id is not null
        and public.is_org_member(t.organization_id)
        and (
          public.has_capability(t.organization_id, 'hse.write')
          or public.has_capability(t.organization_id, 'org.admin')
          or exists (
            select 1 from public.organization_members om
            join public.roles r on r.id = om.role_id
            where om.organization_id = t.organization_id
              and om.user_id = (select auth.uid())
              and r.code = 'safety_rep'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.source_hse_record_id is not null
        and public.is_org_member(t.organization_id)
        and (
          public.has_capability(t.organization_id, 'hse.write')
          or public.has_capability(t.organization_id, 'org.admin')
          or exists (
            select 1 from public.organization_members om
            join public.roles r on r.id = om.role_id
            where om.organization_id = t.organization_id
              and om.user_id = (select auth.uid())
              and r.code = 'safety_rep'
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- HSE: author may update own submitted records (follow-up text, attachments)
-- ---------------------------------------------------------------------------
drop policy if exists hse_update_author on public.hse_records;
create policy hse_update_author on public.hse_records
  for update to authenticated
  using (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
  )
  with check (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
  );

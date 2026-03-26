-- Row level security: organization isolation + capability checks.

alter table public.organizations enable row level security;
alter table public.roles enable row level security;
alter table public.capabilities enable row level security;
alter table public.role_capabilities enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.compliance_functions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.tasks enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.work_council_meetings enable row level security;
alter table public.work_council_agenda_items enable row level security;
alter table public.work_council_participants enable row level security;
alter table public.work_council_audit_events enable row level security;
alter table public.work_council_ballots enable row level security;
alter table public.work_council_ballot_options enable row level security;
alter table public.work_council_votes enable row level security;
alter table public.hse_records enable row level security;
alter table public.wiki_spaces enable row level security;
alter table public.wiki_pages enable row level security;
alter table public.wiki_page_revisions enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_responses enable row level security;
alter table public.whistleblower_reports enable row level security;
alter table public.learning_courses enable row level security;
alter table public.learning_modules enable row level security;
alter table public.learning_enrollments enable row level security;
alter table public.learning_quiz_attempts enable row level security;

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_capability(p_org uuid, p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.role_capabilities rc on rc.role_id = m.role_id
    join public.capabilities c on c.id = rc.capability_id
    where m.organization_id = p_org
      and m.user_id = (select auth.uid())
      and c.code = p_code
  );
$$;

grant usage on schema public to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_capability(uuid, text) to authenticated;

-- Global read catalogues
create policy roles_read on public.roles
  for select to authenticated using (true);

create policy capabilities_read on public.capabilities
  for select to authenticated using (true);

create policy role_capabilities_read on public.role_capabilities
  for select to authenticated using (true);

create policy compliance_functions_read on public.compliance_functions
  for select to authenticated using (true);

-- Organizations
create policy organizations_select on public.organizations
  for select to authenticated using (public.is_org_member(id));

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.has_capability(id, 'org.admin'))
  with check (public.has_capability(id, 'org.admin'));

-- Members: everyone in the org can see membership; only org admins mutate.
create policy organization_members_select on public.organization_members
  for select to authenticated using (public.is_org_member(organization_id));

create policy organization_members_insert on public.organization_members
  for insert to authenticated
  with check (public.has_capability(organization_id, 'org.admin'));

create policy organization_members_update on public.organization_members
  for update to authenticated
  using (public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'org.admin'));

create policy organization_members_delete on public.organization_members
  for delete to authenticated
  using (public.has_capability(organization_id, 'org.admin'));

-- Invitations
create policy organization_invitations_select on public.organization_invitations
  for select to authenticated using (public.has_capability(organization_id, 'org.admin'));

create policy organization_invitations_write on public.organization_invitations
  for insert to authenticated
  with check (public.has_capability(organization_id, 'org.admin'));

create policy organization_invitations_update on public.organization_invitations
  for update to authenticated
  using (public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'org.admin'));

-- Settings
create policy organization_settings_select on public.organization_settings
  for select to authenticated using (public.is_org_member(organization_id));

create policy organization_settings_write on public.organization_settings
  for all to authenticated
  using (public.has_capability(organization_id, 'org.admin'))
  with check (public.has_capability(organization_id, 'org.admin'));

-- User preferences
create policy user_preferences_own on public.user_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Tasks
create policy tasks_select on public.tasks
  for select to authenticated using (public.is_org_member(organization_id));

create policy tasks_write on public.tasks
  for insert to authenticated
  with check (
    public.has_capability(organization_id, 'tasks.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (
    public.has_capability(organization_id, 'tasks.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'tasks.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (
    public.has_capability(organization_id, 'tasks.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy task_checklist_select on public.task_checklist_items
  for select to authenticated using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_org_member(t.organization_id)
    )
  );

create policy task_checklist_write on public.task_checklist_items
  for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          public.has_capability(t.organization_id, 'tasks.write')
          or public.has_capability(t.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          public.has_capability(t.organization_id, 'tasks.write')
          or public.has_capability(t.organization_id, 'org.admin')
        )
    )
  );

-- Work council
create policy wc_meetings_select on public.work_council_meetings
  for select to authenticated using (public.is_org_member(organization_id));

create policy wc_meetings_write on public.work_council_meetings
  for all to authenticated
  using (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy wc_agenda_select on public.work_council_agenda_items
  for select to authenticated using (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id and public.is_org_member(m.organization_id)
    )
  );

create policy wc_agenda_write on public.work_council_agenda_items
  for all to authenticated
  using (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id
        and (
          public.has_capability(m.organization_id, 'work_council.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id
        and (
          public.has_capability(m.organization_id, 'work_council.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

create policy wc_participants_select on public.work_council_participants
  for select to authenticated using (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id and public.is_org_member(m.organization_id)
    )
  );

create policy wc_participants_write on public.work_council_participants
  for all to authenticated
  using (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id
        and (
          public.has_capability(m.organization_id, 'work_council.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.work_council_meetings m
      where m.id = meeting_id
        and (
          public.has_capability(m.organization_id, 'work_council.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

create policy wc_audit_select on public.work_council_audit_events
  for select to authenticated using (public.is_org_member(organization_id));

create policy wc_audit_insert on public.work_council_audit_events
  for insert to authenticated
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy wc_ballots_select on public.work_council_ballots
  for select to authenticated using (public.is_org_member(organization_id));

create policy wc_ballots_write on public.work_council_ballots
  for all to authenticated
  using (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'work_council.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy wc_ballot_options_select on public.work_council_ballot_options
  for select to authenticated using (
    exists (
      select 1 from public.work_council_ballots b
      where b.id = ballot_id and public.is_org_member(b.organization_id)
    )
  );

create policy wc_ballot_options_write on public.work_council_ballot_options
  for all to authenticated
  using (
    exists (
      select 1 from public.work_council_ballots b
      where b.id = ballot_id
        and (
          public.has_capability(b.organization_id, 'work_council.write')
          or public.has_capability(b.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.work_council_ballots b
      where b.id = ballot_id
        and (
          public.has_capability(b.organization_id, 'work_council.write')
          or public.has_capability(b.organization_id, 'org.admin')
        )
    )
  );

create policy wc_votes_select on public.work_council_votes
  for select to authenticated using (
    exists (
      select 1 from public.work_council_ballots b
      where b.id = ballot_id and public.is_org_member(b.organization_id)
    )
  );

create policy wc_votes_insert on public.work_council_votes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.work_council_ballots b
      where b.id = ballot_id
        and b.status = 'open'
        and (
          public.has_capability(b.organization_id, 'work_council.vote')
          or public.has_capability(b.organization_id, 'org.admin')
        )
    )
  );

-- HSE
create policy hse_select on public.hse_records
  for select to authenticated using (public.is_org_member(organization_id));

create policy hse_write on public.hse_records
  for all to authenticated
  using (
    public.has_capability(organization_id, 'hse.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'hse.write')
    or public.has_capability(organization_id, 'org.admin')
  );

-- Wiki
create policy wiki_spaces_select on public.wiki_spaces
  for select to authenticated using (public.is_org_member(organization_id));

create policy wiki_spaces_write on public.wiki_spaces
  for all to authenticated
  using (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy wiki_pages_select on public.wiki_pages
  for select to authenticated using (
    exists (
      select 1 from public.wiki_spaces s
      where s.id = space_id and public.is_org_member(s.organization_id)
    )
  );

create policy wiki_pages_write on public.wiki_pages
  for all to authenticated
  using (
    exists (
      select 1 from public.wiki_spaces s
      where s.id = space_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.wiki_spaces s
      where s.id = space_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

create policy wiki_revisions_select on public.wiki_page_revisions
  for select to authenticated using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id and public.is_org_member(s.organization_id)
    )
  );

create policy wiki_revisions_write on public.wiki_page_revisions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

-- Surveys
create policy surveys_select on public.surveys
  for select to authenticated using (
    public.is_org_member(organization_id)
    and (
      status = 'published'
      or public.has_capability(organization_id, 'surveys.admin')
      or public.has_capability(organization_id, 'org.admin')
    )
  );

create policy surveys_admin on public.surveys
  for all to authenticated
  using (
    public.has_capability(organization_id, 'surveys.admin')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'surveys.admin')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy survey_questions_select on public.survey_questions
  for select to authenticated using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and public.is_org_member(s.organization_id)
        and (
          s.status = 'published'
          or public.has_capability(s.organization_id, 'surveys.admin')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

create policy survey_questions_write on public.survey_questions
  for all to authenticated
  using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and (
          public.has_capability(s.organization_id, 'surveys.admin')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and (
          public.has_capability(s.organization_id, 'surveys.admin')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

create policy survey_responses_insert on public.survey_responses
  for insert to authenticated
  with check (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and s.status = 'published'
        and public.is_org_member(s.organization_id)
        and (
          public.has_capability(s.organization_id, 'surveys.respond')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

create policy survey_responses_select on public.survey_responses
  for select to authenticated using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and public.is_org_member(s.organization_id)
        and (
          public.has_capability(s.organization_id, 'surveys.admin')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  );

-- Whistleblowing
create policy wb_insert on public.whistleblower_reports
  for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and (
      public.has_capability(organization_id, 'whistleblower.submit')
      or public.has_capability(organization_id, 'org.admin')
    )
  );

create policy wb_select on public.whistleblower_reports
  for select to authenticated using (
    public.is_org_member(organization_id)
    and (
      reporter_user_id = (select auth.uid())
      or public.has_capability(organization_id, 'whistleblower.review')
      or public.has_capability(organization_id, 'org.admin')
    )
  );

create policy wb_update on public.whistleblower_reports
  for update to authenticated
  using (
    public.has_capability(organization_id, 'whistleblower.review')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'whistleblower.review')
    or public.has_capability(organization_id, 'org.admin')
  );

-- Learning
create policy learning_courses_select on public.learning_courses
  for select to authenticated using (
    public.is_org_member(organization_id)
    and (
      published = true
      or public.has_capability(organization_id, 'learning.author')
      or public.has_capability(organization_id, 'org.admin')
    )
  );

create policy learning_courses_write on public.learning_courses
  for all to authenticated
  using (
    public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'learning.author')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy learning_modules_select on public.learning_modules
  for select to authenticated using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and public.is_org_member(c.organization_id)
        and (
          c.published = true
          or public.has_capability(c.organization_id, 'learning.author')
          or public.has_capability(c.organization_id, 'org.admin')
        )
    )
  );

create policy learning_modules_write on public.learning_modules
  for all to authenticated
  using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          public.has_capability(c.organization_id, 'learning.author')
          or public.has_capability(c.organization_id, 'org.admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          public.has_capability(c.organization_id, 'learning.author')
          or public.has_capability(c.organization_id, 'org.admin')
        )
    )
  );

create policy learning_enrollments_select on public.learning_enrollments
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and public.is_org_member(c.organization_id)
    )
  );

create policy learning_enrollments_insert on public.learning_enrollments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and public.is_org_member(c.organization_id)
        and (
          public.has_capability(c.organization_id, 'learning.enroll')
          or public.has_capability(c.organization_id, 'org.admin')
        )
    )
  );

create policy learning_enrollments_update on public.learning_enrollments
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and public.is_org_member(c.organization_id)
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and public.is_org_member(c.organization_id)
    )
  );

create policy learning_quiz_attempts_own on public.learning_quiz_attempts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

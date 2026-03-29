-- LMS: system-default catalog (all orgs) vs organization courses, platform admins, progress, expanded block types.

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- No direct reads for clients; access via has_platform_admin() only.
revoke all on public.platform_admins from authenticated;
revoke all on public.platform_admins from anon;

create or replace function public.has_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins p
    where p.user_id = (select auth.uid())
  );
$$;

grant execute on function public.has_platform_admin() to authenticated;

-- Courses: scope system_default (organization_id null) or organization (organization_id set)
alter table public.learning_courses
  add column if not exists scope text not null default 'organization';

alter table public.learning_courses
  alter column organization_id drop not null;

alter table public.learning_courses
  drop constraint if exists learning_courses_organization_id_slug_key;

create unique index if not exists learning_courses_org_slug_idx
  on public.learning_courses (organization_id, slug)
  where organization_id is not null;

create unique index if not exists learning_courses_system_slug_idx
  on public.learning_courses (slug)
  where scope = 'system_default';

alter table public.learning_courses
  add constraint learning_courses_scope_org_check check (
    (scope = 'organization' and organization_id is not null)
    or (scope = 'system_default' and organization_id is null)
  );

update public.learning_courses set scope = 'organization' where organization_id is not null;

-- Widen block types for modular LMS content
alter table public.learning_modules drop constraint if exists learning_modules_module_type_check;

alter table public.learning_modules add constraint learning_modules_module_type_check check (
  module_type in (
    'rich_text',
    'flash_cards',
    'short_message',
    'quiz',
    'video',
    'image_gallery',
    'micro_lesson',
    'executive_summary',
    'on_the_job',
    'reflection',
    'checklist'
  )
);

create table public.learning_module_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  module_id uuid not null references public.learning_modules (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id, organization_id)
);

create index learning_module_progress_user_org_idx on public.learning_module_progress (user_id, organization_id);

alter table public.learning_module_progress enable row level security;

-- Replace learning RLS policies
drop policy if exists learning_courses_select on public.learning_courses;
drop policy if exists learning_courses_write on public.learning_courses;
drop policy if exists learning_modules_select on public.learning_modules;
drop policy if exists learning_modules_write on public.learning_modules;
drop policy if exists learning_enrollments_select on public.learning_enrollments;
drop policy if exists learning_enrollments_insert on public.learning_enrollments;
drop policy if exists learning_enrollments_update on public.learning_enrollments;
drop policy if exists learning_quiz_attempts_own on public.learning_quiz_attempts;

create policy learning_courses_select on public.learning_courses
  for select to authenticated using (
    (
      scope = 'organization'
      and organization_id is not null
      and public.is_org_member(organization_id)
      and (
        published = true
        or public.has_capability(organization_id, 'learning.author')
        or public.has_capability(organization_id, 'org.admin')
      )
    )
    or (
      scope = 'system_default'
      and published = true
      and exists (select 1 from public.organization_members m where m.user_id = (select auth.uid()))
    )
    or (
      scope = 'system_default'
      and published = false
      and public.has_platform_admin()
    )
  );

create policy learning_courses_insert on public.learning_courses
  for insert to authenticated
  with check (
    (
      scope = 'organization'
      and organization_id is not null
      and public.is_org_member(organization_id)
      and (
        public.has_capability(organization_id, 'learning.author')
        or public.has_capability(organization_id, 'org.admin')
      )
    )
    or (
      scope = 'system_default'
      and organization_id is null
      and public.has_platform_admin()
    )
  );

create policy learning_courses_update on public.learning_courses
  for update to authenticated
  using (
    (
      scope = 'organization'
      and organization_id is not null
      and (
        public.has_capability(organization_id, 'learning.author')
        or public.has_capability(organization_id, 'org.admin')
      )
    )
    or (
      scope = 'system_default'
      and public.has_platform_admin()
    )
  )
  with check (
    (
      scope = 'organization'
      and organization_id is not null
      and (
        public.has_capability(organization_id, 'learning.author')
        or public.has_capability(organization_id, 'org.admin')
      )
    )
    or (
      scope = 'system_default'
      and organization_id is null
      and public.has_platform_admin()
    )
  );

create policy learning_courses_delete on public.learning_courses
  for delete to authenticated
  using (
    (
      scope = 'organization'
      and organization_id is not null
      and (
        public.has_capability(organization_id, 'learning.author')
        or public.has_capability(organization_id, 'org.admin')
      )
    )
    or (
      scope = 'system_default'
      and public.has_platform_admin()
    )
  );

create policy learning_modules_select on public.learning_modules
  for select to authenticated
  using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and public.is_org_member(c.organization_id)
            and (
              c.published = true
              or public.has_capability(c.organization_id, 'learning.author')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (
            c.scope = 'system_default'
            and c.published = true
            and exists (select 1 from public.organization_members m where m.user_id = (select auth.uid()))
          )
          or (
            c.scope = 'system_default'
            and c.published = false
            and public.has_platform_admin()
          )
        )
    )
  );

create policy learning_modules_insert on public.learning_modules
  for insert to authenticated
  with check (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and (
              public.has_capability(c.organization_id, 'learning.author')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (c.scope = 'system_default' and public.has_platform_admin())
        )
    )
  );

create policy learning_modules_update on public.learning_modules
  for update to authenticated
  using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and (
              public.has_capability(c.organization_id, 'learning.author')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (c.scope = 'system_default' and public.has_platform_admin())
        )
    )
  )
  with check (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and (
              public.has_capability(c.organization_id, 'learning.author')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (c.scope = 'system_default' and public.has_platform_admin())
        )
    )
  );

create policy learning_modules_delete on public.learning_modules
  for delete to authenticated
  using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and (
              public.has_capability(c.organization_id, 'learning.author')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (c.scope = 'system_default' and public.has_platform_admin())
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
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and public.is_org_member(c.organization_id)
          )
          or (
            c.scope = 'system_default'
            and exists (select 1 from public.organization_members m where m.user_id = (select auth.uid()))
          )
        )
    )
  );

create policy learning_enrollments_insert on public.learning_enrollments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_courses c
      where c.id = course_id
        and c.published = true
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and public.is_org_member(c.organization_id)
            and (
              public.has_capability(c.organization_id, 'learning.enroll')
              or public.has_capability(c.organization_id, 'org.admin')
            )
          )
          or (
            c.scope = 'system_default'
            and exists (select 1 from public.organization_members m where m.user_id = (select auth.uid()))
          )
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
        and (
          (
            c.scope = 'organization'
            and c.organization_id is not null
            and public.is_org_member(c.organization_id)
          )
          or (c.scope = 'system_default')
        )
    )
  )
  with check (user_id = (select auth.uid()));

create policy learning_quiz_attempts_own on public.learning_quiz_attempts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.learning_module_progress to authenticated;

create policy learning_module_progress_select on public.learning_module_progress
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

create policy learning_module_progress_write on public.learning_module_progress
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

create policy learning_module_progress_update on public.learning_module_progress
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  )
  with check (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

create policy learning_module_progress_delete on public.learning_module_progress
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

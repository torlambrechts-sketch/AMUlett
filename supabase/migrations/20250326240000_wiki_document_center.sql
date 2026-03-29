-- Document center / wiki: publishing, approval, tags, favorites, search, presence, review reminders.

-- Page lifecycle and metadata
alter table public.wiki_pages
  add column if not exists publish_status text not null default 'published'
    check (publish_status in ('draft', 'pending_approval', 'published'));

alter table public.wiki_pages
  add column if not exists requires_approval boolean not null default false;

alter table public.wiki_pages
  add column if not exists review_reminder_months int check (review_reminder_months is null or review_reminder_months >= 1);

alter table public.wiki_pages
  add column if not exists next_review_at timestamptz;

alter table public.wiki_pages
  add column if not exists owner_user_id uuid references auth.users (id) on delete set null;

alter table public.wiki_pages
  add column if not exists template_key text;

alter table public.wiki_pages
  add column if not exists search_vector tsvector;

create index if not exists wiki_pages_search_idx on public.wiki_pages using gin (search_vector);

-- Plain text for full-text search (filled by app from blocks / markdown)
alter table public.wiki_page_revisions
  add column if not exists body_plain text not null default '';

alter table public.wiki_page_revisions
  add column if not exists revision_summary text;

-- Tags (org-scoped)
create table if not exists public.wiki_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  label jsonb not null default '{}'::jsonb,
  unique (organization_id, slug)
);

create index if not exists wiki_tags_org_idx on public.wiki_tags (organization_id);

create table if not exists public.wiki_page_tags (
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  tag_id uuid not null references public.wiki_tags (id) on delete cascade,
  primary key (page_id, tag_id)
);

-- Favorites / pins
create table if not exists public.wiki_page_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, page_id)
);

create index if not exists wiki_page_favorites_org_idx on public.wiki_page_favorites (organization_id);

-- Presence / collaboration (Realtime-friendly)
create table if not exists public.wiki_page_presence (
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  is_typing boolean not null default false,
  primary key (page_id, user_id)
);

create index if not exists wiki_page_presence_page_idx on public.wiki_page_presence (page_id, last_seen_at desc);

-- Replace wiki page SELECT: drafts visible to owner, wiki writers, and org admins only
drop policy if exists wiki_pages_select on public.wiki_pages;

create policy wiki_pages_select on public.wiki_pages
  for select to authenticated using (
    exists (
      select 1 from public.wiki_spaces s
      where s.id = wiki_pages.space_id
        and public.is_org_member(s.organization_id)
    )
    and (
      wiki_pages.publish_status = 'published'
      or wiki_pages.owner_user_id = (select auth.uid())
      or exists (
        select 1 from public.wiki_spaces s2
        where s2.id = wiki_pages.space_id
          and (
            public.has_capability(s2.organization_id, 'wiki.write')
            or public.has_capability(s2.organization_id, 'org.admin')
          )
      )
    )
  );

-- Tags RLS
alter table public.wiki_tags enable row level security;

create policy wiki_tags_select on public.wiki_tags
  for select to authenticated using (public.is_org_member(organization_id));

create policy wiki_tags_write on public.wiki_tags
  for all to authenticated
  using (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  );

alter table public.wiki_page_tags enable row level security;

create policy wiki_page_tags_select on public.wiki_page_tags
  for select to authenticated using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id and public.is_org_member(s.organization_id)
    )
  );

create policy wiki_page_tags_write on public.wiki_page_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  )
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

-- Favorites RLS
alter table public.wiki_page_favorites enable row level security;

create policy wiki_fav_select on public.wiki_page_favorites
  for select to authenticated using (
    user_id = (select auth.uid())
    or public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  );

create policy wiki_fav_own on public.wiki_page_favorites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

create policy wiki_fav_own_update on public.wiki_page_favorites
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy wiki_fav_own_delete on public.wiki_page_favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Presence RLS
alter table public.wiki_page_presence enable row level security;

create policy wiki_presence_select on public.wiki_page_presence
  for select to authenticated using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id and public.is_org_member(s.organization_id)
    )
  );

create policy wiki_presence_upsert on public.wiki_page_presence
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
    and exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id and s.organization_id = wiki_page_presence.organization_id
    )
  );

create policy wiki_presence_update_own on public.wiki_page_presence
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy wiki_presence_delete_own on public.wiki_page_presence
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.wiki_tags to authenticated;
grant select, insert, update, delete on public.wiki_page_tags to authenticated;
grant select, insert, update, delete on public.wiki_page_favorites to authenticated;
grant select, insert, update, delete on public.wiki_page_presence to authenticated;

-- Revisions: same visibility as parent page (avoid leaking draft bodies via revision id)
drop policy if exists wiki_revisions_select on public.wiki_page_revisions;

create policy wiki_revisions_select on public.wiki_page_revisions
  for select to authenticated using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id
        and public.is_org_member(s.organization_id)
        and (
          p.publish_status = 'published'
          or p.owner_user_id = (select auth.uid())
          or exists (
            select 1 from public.wiki_spaces s2
            where s2.id = p.space_id
              and (
                public.has_capability(s2.organization_id, 'wiki.write')
                or public.has_capability(s2.organization_id, 'org.admin')
              )
          )
        )
    )
  );

-- Refresh search_vector from title jsonb + current revision body_plain
create or replace function public.wiki_recompute_search_vector(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t jsonb;
  bp text;
  cur_rev uuid;
begin
  select title, current_revision_id into t, cur_rev from public.wiki_pages where id = p_page_id;
  if cur_rev is null then
    update public.wiki_pages set search_vector = null where id = p_page_id;
    return;
  end if;
  select body_plain into bp from public.wiki_page_revisions where id = cur_rev;
  update public.wiki_pages
  set search_vector =
    setweight(
      to_tsvector(
        'simple',
        coalesce(
          (select string_agg(value, ' ') from jsonb_each_text(coalesce(t, '{}'::jsonb))),
          ''
        )
      ),
      'A'
    )
    || setweight(to_tsvector('simple', coalesce(bp, '')), 'B')
  where id = p_page_id;
end;
$$;

grant execute on function public.wiki_recompute_search_vector(uuid) to authenticated;

-- Default space per org (callable after membership check)
create or replace function public.ensure_wiki_default_space(p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not an organization member';
  end if;
  select id into sid from public.wiki_spaces
  where organization_id = p_organization_id and slug = 'main'
  limit 1;
  if found then
    return sid;
  end if;
  if not (
    public.has_capability(p_organization_id, 'wiki.write')
    or public.has_capability(p_organization_id, 'org.admin')
  ) then
    raise exception 'wiki.write or org.admin required to create the default space';
  end if;
  insert into public.wiki_spaces (organization_id, slug, name)
  values (
    p_organization_id,
    'main',
    '{"en":"Document center","nb":"Dokumentsenter"}'::jsonb
  )
  returning id into sid;
  return sid;
end;
$$;

grant execute on function public.ensure_wiki_default_space(uuid) to authenticated;

create or replace function public.wiki_trg_page_search()
returns trigger
language plpgsql
as $$
begin
  perform public.wiki_recompute_search_vector(new.id);
  return new;
end;
$$;

drop trigger if exists wiki_pages_search_title_trg on public.wiki_pages;
create trigger wiki_pages_search_title_trg
  after insert or update of title, current_revision_id on public.wiki_pages
  for each row execute function public.wiki_trg_page_search();

create or replace function public.wiki_trg_revision_search()
returns trigger
language plpgsql
as $$
declare
  cur uuid;
begin
  select current_revision_id into cur from public.wiki_pages where id = new.page_id;
  if cur = new.id then
    perform public.wiki_recompute_search_vector(new.page_id);
  end if;
  return new;
end;
$$;

drop trigger if exists wiki_revisions_search_trg on public.wiki_page_revisions;
create trigger wiki_revisions_search_trg
  after insert or update of body_plain on public.wiki_page_revisions
  for each row execute function public.wiki_trg_revision_search();

-- Backfill search for existing pages
do $$
declare r record;
begin
  for r in select id from public.wiki_pages loop
    perform public.wiki_recompute_search_vector(r.id);
  end loop;
end $$;

-- Allow authors to fix body_plain / summary on revisions they can write
create policy wiki_revisions_update on public.wiki_page_revisions
  for update to authenticated
  using (
    exists (
      select 1 from public.wiki_pages p
      join public.wiki_spaces s on s.id = p.space_id
      where p.id = page_id
        and (
          public.has_capability(s.organization_id, 'wiki.write')
          or public.has_capability(s.organization_id, 'org.admin')
        )
    )
  )
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

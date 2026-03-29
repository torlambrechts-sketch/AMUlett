-- Document center: unified library files (Supabase Storage + metadata) with org RLS.
-- Wiki pages: optional category for library grouping (same enum as file items).

alter table public.wiki_pages
  add column if not exists library_category text not null default 'general'
  check (
    library_category in (
      'general',
      'policies',
      'procedures',
      'legal',
      'hse',
      'training',
      'contracts',
      'other'
    )
  );

alter table public.wiki_pages
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.wiki_pages_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wiki_pages_updated_at_trg on public.wiki_pages;
create trigger wiki_pages_updated_at_trg
  before update on public.wiki_pages
  for each row execute function public.wiki_pages_set_updated_at();

create table if not exists public.document_library_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  category text not null default 'general'
    check (category in ('general', 'policies', 'procedures', 'legal', 'hse', 'training', 'contracts', 'other')),
  mime_type text,
  file_ext text,
  file_size_bytes bigint,
  storage_path text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists document_library_items_org_idx on public.document_library_items (organization_id);
create index if not exists document_library_items_org_cat_idx on public.document_library_items (organization_id, category);
create index if not exists document_library_items_created_idx on public.document_library_items (organization_id, created_at desc);

alter table public.document_library_items enable row level security;

create policy document_library_select on public.document_library_items
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy document_library_write on public.document_library_items
  for all to authenticated
  using (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  )
  with check (
    public.has_capability(organization_id, 'wiki.write')
    or public.has_capability(organization_id, 'org.admin')
  );

grant select, insert, update, delete on public.document_library_items to authenticated;

-- Private bucket for org-scoped files (path: {organization_id}/{uuid}-{filename})
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'document-files',
  'document-files',
  false,
  52428800,
  null
)
on conflict (id) do nothing;

-- Storage RLS: path first segment = organization UUID
drop policy if exists document_files_select on storage.objects;
drop policy if exists document_files_insert on storage.objects;
drop policy if exists document_files_update on storage.objects;
drop policy if exists document_files_delete on storage.objects;

create policy document_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'document-files'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
    )
  );

create policy document_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'document-files'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'wiki.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

create policy document_files_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'document-files'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'wiki.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

create policy document_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'document-files'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid()
        and m.organization_id = (split_part(name, '/', 1))::uuid
        and (
          public.has_capability(m.organization_id, 'wiki.write')
          or public.has_capability(m.organization_id, 'org.admin')
        )
    )
  );

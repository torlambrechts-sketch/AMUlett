-- Invitation create/accept via security definer RPCs (plain token never stored).
-- Direct INSERT/UPDATE on organization_invitations removed for authenticated;
-- only definer functions mutate invites.

drop policy if exists organization_invitations_write on public.organization_invitations;
drop policy if exists organization_invitations_update on public.organization_invitations;

create unique index if not exists organization_invitations_pending_email_idx
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null;

-- Preview for invite landing page (anyone with the link).
create or replace function public.get_invitation_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_slug text;
  v_name jsonb;
  v_exp timestamptz;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return null;
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select o.slug, o.name, i.expires_at
  into v_slug, v_name, v_exp
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token_hash = v_hash
    and i.accepted_at is null
    and i.expires_at > now();

  if v_slug is null then
    return null;
  end if;

  return jsonb_build_object(
    'organization_slug', v_slug,
    'organization_name', coalesce(v_name, '{}'::jsonb),
    'expires_at', v_exp
  );
end;
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;

create or replace function public.create_organization_invitation(
  p_organization_id uuid,
  p_email text,
  p_role_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_hash text;
  v_invite_id uuid;
  v_norm text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_capability(p_organization_id, 'org.admin') then
    raise exception 'Forbidden';
  end if;

  v_norm := lower(trim(p_email));
  if v_norm !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email';
  end if;

  if not exists (
    select 1 from public.roles r where r.id = p_role_id
  ) then
    raise exception 'Invalid role';
  end if;

  if exists (
    select 1
    from public.organization_invitations i
    where i.organization_id = p_organization_id
      and lower(i.email) = v_norm
      and i.accepted_at is null
      and i.expires_at > now()
  ) then
    raise exception 'An active invitation already exists for this email';
  end if;

  if exists (
    select 1
    from auth.users u
    join public.organization_members m on m.user_id = u.id and m.organization_id = p_organization_id
    where lower(u.email) = v_norm
  ) then
    raise exception 'This user is already a member of the organization';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.organization_invitations (
    organization_id, email, role_id, invited_by, token_hash, expires_at
  )
  values (
    p_organization_id, v_norm, p_role_id, auth.uid(), v_hash, now() + interval '14 days'
  )
  returning id into v_invite_id;

  return jsonb_build_object('id', v_invite_id, 'token', v_token);
end;
$$;

grant execute on function public.create_organization_invitation(uuid, text, uuid) to authenticated;

create or replace function public.accept_organization_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_inv public.organization_invitations%rowtype;
  v_user_email text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select lower(trim(email)) into v_user_email from auth.users where id = v_uid;
  if v_user_email is null or v_user_email = '' then
    raise exception 'Your account has no email address';
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select * into v_inv
  from public.organization_invitations
  where token_hash = v_hash
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  if lower(trim(v_inv.email)) <> v_user_email then
    raise exception 'Sign in with the email address that received the invitation';
  end if;

  if exists (
    select 1 from public.organization_members where user_id = v_uid
  ) then
    if exists (
      select 1 from public.organization_members
      where user_id = v_uid and organization_id = v_inv.organization_id
    ) then
      update public.organization_invitations
      set accepted_at = coalesce(accepted_at, now())
      where id = v_inv.id;
      return v_inv.organization_id;
    end if;
    raise exception 'You already belong to another organization';
  end if;

  insert into public.organization_members (organization_id, user_id, role_id)
  values (v_inv.organization_id, v_uid, v_inv.role_id);

  update public.organization_invitations
  set accepted_at = now()
  where id = v_inv.id;

  insert into public.organization_settings (organization_id)
  values (v_inv.organization_id)
  on conflict (organization_id) do nothing;

  insert into public.user_preferences (user_id, active_organization_id)
  values (v_uid, v_inv.organization_id)
  on conflict (user_id) do update
  set active_organization_id = excluded.active_organization_id,
      updated_at = now();

  return v_inv.organization_id;
end;
$$;

grant execute on function public.accept_organization_invitation(text) to authenticated;

create or replace function public.revoke_organization_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select organization_id into v_org
  from public.organization_invitations
  where id = p_invitation_id
    and accepted_at is null;

  if v_org is null then
    raise exception 'Invitation not found or already used';
  end if;

  if not public.has_capability(v_org, 'org.admin') then
    raise exception 'Forbidden';
  end if;

  delete from public.organization_invitations where id = p_invitation_id;
end;
$$;

grant execute on function public.revoke_organization_invitation(uuid) to authenticated;

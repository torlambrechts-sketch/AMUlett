-- AMU enhancements: VO roster delete protection, election protocol term, auto-close past deadlines.

-- Prevent accidental deletion of the verneombud roster row
create or replace function public.amu_roster_block_vo_delete()
returns trigger
language plpgsql
as $$
begin
  if old.is_verneombud_slot = true then
    raise exception 'Cannot delete the verneombud (VO) roster row. Change the safety representative role or use roster sync.';
  end if;
  return old;
end;
$$;

drop trigger if exists amu_roster_block_vo_delete_trg on public.amu_roster;
create trigger amu_roster_block_vo_delete_trg
  before delete on public.amu_roster
  for each row execute function public.amu_roster_block_vo_delete();

-- Close election with full protocol (including term_label from election row)
create or replace function public.close_amu_election(p_election_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_term jsonb;
  v_winner uuid;
  v_nominees int;
  v_votes int;
  v_distinct int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select organization_id, term_label into v_org, v_term from public.amu_elections where id = p_election_id;
  if v_org is null then
    raise exception 'Election not found';
  end if;
  if not (
    public.has_capability(v_org, 'work_council.write') or public.has_capability(v_org, 'org.admin')
  ) then
    raise exception 'Not allowed';
  end if;
  select count(*) into v_nominees from public.amu_election_nominees where election_id = p_election_id and status <> 'withdrawn';
  select count(*) into v_votes from public.amu_election_votes where election_id = p_election_id;
  select count(distinct voter_user_id) into v_distinct from public.amu_election_votes where election_id = p_election_id;
  select n.nominee_id into v_winner
  from (
    select nominee_id, count(*) as c
    from public.amu_election_votes
    where election_id = p_election_id
    group by nominee_id
    order by c desc
    limit 1
  ) n;
  update public.amu_elections
  set phase = 'closed',
      protocol = jsonb_build_object(
        'generated_at', now(),
        'term', coalesce(v_term, '{}'::jsonb),
        'eligible_nominees', v_nominees,
        'votes_cast', v_votes,
        'unique_voters', v_distinct,
        'winner_nominee_id', v_winner
      )
  where id = p_election_id;
end;
$$;

-- Auto-close elections whose voting deadline has passed (call from app or pg_cron)
create or replace function public.auto_close_due_amu_elections(p_organization_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not (
    public.has_capability(p_organization_id, 'work_council.write')
    or public.has_capability(p_organization_id, 'org.admin')
  ) then
    raise exception 'Not allowed';
  end if;
  for r in
    select id from public.amu_elections
    where organization_id = p_organization_id
      and phase = 'voting'
      and voting_ends_at is not null
      and voting_ends_at < now()
  loop
    perform public.close_amu_election(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

grant execute on function public.auto_close_due_amu_elections(uuid) to authenticated;

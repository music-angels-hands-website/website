-- Apply to the SAME Supabase project as web Auth and Android attendance.
-- Additive migration; does not change existing Android table grants.
begin;
create table public.volunteer_locations (
  location_code text primary key,
  display_name text not null,
  time_zone text not null,
  enabled boolean not null default false
);
create table public.member_auth_links (
  location_code text not null references public.volunteer_locations(location_code),
  member_id uuid not null,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  matched_email text not null,
  linked_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (location_code, member_id),
  foreign key (location_code, member_id) references public.members(location_code, id) on delete cascade
);
create unique index member_auth_links_active_user_location_uq
  on public.member_auth_links(auth_user_id, location_code) where revoked_at is null;
alter table public.volunteer_locations enable row level security;
alter table public.member_auth_links enable row level security;
revoke all on public.volunteer_locations, public.member_auth_links from public, anon, authenticated;

create function public.volunteer_revoke_member_link() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(btrim(coalesce(new.email, ''))) is distinct from lower(btrim(coalesce(old.email, '')))
     or not new.is_active then
    update public.member_auth_links set revoked_at = now()
    where location_code = old.location_code and member_id = old.id and revoked_at is null;
  end if;
  return new;
end;
$$;
revoke all on function public.volunteer_revoke_member_link() from public, anon, authenticated;
create trigger volunteer_member_changed after update of email, is_active on public.members
  for each row execute function public.volunteer_revoke_member_link();

create function public.volunteer_portal(operation text, selected_location text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  address text;
  candidate uuid;
  candidates bigint;
  member uuid;
  zone text;
  result jsonb;
begin
  -- Read auth.users instead of trusting stale JWT email or user_metadata.
  select lower(btrim(u.email)) into address from auth.users u
    where u.id = uid and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until < now());
  if uid is null or address is null or address = '' then
    raise insufficient_privilege using message = 'Verified login required';
  end if;
  if operation = 'me' then
    select jsonb_build_object('locations', coalesce(jsonb_agg(jsonb_build_object(
      'location_code', v.location_code, 'display_name', v.display_name, 'time_zone', v.time_zone,
      'linked', exists(select 1 from public.member_auth_links l join public.members m
        on m.location_code = l.location_code and m.id = l.member_id
        where l.location_code = v.location_code and l.auth_user_id = uid and l.revoked_at is null
        and l.matched_email = address and m.is_active and lower(btrim(m.email)) = address)
    ) order by v.display_name), '[]'::jsonb)) into result from public.volunteer_locations v where v.enabled;
    return result;
  end if;
  select time_zone into zone from public.volunteer_locations where location_code = selected_location and enabled;
  if zone is null then raise insufficient_privilege using message = 'Location unavailable'; end if;
  -- Also validates the configured IANA time zone.
  perform now() at time zone zone;
  if operation = 'link' then
    -- Serialize portal links for a location; unique indexes also protect ownership.
    perform pg_advisory_xact_lock(hashtextextended('volunteer:' || selected_location, 0));
    select count(*) into candidates from public.members
      where location_code = selected_location and is_active and lower(btrim(email)) = address;
    if candidates = 0 then return jsonb_build_object('status', 'unmatched'); end if;
    if candidates > 1 then return jsonb_build_object('status', 'review_required'); end if;
    select id into candidate from public.members
      where location_code = selected_location and is_active and lower(btrim(email)) = address for update;
    begin
      insert into public.member_auth_links(location_code, member_id, auth_user_id, matched_email)
        values(selected_location, candidate, uid, address)
        on conflict (location_code, member_id) do update
        set auth_user_id = excluded.auth_user_id, matched_email = excluded.matched_email,
            linked_at = now(), revoked_at = null
        where member_auth_links.revoked_at is not null or member_auth_links.auth_user_id = uid;
      if not found then return jsonb_build_object('status', 'review_required'); end if;
    exception when unique_violation then return jsonb_build_object('status', 'review_required');
    end;
    return jsonb_build_object('status', 'linked');
  end if;
  if operation <> 'records' then raise exception 'Invalid operation'; end if;
  select l.member_id into member from public.member_auth_links l join public.members m
    on m.location_code = l.location_code and m.id = l.member_id
    where l.location_code = selected_location and l.auth_user_id = uid and l.revoked_at is null
      and l.matched_email = address and m.is_active and lower(btrim(m.email)) = address;
  if member is null then return jsonb_build_object('status', 'unmatched'); end if;
  -- Aggregate BEFORE PostgREST row limiting; all events are paired before date filters.
  -- Fail closed instead of returning a truncated, incorrect total for oversized histories.
  select count(*) into candidates from public.attendance_records a
    where a.location_code = selected_location and a.member_id = member;
  if candidates > 100000 then raise exception 'History requires server aggregation'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'location_code', a.location_code,
    'member_id', a.member_id, 'timestamp', a.timestamp, 'type', a.type, 'activity_name', a.activity_name)
    order by a.timestamp, a.id), '[]'::jsonb) into result from public.attendance_records a
    where a.location_code = selected_location and a.member_id = member;
  return jsonb_build_object('status', 'linked', 'time_zone', zone, 'events', result);
end;
$$;
revoke all on function public.volunteer_portal(text, text) from public, anon;
grant execute on function public.volunteer_portal(text, text) to authenticated;
commit;

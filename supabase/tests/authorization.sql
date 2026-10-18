-- TEST ONLY: run in a fresh disposable PostgreSQL database, never production.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.members(id uuid primary key,location_code text not null,email text,is_active boolean default true,unique(location_code,id));
create table public.attendance_records(id uuid primary key,location_code text,member_id uuid,timestamp timestamptz,type text,activity_name text);
\ir ../migrations/001_volunteer_portal.sql
insert into auth.users values ('00000000-0000-0000-0000-000000000001','a@example.com',now(),null),('00000000-0000-0000-0000-000000000002','b@example.com',now(),null),('00000000-0000-0000-0000-000000000003','unverified@example.com',null,null);
insert into public.members values ('10000000-0000-0000-0000-000000000001','main',' A@example.com ',true),('10000000-0000-0000-0000-000000000002','main','b@example.com',true);
insert into public.volunteer_locations values('main','Main','America/Los_Angeles',true),('disabled','Disabled','America/Los_Angeles',false);
insert into public.attendance_records values('20000000-0000-0000-0000-000000000001','main','10000000-0000-0000-0000-000000000001',now(),'checkIn','Music'),('20000000-0000-0000-0000-000000000002','main','10000000-0000-0000-0000-000000000002',now(),'checkIn','Private B');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin
 if public.volunteer_portal('link','main')->>'status' <> 'linked' then raise exception 'link failed'; end if;
 if public.volunteer_portal('records','main')->'events'->0->>'activity_name' <> 'Music' then raise exception 'own data missing'; end if;
 if jsonb_array_length(public.volunteer_portal('records','main')->'events') <> 1 then raise exception 'other user leaked'; end if;
 if jsonb_array_length(public.volunteer_portal('me')->'locations') <> 1 then raise exception 'disabled location leaked'; end if;
 begin perform public.volunteer_portal('records','disabled');raise exception 'disabled allowed';exception when insufficient_privilege then null; end;
 begin perform * from public.member_auth_links;raise exception 'direct links allowed';exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin
 if public.volunteer_portal('records','main')->>'status' <> 'unmatched' then raise exception 'unlinked access allowed'; end if;
 if public.volunteer_portal('link','main')->>'status' <> 'linked' then raise exception 'B link failed'; end if;
 if public.volunteer_portal('records','main')->'events'->0->>'activity_name' <> 'Private B' then raise exception 'B data wrong'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ begin
 begin perform public.volunteer_portal('me');raise exception 'unverified allowed';exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.members set email='changed@example.com' where email='b@example.com';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin
 if public.volunteer_portal('records','main')->>'status' <> 'unmatched' then raise exception 'changed email retained access'; end if;
end $$;
reset role;
insert into public.members values('10000000-0000-0000-0000-000000000003','main','a@example.com',true);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin
 if public.volunteer_portal('link','main')->>'status' <> 'review_required' then raise exception 'duplicate linked'; end if;
end $$;
reset role;
\ir ../migrations/002_lockdown_after_device_migration.sql
set role anon;
do $$ begin
 begin perform public.volunteer_portal('me');raise exception 'anon RPC allowed';exception when insufficient_privilege then null; end;
 begin perform * from public.attendance_records;raise exception 'anon table allowed';exception when insufficient_privilege then null; end;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin
 begin perform * from public.attendance_records;raise exception 'direct table allowed';exception when insufficient_privilege then null; end;
 if public.volunteer_portal('records','main')->>'status' <> 'linked' then raise exception 'RPC broken by lockdown'; end if;
end $$;
reset role;
select 'DB authorization tests passed' as result;

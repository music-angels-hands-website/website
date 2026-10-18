-- CUTOVER ONLY: migrate all Android/iOS/macOS clients to authenticated device APIs first.
-- Review all existing views and SECURITY DEFINER RPCs separately; this cannot audit them.
-- Never restore anonymous CRUD to roll back the website.
begin;
do $$
declare t text; p record;
begin
  foreach t in array array['members','attendance_records','attendance_change_logs','member_face_templates','admin_pins'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from public, anon, authenticated', t);
      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', p.policyname, t);
      end loop;
    end if;
  end loop;
end;
$$;
commit;

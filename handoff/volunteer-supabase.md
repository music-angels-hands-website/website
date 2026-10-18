# Volunteer records — Supabase and static HTML/JavaScript

Date: 2026-10-17

## Result

No Worker, server hosting, service-role key, or additional backend deployment is required. The existing static GitHub Pages site calls a Supabase database function using its existing authenticated Supabase client. Account includes a Volunteer records link to `/#volunteer`.

The page supports location selection, explicit membership connection, date and exact activity filters, attendance rows, full filtered totals, and 50-row display pages. June 1–May 31 is the default reporting year. Open attendance contributes zero hours. Check-ins and checkouts are paired before date filtering, per member/location, with UTC elapsed durations and local IANA date attribution. Same-time events are flagged for review. Client-side calculated hours are informational; an official approval/certificate system is outside scope.

Database authorization is independent of JavaScript: the restricted SECURITY DEFINER function reads auth.uid() and the current confirmed email from auth.users, then checks active membership and UUID ownership. It does not accept caller-specified emails or member IDs. Duplicate matching members require administrator review. Links are transactionally protected by row/advisory locks and unique constraints; member email changes or deactivation revoke existing links. The RPC returns only the authorized user's minimal attendance fields. Original table SELECT access is not needed.

The browser calculates derived intervals from the complete authorized history. JSON aggregation avoids PostgREST's normal response-row limit. A 100,000-event guard rejects oversized histories instead of returning inaccurate partial totals. Each display page currently refetches the history; use database-side aggregation if histories become large. Records can move between display pages when a device concurrently updates attendance.

## Setup: Supabase

1. Use the SAME Supabase project for website Auth and Android attendance. Confirm this before running SQL. Different projects require a separate identity design.
2. Back up the DB. Verify members has id, location_code, email, is_active and a unique (location_code, id) constraint. Verify attendance_records has id, location_code, member_id, timestamp, type, activity_name. The migration extends the existing Android schema; it does not create or reset original attendance tables.
3. In Supabase Dashboard → SQL Editor, run `supabase/migrations/001_volunteer_portal.sql` once. It creates two tables, a member-change trigger, and the restricted volunteer_portal function. Locations start disabled. If you previously applied an earlier draft of migration 001, reconcile that schema first instead of running CREATE statements again.
4. Register your ACTUAL Android location codes and correct IANA time zones, initially disabled:

```sql
insert into public.volunteer_locations
  (location_code, display_name, time_zone)
values ('main-location', 'Main location', 'America/Los_Angeles');
```

Replace main-location with the real location_code. Add one row per location. The browser shows only enabled locations.

5. Authentication → Providers → Email: keep password sign-in enabled and require email confirmation. Existing registration/sign-in/confirmation/resend/password recovery are reused. No OTP or additional login implementation is necessary.
6. Authentication → URL Configuration: set Site URL to your public website. Register its exact root redirect URL (including any site subdirectory) used by auth.js. Register staging/local redirects separately.
7. Configure production SMTP and verify confirmation and password reset deliveries. Members must use the email registered on their active Android membership. Matching trims whitespace and ignores case; it does not rewrite Gmail dots or plus tags. Duplicate/shared emails require operator resolution. This design assumes verified email ownership is sufficient to link a member; do not enable automatic linking where manual identity approval is required.

## Required DB permission cutover

The supplied reference says existing Android DB permissions may permit unrestricted anon/authenticated CRUD. The live DB has not been inspected. Merely installing the portal function does not remove those old access paths.

`002_lockdown_after_device_migration.sql` enables RLS, removes existing policies, and revokes direct PUBLIC/anon/authenticated access to the original sensitive tables. New portal tables already have RLS enabled and no client table grants. Access is granted only to the verified-user RPC, which has a fixed empty search_path and explicitly schema-qualified references, consistent with the [Supabase function security guidance](https://supabase.com/docs/guides/database/functions).

**Do not run migration 002 while existing Android/iOS/macOS apps still depend on anonymous sync.** They will lose direct DB access. First migrate those clients to authenticated, appropriately scoped access. This task does not change their authentication or synchronization code. This concern exists regardless of using a Worker.

Before production activation:

- Review migration 002 on staging, complete device migration, then apply it during cutover.
- Inspect existing exposed views and SECURITY DEFINER/PIN RPCs separately and revoke any alternate public data path. Script 002 cannot audit those automatically.
- Confirm anon cannot SELECT the original tables or execute volunteer_portal; authenticated users cannot SELECT original tables or directly modify links.
- Test two accounts: each can link/read only its own active membership; duplicate/unconfirmed/changed emails are blocked, and forged locations do not disclose other members.
- Confirm migrated device clients still synchronize.

Then enable the configured locations:

```sql
update public.volunteer_locations set enabled = true
where location_code = 'main-location';
```

To disable portal access, set enabled = false for the affected locations. The flag is enforced inside the DB function, including for direct RPC callers. Do not restore public CRUD as a rollback. Do not rerun Android reset/all-in-one scripts that disable RLS.

## Setup: GitHub Pages

In website repository Settings → Secrets and variables → Actions, configure the existing settings:

| Type | Name | Purpose |
| --- | --- | --- |
| Variable | SUPABASE_URL | URL of the same Supabase project |
| Secret | SUPABASE_PUBLISHABLE_KEY | That project's publishable key |

No VOLUNTEER_API_URL or Cloudflare settings are used. Existing Google Drive settings continue to work. Never place a secret/service_role key in HTML, JavaScript, config.local.js, or Git. The publishable key is intentionally visible in the browser; security comes from DB grants, RLS, and restricted RPC checks.

Push to main or run the existing Deploy GitHub Pages workflow after reviewing the changes. It generates runtime config and publishes only static app files, assets, and content, excluding SQL, tests, and handoff documents. Visit the site, sign in, choose Account → Volunteer records, select a location, and click Connect my membership. Subsequent visits load the linked records.

## RPC contract

`supabase.rpc('volunteer_portal', { operation, selected_location })`

- me: enabled location metadata and the caller's connection flags.
- link: connect the caller's unique confirmed email match at that location; linked/unmatched/review_required.
- records: all safe attendance fields belonging to the caller's valid linked membership, plus time_zone. No table-wide selection, raw contact data, notes, card identifiers, device metadata, face data, or PINs are returned.

The browser cannot write original attendance or links directly. Correction requests, administrator approval, attendance editing, device authentication migration, and official recognized-hour certification are outside this read-only implementation.

## Verification

Run `node --test tests/*.test.cjs tests/*.test.mjs` from website. All 12 JavaScript tests passed. Local tests cover existing auth flows, attendance pairing, missing/duplicate/orphan events, cross-member/location separation, DST, midnight, reporting boundaries, rounding, and same-time event flags. Database integration checks passed on a disposable local PostgreSQL database with a minimal Supabase-compatible Auth schema, including per-user isolation, anonymous/direct-table denial, disabled locations, unverified emails, duplicate matches, email-change revocation, and continued authorized RPC access after lockdown. Reusable checks are in `supabase/tests/authorization.sql`; execute only in a fresh disposable test database using `psql -v ON_ERROR_STOP=1 -f supabase/tests/authorization.sql`. They must never be run on production. The live Supabase project was not changed.

Live schema/configuration, real SMTP, browser/device behavior, and production grants must be checked during rollout. No remote SQL, deployment, credential changes, or device changes were performed automatically.

Official references: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions), [JavaScript RPC](https://supabase.com/docs/reference/javascript/rpc).

## English-only data and interface

All new volunteer interface labels, location display names, setup examples, and documentation use English. For Orange County use display_name `Orange County` and time_zone `America/Los_Angeles`. Reuse the actual existing Android location_code exactly; do not translate or rename identifiers. Existing member names and activity names from attendance are displayed as stored; this change does not translate or overwrite production records.

## Account menu fix

The signed-in Account button now explicitly toggles a dropdown containing Volunteer records and Account settings. Outside clicks, Escape, navigation, and sign-out close the dropdown. Account settings opens the existing account dialog. Updated auth and stylesheet URL versions prevent reuse of pre-volunteer browser-cached assets. Production HTML already included volunteer markup when inspected; unchanged asset version URLs made cached older auth/styles a possible source of inconsistent behavior.

## Empty volunteer records message

An unmatched membership connection or a linked membership with no attendance history displays: "You are not registered as a volunteer. If this is incorrect, please contact the attendance coordinator to have your records corrected." A date/activity filter with zero results still displays "No volunteer records in this period." so an existing volunteer is not misclassified by a narrow filter. Errors and unavailable locations retain their own messages.

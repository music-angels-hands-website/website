# Supabase email authentication

Implemented email/password sign-in, sign-up, confirmation resend, sign-out, session persistence/refresh, and password recovery in `auth.js`. The account dialog is available in the main navigation. The volunteer application form remains separate from account registration.

## Deployment configuration

The requested project is https://oacathzajaowpcrcmmmb.supabase.co.

1. Add `SUPABASE_PUBLISHABLE_KEY` to the GitHub Pages environment secrets using the project's public `sb_publishable_` key. Never use a secret or service-role key. No key values are stored in source or this handoff.
2. Optionally set the `SUPABASE_URL` environment variable to override the project's default URL.
3. In Supabase Authentication, enable the Email provider and email confirmation. Set Site URL to `https://musicangelshands.com/` and allow that exact redirect URL. Add the exact localhost URL used for development if required. For a subdirectory deployment, allow its trailing-slash URL too.
4. Configure custom SMTP for production confirmation and reset emails.
5. Push/deploy only after these settings are ready. The runtime generator rejects incomplete configuration and private key types rather than publishing broken auth.

`config.local.js` is generated from environment variables by `scripts/generate-runtime-config.js` and is git-ignored. Existing Google Drive runtime configuration is preserved. Public client configuration is necessarily delivered to the browser. CSP allows the pinned Supabase SDK CDN and HTTPS Supabase project hosts. A custom Supabase domain requires a CSP and generator validation update.

Local generation: run `node scripts/generate-runtime-config.js` from the website directory with the deployment environment variables supplied externally. Do not commit generated runtime configuration or credentials.

## Validation

- `node --check auth.js`
- `node --check scripts/generate-runtime-config.js`
- `node --test tests/auth.test.cjs`
- `git diff --check`
- Pinned SDK CDN returned HTTP 200.

Tests mock the SDK and cover unavailable configuration, sign-in/sign-out, password mismatch, sign-up confirmation, confirmation resend, reset email, and recovery password updates. Live authentication, email delivery, visual browser QA, and deployment are not verified; project configuration and the public publishable key are still required. This adds account identity only; it does not enforce authorization for public content or the separate CMS.

References: https://supabase.com/docs/guides/auth/passwords and https://supabase.com/docs/reference/javascript/auth-onauthstatechange.

# Signup Email Notification Handoff

## Current status

The public site already sends the `#how-to-join` form payload to the deployed Google Apps Script endpoint. The Apps Script project itself is not stored in this repository, so the email notification must be added in the Google Apps Script editor.

The existing spreadsheet append logic should remain unchanged. Add the helper below to the Apps Script project, then call it after the existing `appendRow(...)` succeeds inside `doPost(e)`.

```javascript
const SIGNUP_NOTIFICATION_EMAIL = 'ahrams@gmail.com';

function sendSignupNotification_(payload) {
  const name = String(payload.name || '').trim() || '(not provided)';
  const email = String(payload.email || '').trim() || '(not provided)';
  const phone = String(payload.phone || '').trim() || '(not provided)';
  const message = String(payload.message || '').trim() || '(not provided)';

  MailApp.sendEmail(
    SIGNUP_NOTIFICATION_EMAIL,
    `New Music Angels Hands signup: ${name}`,
    [
      'A new signup was submitted from the website.',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      '',
      'Message:',
      message,
    ].join('\n'),
  );
}
```

Inside the existing `doPost(e)`, parse the same JSON payload already used for the spreadsheet row, then call:

```javascript
try {
  sendSignupNotification_(payload);
} catch (error) {
  // Keep the signup saved even if email delivery temporarily fails.
  console.error(`Signup email notification failed: ${error}`);
}
```

Place that call after the spreadsheet write. Run the Apps Script once from the editor to approve the Gmail permission, then redeploy the web app as the same deployment. No email API key or secret should be added to the website repository.

## Site-side change

`script.js` now treats non-2xx responses from the signup endpoint as failures, so the form will not show a success message when the Apps Script request is rejected.

## Authentication form collision fix (2026-10-02)

The volunteer form has been replaced with direct contact links. However, the old signup listener still selected the first `.signup-form` in the document. The new Supabase dialog reuses this class for styling and its inputs have no volunteer payload names. As a result, submitting an authentication form also sent an empty volunteer notification through Apps Script. This explains notification emails whose fields all say `(not provided)`; they are not Supabase confirmation emails.

Scoped the legacy form and status selectors to `#how-to-join` so authentication forms cannot invoke the volunteer endpoint. Bumped the site's script cache version. Regression tests exercise the production selectors and event binding both when no volunteer form exists and when a volunteer form is present. Supabase handles account confirmation emails separately. No remote Apps Script change is required for this collision fix, and the source fix still requires deployment.

Follow-up: the live `script.js` was fetched again and still contains the unscoped `.signup-form` selector, confirming the fix is not live yet. The current confirmation-resend button is explicitly `type="button"` and outside the login form, so a resend click alone is not proven to trigger the legacy submit listener. The supplied message is still the Apps Script notification template; Supabase email delivery must be checked separately if confirmation messages remain absent after deployment. A regression test verifies the resend button cannot submit the login form.

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

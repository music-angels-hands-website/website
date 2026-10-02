const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../auth.js'), 'utf8');
function setup(configured = true, sdkAvailable = true) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value: '', dataset: {}, handlers: {}, hidden: false,
      addEventListener(name, callback) { this.handlers[name] = callback; },
      setAttribute(name, value) { this[name] = value; },
      setCustomValidity(value) { this.validation = value; }, reportValidity() { return !this.validation; },
      showModal() { this.open = true; }, close() { this.open = false; this.handlers.close?.(); },
      querySelector(selector) { return element(selector); },
      querySelectorAll(selector) { return selector === 'button:not(.auth-close)' ? [...buttons, element('auth-submit'), element('auth-signout'), element('auth-reset'), element('auth-resend')] : buttons; }
    });
    return elements.get(id);
  }
  const buttons = ['signin', 'signup'].map(mode => { const b = element(mode); b.dataset.authMode = mode; return b; });
  const calls = [];
  let callback;
  const userSession = { user: { email: 'member@example.com' } };
  const auth = Object.fromEntries(['signInWithPassword', 'signUp', 'resetPasswordForEmail', 'updateUser', 'resend', 'signOut'].map(name => [name, async value => {
    calls.push({ name, value });
    return { data: { session: name === 'signInWithPassword' ? userSession : null }, error: null };
  }]));
  auth.onAuthStateChange = fn => { callback = fn; };
  auth.getSession = async () => ({ data: { session: null }, error: null });
  vm.runInNewContext(source, { URL, document: { getElementById: element }, window: { location: { origin: 'https://example.com', pathname: '/site/' }, ...(configured ? { MUSIC_ANGELS_SUPABASE_URL: 'https://example.supabase.co', MUSIC_ANGELS_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', supabase: sdkAvailable ? { createClient: () => ({ auth }) } : undefined } : {}) } });
  return { element, calls, event: (...args) => callback(...args), userSession };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const submit = ui => ui.element('auth-form').handlers.submit({ preventDefault() {} });
test('missing configuration disables auth and explains availability', () => {
  const ui = setup(false);
  ui.element('auth-open').handlers.click();
  assert.match(ui.element('auth-status').textContent, /configuration is missing/);
  assert.equal(ui.element('auth-submit').disabled, true);
});
test('sign in, sign out, confirmation, reset, and recovery use the correct API', async () => {
  const ui = setup(); await flush();
  ui.element('auth-email').value = 'member@example.com';
  ui.element('auth-password').value = 'password-example';
  submit(ui); await flush();
  assert.equal(ui.calls.at(-1).name, 'signInWithPassword');
  assert.equal(ui.element('auth-open').textContent, 'Account');
  ui.element('auth-signout').handlers.click(); await flush();
  assert.equal(ui.calls.at(-1).name, 'signOut');
  ui.element('signup').handlers.click();
  ui.element('auth-password').value = 'password-example';
  ui.element('auth-confirm').value = 'different';
  const previous = ui.calls.length; submit(ui);
  assert.equal(ui.calls.length, previous);
  ui.element('auth-confirm').value = 'password-example'; submit(ui); await flush();
  assert.equal(ui.calls.at(-1).name, 'signUp');
  assert.equal(ui.calls.at(-1).value.options.emailRedirectTo, 'https://example.com/site/');
  assert.match(ui.element('auth-status').textContent, /confirm/);
  ui.element('auth-resend').handlers.click(); await flush();
  assert.equal(ui.calls.at(-1).name, 'resend');
  ui.element('auth-reset').handlers.click(); submit(ui); await flush();
  assert.equal(ui.calls.at(-1).name, 'resetPasswordForEmail');
  ui.event('PASSWORD_RECOVERY', ui.userSession);
  assert.equal(ui.element('auth-dialog').open, true);
  assert.equal(ui.element('auth-email').disabled, true);
  ui.element('auth-password').value = 'new-password-example';
  ui.element('auth-confirm').value = 'new-password-example'; submit(ui); await flush();
  assert.equal(ui.calls.at(-1).name, 'updateUser');
  assert.equal(ui.element('auth-password').value, '');
});

test('SDK load failure is distinguished from missing deployment configuration', () => {
  const ui = setup(true, false);
  ui.element('auth-open').handlers.click();
  assert.match(ui.element('auth-status').textContent, /service could not load/);
  assert.equal(ui.element('auth-submit').disabled, true);
});

test('confirmation resend is a standalone button and cannot submit the login form', () => {
  const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
  const button = html.match(/<button\b[^>]*\bid="auth-resend"[^>]*>/)?.[0];
  assert.ok(button);
  assert.match(button, /type="button"/);
  const formEnd = html.indexOf('</form>', html.indexOf('id="auth-form"'));
  assert.ok(html.indexOf(button) > formEnd);
});

(() => {
  const dialog = document.getElementById('auth-dialog');
  const open = document.getElementById('auth-open');
  const form = document.getElementById('auth-form');
  const email = document.getElementById('auth-email');
  const password = document.getElementById('auth-password');
  const confirm = document.getElementById('auth-confirm');
  const status = document.getElementById('auth-status');
  const submit = document.getElementById('auth-submit');
  const signout = document.getElementById('auth-signout');
  const reset = document.getElementById('auth-reset');
  const resend = document.getElementById('auth-resend');
  const tabs = dialog.querySelector('.auth-tabs');
  let client;
  let session = null;
  let mode = 'signin';
  let busy = false;
  let ready = false;
  let unavailableReason = 'Account access is currently unavailable. Please try again later.';
  const redirectTo = new URL(window.location.pathname, window.location.origin).href;
  function message(text, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
  }
  function render() {
    const account = Boolean(session) && mode !== 'update';
    const newPassword = mode === 'signup' || mode === 'update';
    const titles = { signin: 'Sign in', signup: 'Create account', reset: 'Reset password', update: 'Set new password' };
    document.getElementById('auth-title').textContent = account ? 'Your account' : titles[mode];
    open.textContent = session ? 'Account' : 'Sign in';
    const accountText = document.getElementById('auth-account');
    accountText.hidden = !account;
    accountText.textContent = session?.user?.email || '';
    form.hidden = account;
    tabs.hidden = account || mode === 'update';
    signout.hidden = !account;
    reset.hidden = account || mode === 'update';
    resend.hidden = account || mode === 'update' || mode === 'reset';
    document.getElementById('auth-email-field').hidden = mode === 'update';
    email.disabled = mode === 'update';
    document.getElementById('auth-password-field').hidden = mode === 'reset';
    password.disabled = mode === 'reset';
    password.minLength = newPassword ? 8 : 1;
    password.autocomplete = newPassword ? 'new-password' : 'current-password';
    document.getElementById('auth-confirm-field').hidden = !newPassword;
    confirm.disabled = !newPassword;
    confirm.required = newPassword;
    submit.textContent = titles[mode];
    tabs.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.authMode === mode)));
    dialog.querySelectorAll('button:not(.auth-close)').forEach(button => { button.disabled = busy || !ready; });
    form.setAttribute('aria-busy', String(busy));
  }
  function changeMode(next) {
    mode = next;
    password.value = '';
    confirm.value = '';
    confirm.setCustomValidity('');
    message('');
    render();
  }
  async function run(action) {
    if (busy || !ready) return;
    busy = true;
    message('Please wait…');
    render();
    try { await action(); }
    catch (error) { message(error.message || 'Unable to connect. Please try again.', true); }
    finally { busy = false; password.value = ''; confirm.value = ''; render(); }
  }
  function check(result) { if (result.error) throw result.error; return result.data; }
  open.addEventListener('click', () => {
    if (!dialog.open) dialog.showModal();
    if (!ready) message(unavailableReason, true);
  });
  dialog.querySelector('.auth-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { password.value = ''; confirm.value = ''; });
  tabs.querySelectorAll('button').forEach(button => button.addEventListener('click', () => changeMode(button.dataset.authMode)));
  reset.addEventListener('click', () => changeMode('reset'));
  confirm.addEventListener('input', () => confirm.setCustomValidity(''));
  password.addEventListener('input', () => confirm.setCustomValidity(''));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if ((mode === 'signup' || mode === 'update') && password.value !== confirm.value) {
      confirm.setCustomValidity('Passwords must match.');
      confirm.reportValidity();
      return;
    }
    const address = email.value.trim();
    const secret = password.value;
    const operation = mode;
    run(async () => {
      if (operation === 'reset') {
        check(await client.auth.resetPasswordForEmail(address, { redirectTo }));
        message('If an account exists for this email, you will receive a password reset link.');
      } else if (operation === 'update') {
        if (!session) throw new Error('Open a valid password reset link first.');
        check(await client.auth.updateUser({ password: secret }));
        mode = 'signin';
        message('Your password has been updated.');
      } else {
        const data = check(await (operation === 'signup'
          ? client.auth.signUp({ email: address, password: secret, options: { emailRedirectTo: redirectTo } })
          : client.auth.signInWithPassword({ email: address, password: secret })));
        session = data.session;
        message(session ? 'You are signed in.' : 'Check your email to confirm your account, then sign in.');
      }
    });
  });
  resend.addEventListener('click', () => {
    if (!email.reportValidity()) return;
    run(async () => {
      check(await client.auth.resend({ type: 'signup', email: email.value.trim(), options: { emailRedirectTo: redirectTo } }));
      message('If your account needs confirmation, a confirmation email has been sent.');
    });
  });
  signout.addEventListener('click', () => run(async () => {
    check(await client.auth.signOut());
    session = null;
    mode = 'signin';
    message('You have signed out.');
  }));
  render();
  // Runtime configuration is generated by deployment; no credentials belong in source.
  try {
    const url = window.MUSIC_ANGELS_SUPABASE_URL;
    const key = window.MUSIC_ANGELS_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      unavailableReason = 'Account configuration is missing. Please reload the page or contact the site administrator.';
      message(unavailableReason, true);
      return;
    }
    if (!window.supabase?.createClient) {
      unavailableReason = 'The sign-in service could not load. Please reload the page and check your connection.';
      message(unavailableReason, true);
      return;
    }
    if (!key.startsWith('sb_publishable_')) throw new Error('A public publishable key is required.');
    client = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
    });
    client.auth.onAuthStateChange((event, nextSession) => {
      session = nextSession;
      ready = true;
      if (event === 'PASSWORD_RECOVERY') {
        changeMode('update');
        if (!dialog.open) dialog.showModal();
      }
      if (event === 'SIGNED_OUT') mode = 'signin';
      render();
    });
    client.auth.getSession().then(result => {
      if (result.error) { message('Unable to restore your session. Please try again.', true); return; }
      session = result.data.session;
      ready = true;
      render();
    }).catch(() => message('Unable to connect. Please reload and try again.', true));
  } catch {
    unavailableReason = 'The sign-in service could not initialize. Please reload the page or contact the site administrator.';
    message(unavailableReason, true);
  }
})();

(() => {
  const get = id => document.getElementById(`volunteer-${id}`);
  const clean = value => String(value || '')
    .replace(/https?:\/\/[^\s"'<>]+/g, '[URL]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b(?:sb_(?:secret|publishable)_[\w-]+|eyJ[\w-]+(?:\.[\w-]+){1,2})\b/g, '[redacted]')
    .slice(0, 1600);
  window.musicAngelsVolunteerError = (error, context = 'Volunteer records') => {
    const box = get('error');
    const details = get('error-details');
    if (!box || !details) return;
    const lines = [context, error?.code ? `Code: ${error.code}` : '', error?.status ? `HTTP status: ${error.status}` : '', `Message: ${error?.message || String(error || 'Unknown error')}`, error?.details ? `Details: ${error.details}` : '', error?.hint ? `Hint: ${error.hint}` : ''].filter(Boolean);
    details.textContent = clean(lines.join('\n'));
    box.hidden = false;
    if (get('status')) get('status').textContent = 'Unable to load volunteer records. See the error below and try again.';
  };
  get('retry')?.addEventListener('click', () => window.dispatchEvent(new Event('volunteer-retry')));
  const onPage = () => /^#volunteer(?:-records)?$/.test(window.location.hash);
  window.addEventListener('error', event => {
    const file = event.filename || event.target?.src || '';
    if (/volunteer(?:-sessions|-diagnostics)?\.(?:m?js)/.test(file) || (onPage() && event.error)) {
      window.musicAngelsVolunteerError(event.error || { message: event.message || 'The volunteer page script could not load. Reload the page and check your connection.' }, 'Page script error');
    }
  }, true);
  window.addEventListener('unhandledrejection', event => {
    if (onPage()) window.musicAngelsVolunteerError(event.reason, 'Unexpected page error');
  });
  // Independent of the module: catches missing files, unsupported modules, and import failures.
  setTimeout(() => {
    if (!window.musicAngelsVolunteerReady) window.musicAngelsVolunteerError({ code: 'PAGE_NOT_READY', message: 'The volunteer page did not initialize. Reload the page. If this continues, check that volunteer.js and volunteer-sessions.mjs were deployed.' }, 'Page initialization');
  }, 15000);
})();

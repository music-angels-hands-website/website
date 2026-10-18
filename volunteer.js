import { sessions } from './volunteer-sessions.mjs';

(() => {
  const el = id => document.getElementById(`volunteer-${id}`);
  let revision = 0;
  let cursor = null;
  let locations = [];
  let loadedFilter = '';
  const duration = seconds => `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
  const noVolunteerMessage = 'You are not registered as a volunteer. If this is incorrect, please contact the attendance coordinator to have your records corrected.';
  const status = text => { el('status').textContent = text; };
  function clear() {
    el('rows').replaceChildren();
    el('summary').textContent = '';
    el('table').hidden = true;
    el('more').hidden = true;
    cursor = null;
  }
  async function api(operation, location = '') {
    const result = await window.musicAngelsAuth?.getSession();
    if (result?.error || !result?.data?.session) throw new Error('Please sign in to view your records.');
    const response = await window.musicAngelsAuth.rpc('volunteer_portal', { operation, selected_location: location });
    if (!response || response.error) {
      if (response?.error?.code === '42501') throw new Error('Confirm your email and sign in again to view records.');
      throw new Error('Volunteer records are unavailable. Please contact your administrator or retry.');
    }
    return response.data;
  }
  function defaultDates() {
    const zone = locations.find(l => l.location_code === el('location').value)?.time_zone;
    if (!zone) return;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = type => parts.find(p => p.type === type).value;
    const year = Number(part('year')) - (`${part('month')}-${part('day')}` < '06-01' ? 1 : 0);
    el('from').value = `${year}-06-01`;
    el('to').value = `${year + 1}-05-31`;
  }
  function filters() {
    return new URLSearchParams({ location: el('location').value, from: el('from').value, to: el('to').value, activity: el('activity').value.trim() }).toString();
  }
  async function load(more = false) {
    if (more && filters() !== loadedFilter) more = false;
    if (el('from').value > el('to').value) { status('The start date must be before the end date.'); return; }
    const ticket = ++revision;
    const nextCursor = more ? cursor : null;
    if (!more) clear();
    loadedFilter = filters();
    el('more').hidden = true;
    status('Loading volunteer records…');
    try {
      const raw = await api('records', el('location').value);
      if (ticket !== revision) return;
      if (raw.status !== 'linked') { status('Your membership is not connected. Select your location and choose “Connect my membership”.'); return; }
      const filter = new URLSearchParams(loadedFilter);
      const all = sessions(raw.events, raw.time_zone).filter(row => row.date >= filter.get('from') && row.date <= filter.get('to') && (!filter.get('activity') || row.activity === filter.get('activity')));
      const offset = Number(nextCursor || 0);
      const data = { status: 'linked', time_zone: raw.time_zone, total_seconds: all.reduce((sum, row) => sum + row.seconds, 0), record_count: all.length, open_count: all.filter(row => row.status === 'open').length, sessions: all.slice(offset, offset + 50), next_cursor: offset + 50 < all.length ? String(offset + 50) : null };
      if (ticket !== revision) return;
      if (data.status !== 'linked') { status('Your membership is not connected. Select your location and choose “Connect my membership”.'); return; }
      el('summary').textContent = `${duration(data.total_seconds)} · ${data.record_count} records · ${data.open_count} open · ${data.time_zone}`;
      const time = value => value ? new Intl.DateTimeFormat('en-US', { timeZone: data.time_zone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value)) : '—';
      data.sessions.forEach(s => {
        const tr = document.createElement('tr');
        [s.date, s.activity, time(s.check_in), time(s.check_out), duration(s.seconds), (s.status === 'open' ? 'Open — checkout missing' : s.status === 'unmatched_checkout' ? 'Unmatched checkout' : 'Complete') + (s.review_required ? ' · Review same-time events' : '')].forEach(value => {
          const td = document.createElement('td'); td.textContent = value; tr.append(td);
        });
        el('rows').append(tr);
      });
      el('table').hidden = !data.record_count;
      cursor = data.next_cursor;
      el('more').hidden = !cursor;
      status(data.record_count ? 'Hours are calculated from attendance. Open records contribute zero hours. Totals are rounded after summing seconds.' : raw.events.length === 0 ? noVolunteerMessage : 'No volunteer records in this period.');
    } catch (error) { if (ticket === revision) { status(error.message); el('more').hidden = !cursor; } }
  }
  async function initialize() {
    if (window.location.hash !== '#volunteer' && window.location.hash !== '#volunteer-records') return;
    const ticket = ++revision;
    clear(); el('filters').hidden = true;
    try {
      const result = await window.musicAngelsAuth?.getSession();
      if (ticket !== revision) return;
      const session = result?.data?.session;
      el('signin').hidden = Boolean(session);
      if (!session) { status('Sign in to view your volunteer records.'); return; }
      const data = await api('me');
      if (ticket !== revision) return;
      locations = data.locations;
      el('location').replaceChildren();
      locations.forEach(l => {
        const option = document.createElement('option'); option.value = l.location_code;
        option.textContent = `${l.display_name}${l.linked ? ' · Connected' : ''}`; el('location').append(option);
      });
      if (!locations.length) { status('No volunteer locations are configured. Contact your administrator.'); return; }
      el('filters').hidden = false;
      defaultDates(); await load();
    } catch (error) { if (ticket === revision) status(error.message); }
  }
  el('signin').addEventListener('click', () => document.getElementById('auth-open').click());
  el('filters').addEventListener('submit', event => { event.preventDefault(); load(); });
  el('location').addEventListener('change', () => { defaultDates(); load(); });
  el('more').addEventListener('click', () => load(true));
  el('link').addEventListener('click', async () => {
    const ticket = ++revision;
    clear(); el('link').disabled = true; status('Connecting membership…');
    try {
      const data = await api('link', el('location').value);
      if (ticket !== revision) return;
      if (data.status === 'linked') await load();
      else status(data.status === 'review_required' ? 'Membership needs administrator review. Please contact your location administrator.' : noVolunteerMessage);
    } catch (error) { if (ticket === revision) status(error.message); }
    finally { el('link').disabled = false; }
  });
  window.addEventListener('hashchange', initialize);
  window.addEventListener('music-angels-auth', () => {
    // Clear private data immediately, even when this page is hidden.
    ++revision; clear(); el('filters').hidden = true;
    status('Sign in to view your volunteer records.');
    initialize();
  });
  initialize();
})();

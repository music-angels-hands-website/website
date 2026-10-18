const formatters = new Map();
export function localDate(instant, zone) {
  if (!formatters.has(zone)) {
    if (formatters.size >= 32) formatters.clear();
    formatters.set(zone, new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }));
  }
  const parts = formatters.get(zone).formatToParts(new Date(instant));
  const get = name => parts.find(p => p.type === name).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function reportPeriod(zone, now = new Date()) {
  const date = localDate(now, zone);
  const year = Number(date.slice(0, 4)) - (date.slice(5) < '06-01' ? 1 : 0);
  return { from: `${year}-06-01`, to: `${year + 1}-05-31` };
}
export function sessions(events, zone) {
  const sorted = [...events].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.id.localeCompare(b.id));
  const counts = new Map();
  sorted.forEach(e => counts.set(Date.parse(e.timestamp), (counts.get(Date.parse(e.timestamp)) || 0) + 1));
  const result = [];
  const pending = new Map();
  function row(start, end) {
    const instant = start || end;
    return { id: instant.id, date: localDate(instant.timestamp, zone), activity: (start?.activity_name ?? end?.activity_name) || 'Attendance', check_in: start?.timestamp || null, check_out: end?.timestamp || null, seconds: start && end ? Math.max(0, (Date.parse(end.timestamp) - Date.parse(start.timestamp)) / 1000) : 0, status: !start ? 'unmatched_checkout' : !end ? 'open' : 'complete', review_required: counts.get(Date.parse(instant.timestamp)) > 1 || Boolean(end && counts.get(Date.parse(end.timestamp)) > 1) };
  }
  for (const event of sorted) {
    const key = `${event.location_code}:${event.member_id}`;
    const start = pending.get(key);
    if (event.type === 'checkIn') {
      if (start) result.push(row(start, null));
      pending.set(key, event);
    } else if (event.type === 'checkOut') {
      result.push(row(start, event));
      pending.delete(key);
    }
  }
  pending.forEach(start => result.push(row(start, null)));
  return result.sort((a, b) => (b.check_in || b.check_out).localeCompare(a.check_in || a.check_out) || a.id.localeCompare(b.id));
}

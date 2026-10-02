const fs = require('node:fs');
const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_PUBLISHABLE_KEY || '';
if (Boolean(url) !== Boolean(key)) throw new Error('Both Supabase runtime settings are required.');
if (url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error('Use an HTTPS Supabase project URL; custom domains need a matching CSP update.');
  }
  if (!key.startsWith('sb_publishable_')) throw new Error('Use a public Supabase publishable key.');
}
const config = {
  MUSIC_ANGELS_GOOGLE_API_KEY: process.env.GOOGLE_DRIVE_API_KEY || '',
  MUSIC_ANGELS_SUPABASE_URL: url,
  MUSIC_ANGELS_SUPABASE_PUBLISHABLE_KEY: key,
};
fs.writeFileSync('config.local.js', Object.entries(config).map(([name, value]) => `window.${name} = ${JSON.stringify(value)};`).join('\n') + '\n');

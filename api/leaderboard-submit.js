// Arcade leaderboard submit endpoint — the only door through which a score can be written to `leaderboard`.
// Client sends {name, kills, hero, seconds}. LIGHT protection (this is a portfolio toy, not a ranked ladder):
//   · field validation + a plausibility cap (kills can't outrun what the game's fire rate / hit points allow),
//   · per-IP rate limit (salted IP hash, never stored raw),
//   · duplicate suppression, links/profanity-lite filter on the name.
// It does NOT stop a determined person from fabricating a plausible score; if that ever matters, have the game send a kill-event log and validate it here.
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://ynfkjppwpcnxuvjqmsun.supabase.co';   // not a secret — same URL already embedded client-side
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const HEROES = new Set(['mil-falcon', 'n1', 'razorcrest', 'slave-1']);
const NAME_MAX = 20;
const URL_RE = /(https?:\/\/|www\.|\.com\b|\.net\b|\.org\b)/i;
const MAX_PER_WINDOW = 5, WINDOW_MIN = 10;     // submissions per IP per window
const MAX_KILLS_PER_SEC = 3, SLACK = 10;        // plausibility: score <= seconds * 3 + 10 (score = fighter kills + 3 per support ship + 7 per capital ship; the `kills` column holds the score)
const MIN_SECONDS = 5, MAX_SECONDS = 4 * 3600;

function ipHash(req) {
  const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || 'unknown').trim();
  return crypto.createHash('sha256').update((process.env.LEADERBOARD_SALT || process.env.SUPABASE_SECRET_KEY || 'salt') + '|' + ip).digest('hex').slice(0, 32);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  if (!process.env.SUPABASE_SECRET_KEY) { res.status(500).json({ error: 'server misconfigured — SUPABASE_SECRET_KEY missing' }); return; }
  try {
    const b = req.body || {};
    const name = (b.name || '').toString().replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
    const kills = Number.isInteger(b.kills) ? b.kills : NaN;
    const seconds = Number.isFinite(b.seconds) ? Math.round(b.seconds) : NaN;
    const hero = (b.hero || '').toString();

    if (!name) { res.status(400).json({ error: 'name required' }); return; }
    if (URL_RE.test(name)) { res.status(400).json({ error: 'links are not allowed in names' }); return; }
    if (!HEROES.has(hero)) { res.status(400).json({ error: 'unknown hero ship' }); return; }
    if (!(kills >= 1 && kills <= 5000)) { res.status(400).json({ error: 'invalid score' }); return; }
    if (!(seconds >= MIN_SECONDS && seconds <= MAX_SECONDS)) { res.status(400).json({ error: 'invalid play time' }); return; }
    if (kills > seconds * MAX_KILLS_PER_SEC + SLACK) { res.status(400).json({ error: 'score not plausible for the time played' }); return; }

    const hash = ipHash(req);
    const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();
    const recent = await supabase.from('leaderboard').select('id,name,kills,created_at', { count: 'exact' }).eq('ip_hash', hash).gte('created_at', since).order('created_at', { ascending: false }).limit(MAX_PER_WINDOW);
    if (recent.error) { console.error('[leaderboard-submit] rate check failed', recent.error); res.status(500).json({ error: 'save failed' }); return; }
    if ((recent.count || 0) >= MAX_PER_WINDOW) { res.status(429).json({ error: 'too many submissions — try again in a few minutes' }); return; }
    if ((recent.data || []).some(r => r.name === name && r.kills === kills)) { res.status(200).json({ ok: true, duplicate: true }); return; }

    // Country flag: Vercel sets x-vercel-ip-country (ISO 3166-1 alpha-2) at the edge; we store only the code, never the IP. If the `country` column has not been
    // added yet (see leaderboard-schema.sql) the insert is retried without it, so submissions keep working.
    const cc = (req.headers['x-vercel-ip-country'] || '').toString().toUpperCase();
    const country = /^[A-Z]{2}$/.test(cc) ? cc : null;
    let ins = await supabase.from('leaderboard').insert({ name, kills, hero, seconds, ip_hash: hash, country }).select('id,kills').single();
    if (ins.error && /country/i.test(ins.error.message || '')) ins = await supabase.from('leaderboard').insert({ name, kills, hero, seconds, ip_hash: hash }).select('id,kills').single();
    if (ins.error) { console.error('[leaderboard-submit] insert failed', ins.error); res.status(500).json({ error: 'save failed' }); return; }

    const better = await supabase.from('leaderboard').select('id', { count: 'exact', head: true }).eq('approved', true).gt('kills', kills);
    res.status(200).json({ ok: true, id: ins.data.id, rank: (better.count || 0) + 1 });
  } catch (e) {
    console.error('[leaderboard-submit] unexpected error', e);
    res.status(500).json({ error: 'unexpected error' });
  }
};

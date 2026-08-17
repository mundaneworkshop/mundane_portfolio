// Content-sync save — the only way the server-side content_overrides table changes. Requires a secret
// admin token in the x-admin-token header, checked against HOLONET_ADMIN_TOKEN (the site's one general
// admin token — set directly in Vercel; reused here rather than adding a second token, since the client
// already persists it under the generic key `mw_admintoken`, not a HoloNet-specific one). Anyone without
// the token gets a 401 no matter what the client-side author-mode flag says.
//
// `entries` is treated as the FULL authoritative set of copyOvr keys, not a plain upsert: any key that
// exists in the table but isn't present in this request gets deleted. Without this, a key the client
// deleted locally (e.g. resetGalCam's `delete copyOvr[k]`) would never actually leave the server and would
// keep getting pulled back down on every future reconcile, silently resurrecting cleared content.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ynfkjppwpcnxuvjqmsun.supabase.co';   // not a secret — same URL already embedded client-side
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  if (!process.env.SUPABASE_SECRET_KEY) { res.status(500).json({ error: 'server misconfigured — SUPABASE_SECRET_KEY missing' }); return; }
  if (!process.env.HOLONET_ADMIN_TOKEN) { res.status(500).json({ error: 'server misconfigured — HOLONET_ADMIN_TOKEN missing' }); return; }

  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.HOLONET_ADMIN_TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const entries = (req.body || {}).entries;
  if (!entries || typeof entries !== 'object' || Array.isArray(entries) || Object.keys(entries).length === 0) {
    res.status(400).json({ error: 'entries required' });
    return;
  }

  try {
    const incomingKeys = Object.keys(entries);

    const { data: existingRows, error: selError } = await supabase.from('content_overrides').select('key');
    if (selError) { console.error('[content-save] select failed', selError); res.status(500).json({ error: 'save failed' }); return; }

    const staleKeys = (existingRows || []).map(function (r) { return r.key; }).filter(function (k) { return incomingKeys.indexOf(k) === -1; });
    if (staleKeys.length) {
      const { error: delError } = await supabase.from('content_overrides').delete().in('key', staleKeys);
      if (delError) { console.error('[content-save] delete failed', delError); res.status(500).json({ error: 'save failed' }); return; }
    }

    // upsert()'s `default now()` only fires on a true INSERT, not the UPDATE path a conflicting key takes —
    // set updated_at explicitly so every row's timestamp actually reflects this write.
    const now = new Date().toISOString();
    const rows = incomingKeys.map(function (k) { return { key: k, value: entries[k], updated_at: now }; });
    const { error: upsertError } = await supabase.from('content_overrides').upsert(rows, { onConflict: 'key' });
    if (upsertError) { console.error('[content-save] upsert failed', upsertError); res.status(500).json({ error: 'save failed' }); return; }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[content-save] unexpected error', e);
    res.status(500).json({ error: 'unexpected error' });
  }
};

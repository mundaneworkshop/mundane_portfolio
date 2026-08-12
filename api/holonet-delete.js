// HoloNet admin delete — the only way a message actually leaves the shared table. Requires a secret
// admin token in the x-admin-token header, checked against HOLONET_ADMIN_TOKEN (set directly in Vercel,
// never seen by anyone building this). The client's admin-only "Delete message" button is a convenience,
// not the security boundary — this check is. Anyone without the token gets a 401 no matter what the
// client-side author-mode flag says.
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

  const id = (req.body || {}).id;
  if (!id) { res.status(400).json({ error: 'id required' }); return; }

  try {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) { console.error('[holonet-delete] delete failed', error); res.status(500).json({ error: 'delete failed' }); return; }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[holonet-delete] unexpected error', e);
    res.status(500).json({ error: 'unexpected error' });
  }
};

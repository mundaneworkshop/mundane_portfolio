// HoloNet transmit endpoint — the only door through which a message can be written to the shared
// `messages` table. Client sends {name, msg, x, y, z}; this validates it, stores it using the secret
// key (bypasses RLS), fires an email alert, and returns the stored row so the client can pin the star
// with the server's authoritative id/position.
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const SUPABASE_URL = 'https://ynfkjppwpcnxuvjqmsun.supabase.co';   // not a secret — same URL already embedded client-side
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ALERT_TO = process.env.HOLONET_ALERT_EMAIL || 'jason.hsin@gmail.com';

const NAME_MAX = 40, MSG_MAX = 280;
const URL_RE = /(https?:\/\/|www\.)/i;

function isFiniteNum(n) { return typeof n === 'number' && Number.isFinite(n); }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  if (!process.env.SUPABASE_SECRET_KEY) { res.status(500).json({ error: 'server misconfigured — SUPABASE_SECRET_KEY missing' }); return; }

  try {
    const body = req.body || {};
    const name = (body.name || 'Anonymous').toString().trim().slice(0, NAME_MAX) || 'Anonymous';
    const msg = (body.msg || '').toString().trim().slice(0, MSG_MAX);

    if (!msg) { res.status(400).json({ error: 'message required' }); return; }
    if (URL_RE.test(msg) || URL_RE.test(name)) { res.status(400).json({ error: 'links are not allowed' }); return; }

    // Position: trust the client's suggestion (it already knows the live scatter-ring math) but sanity-clamp
    // it server-side so a broken or malicious client can't park a star somewhere absurd. Generous bounds since
    // the ring radius shifts with tuned params (planetSpread) over time.
    let { x, y, z } = body;
    const radius = isFiniteNum(x) && isFiniteNum(z) ? Math.hypot(x, z) : NaN;
    const sane = isFiniteNum(x) && isFiniteNum(y) && isFiniteNum(z) && radius >= 3 && radius <= 40 && y >= -10 && y <= 20;
    if (!sane) {
      const a = Math.random() * Math.PI * 2, r = 7 + Math.random() * 4;
      x = Math.cos(a) * r; y = 0.3 + Math.random() * 3.2; z = Math.sin(a) * r;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({ name, msg, x, y, z, approved: true })
      .select()
      .single();

    if (error) { console.error('[holonet-submit] insert failed', error); res.status(500).json({ error: 'save failed' }); return; }

    // Await the email before responding — a Vercel function's execution can be frozen right after the
    // response is sent, so a true fire-and-forget call after res.json() isn't reliable. A failed email
    // must never fail the submission itself, hence the inner try/catch.
    if (resend) {
      try {
        await resend.emails.send({
          from: 'HoloNet <onboarding@resend.dev>',
          to: ALERT_TO,
          subject: 'New HoloNet transmission from ' + name,
          text: msg,
        });
      } catch (e) {
        console.error('[holonet-submit] email alert failed', e);
      }
    }

    res.status(200).json({ ok: true, message: data });
  } catch (e) {
    console.error('[holonet-submit] unexpected error', e);
    res.status(500).json({ error: 'unexpected error' });
  }
};

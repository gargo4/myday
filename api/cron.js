const webpush = require('web-push');
const redis = require('./_redis');

const PERIOD = { daily: 86400000, weekly: 604800000 };
const STALE = 6 * 3600 * 1000;

module.exports = async (req, res) => {
  const given = (req.headers.authorization || '').replace(/^Bearer /, '') || (req.query && req.query.secret);
  if (!process.env.SEND_SECRET || given !== process.env.SEND_SECRET) return res.status(401).json({ error: 'unauthorized' });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY);
  const now = Date.now();
  let sent = 0, failed = 0;

  try {
    const keys = (await redis('SMEMBERS', 'rem:users')) || [];
    for (const key of keys) {
      const raw = await redis('GET', key);
      if (!raw) { await redis('SREM', 'rem:users', key); continue; }
      const rec = JSON.parse(raw);
      let dead = false, changed = false;
      const keep = [];

      for (const r of rec.reminders) {
        if (r.due > now) { keep.push(r); continue; }
        changed = true;
        const stale = r.repeat === 'none' && now - r.due > STALE;
        if (!stale && !dead) {
          try {
            await webpush.sendNotification(rec.subscription, JSON.stringify({ title: 'Напоминание', body: r.title, url: '/', tag: r.id + '@' + r.due }), { TTL: 3600, urgency: 'high' });
            sent++;
          } catch (e) {
            failed++;
            if (e.statusCode === 404 || e.statusCode === 410) dead = true;
          }
        }
        const p = PERIOD[r.repeat];
        if (p) keep.push({ ...r, due: r.due + Math.ceil((now - r.due + 1) / p) * p });
      }

      if (dead || !keep.length) { await redis('DEL', key); await redis('SREM', 'rem:users', key); }
      else if (changed) await redis('SET', key, JSON.stringify({ subscription: rec.subscription, reminders: keep }));
    }
    res.status(200).json({ ok: true, sent, failed });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};

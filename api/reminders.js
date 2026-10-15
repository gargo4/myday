const crypto = require('crypto');
const redis = require('./_redis');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { action, subscription, reminders } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (action !== 'sync' || !subscription || !subscription.endpoint || !Array.isArray(reminders)) return res.status(400).json({ error: 'bad request' });

    const key = 'rem:' + crypto.createHash('sha1').update(subscription.endpoint).digest('hex');
    const list = reminders.slice(0, 100).map(r => ({
      id: String(r.id).slice(0, 40),
      title: String(r.title).slice(0, 200),
      due: Number(r.due),
      repeat: ['daily', 'weekly'].includes(r.repeat) ? r.repeat : 'none'
    })).filter(r => r.id && r.title && Number.isFinite(r.due));

    if (!list.length) {
      await redis('DEL', key);
      await redis('SREM', 'rem:users', key);
    } else {
      await redis('SET', key, JSON.stringify({ subscription, reminders: list }));
      await redis('SADD', 'rem:users', key);
    }
    res.status(200).json({ ok: true, count: list.length });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};

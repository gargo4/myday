const webpush = require('web-push');

module.exports = async (req, res) => {
  const pub = process.env.PUBLIC_VAPID_KEY;
  const priv = process.env.PRIVATE_VAPID_KEY;

  if (req.method === 'GET') {
    if (!pub) return res.status(500).json({ error: 'PUBLIC_VAPID_KEY not set' });
    return res.status(200).json({ publicKey: pub });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { action, subscription, title, body: text, url } = body;
    if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'no subscription' });

    if (action === 'save') {
      return res.status(200).json({ ok: true });
    }

    if (action === 'send') {
      if (!pub || !priv) return res.status(500).json({ error: 'VAPID keys not set' });
      webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title: title || 'Мой День', body: text || '', url: url || '/' }),
        { TTL: 3600, urgency: 'high' }
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'bad action' });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};

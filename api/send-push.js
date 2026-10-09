const webpush = require('web-push');

const publicKey = process.env.PUBLIC_VAPID_KEY || 'BJNPsBLXpVqCEOJz-2OM_1ICVYVpIFlyFfIRwd8pKeYjQavcZF2Nx5DCOwwXFl3Ml6SGfyG3kz24pQjaoVpDewY';
const privateKey = process.env.PRIVATE_VAPID_KEY || 'GGpRo23gcKJGMhbZ7bbU1rfpeClqGoSijOlC_PSdpCE';

webpush.setVapidDetails(
  'mailto:karievdakam.com@gmail.com',
  publicKey,
  privateKey
);

let subscriptions = [];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { subscription, action, payload } = body;

      if (action === 'save') {
        if (subscription && !subscriptions.some(s => s.endpoint === subscription.endpoint)) {
          subscriptions.push(subscription);
        }
        return res.status(200).json({ success: true, message: 'Subscription saved' });
      }

      if (action === 'send') {
        const pushPayload = JSON.stringify(payload || {
          title: 'Мой День 🚀',
          body: 'Тестовое уведомление прошло успешно!'
        });

        const targetSub = subscription || subscriptions[subscriptions.length - 1];

        if (!targetSub) {
          return res.status(400).json({ success: false, error: 'Подписка не найдена' });
        }

        await webpush.sendNotification(targetSub, pushPayload);
        return res.status(200).json({ success: true, message: 'Push sent successfully' });
      }

      return res.status(400).json({ success: false, error: 'Неизвестное действие' });
    } catch (error) {
      console.error('Push error:', error);
      return res.status(500).json({ success: false, error: error.message || error.toString() });
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' });
};

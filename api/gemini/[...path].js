// Прокси к Gemini: ключ лежит на сервере (переменная Vercel GEMINI_API_KEY), в телефоне вводить его не нужно.
//   GET  /api/gemini/status                          -> { hasKey: true|false }
//   POST /api/gemini/v1beta/models/<модель>:generateContent  -> пересылает запрос в Google
// Если GEMINI_API_KEY не задан, отвечает 404, и приложение работает по-старому (ключ из настроек помощника).
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const segs = [].concat((req.query && req.query.path) || []);
  const target = segs.join('/');
  const key = process.env.GEMINI_API_KEY;

  if (req.method === 'GET' && target === 'status') return res.status(200).json({ hasKey: !!key });
  if (!key) return res.status(404).json({ error: 'GEMINI_API_KEY не задан' });
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!/^v1beta\/models\/[\w.\-]+:generateContent$/.test(target)) return res.status(400).json({ error: 'Недопустимый путь' });

  // запросы только со страниц этого же сайта
  const origin = req.headers.origin;
  if (origin) { try { if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Чужой источник' }); } catch (e) { return res.status(403).json({ error: 'Чужой источник' }); } }

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const r = await fetch('https://generativelanguage.googleapis.com/' + target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json; charset=utf-8').send(text);
  } catch (e) {
    res.status(502).json({ error: 'Не удалось связаться с Gemini' });
  }
};

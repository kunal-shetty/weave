import { Router } from 'express';

const router = Router();

// GET /api/gemini/test — quick smoke test for the API key
router.get('/test', async (_req, res) => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'GOOGLE_AI_API_KEY not set' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Say "hello" in exactly one word.' }] }],
        generation_config: { max_output_tokens: 10 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ ok: false, error: `Gemini ${response.status}: ${errText}` });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '(no text)';
    res.json({ ok: true, model: 'gemini-3.6-flash', response: text });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

export default router;

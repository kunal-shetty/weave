import { Router } from 'express';

const router = Router();

// POST /api/gemini/generate — stream from Google Gemini API
// Now supports multi-turn conversation with history + current HTML context
router.post('/generate', async (req, res) => {
  const {
    prompt,
    images,
    model = 'gemini-3.6-flash',
    history = [],       // Array of { role: 'user'|'model', content: string }
    currentHtml = null,  // The HTML currently displayed in the preview
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GOOGLE_AI_API_KEY not configured on server' });
  }

  try {
    // Build the system instruction
    const systemText = `You are CodeX, an AI that generates UI sections as plain HTML.

CRITICAL RULES:
- Output ONLY raw HTML with inline <style> tags or inline style attributes — NO React, NO JSX, NO JavaScript
- Do NOT use class names, Tailwind, or any CSS framework — use inline styles or a <style> block inside the HTML
- The output must be a valid HTML fragment that can be injected directly into a <body> tag
- Make it responsive and visually polished
- Use modern CSS: gradients, shadows, border-radius, backdrop-filter, flexbox, grid
- If images are provided as base64, embed them with <img src="data:image/...;base64,..."> tags
- Keep the design dark-themed (black/gray background, white text) to match the CodeX app
- Make it production-ready and visually impressive
- Do NOT include <!DOCTYPE>, <html>, <head>, or <body> tags — just the content HTML and styles
- Do NOT use markdown code fences in your output — just the raw HTML

CMS EDITABILITY (mandatory):
- EVERY visible text-bearing element MUST include an id="field-{kebab-case-name}" attribute (e.g. id="field-headline-main", id="field-cta-button", id="field-stat-1-value", id="field-stat-1-label").
- Apply this to: headings (h1-h6), paragraphs, spans containing text, anchor text, button labels, list items, labels, stat values, stat labels.
- Do NOT add ids to purely structural wrappers (divs that only contain other elements, layout containers, image tags without visible text).
- Use stable, descriptive kebab-case names that describe what the text IS, not its position (use field-stat-1-value, NOT field-div-3-span-2).
- After the visible content, include this single style rule so editors can see what's editable on hover:
  <style>[id^="field-"]{outline:1px dashed transparent;transition:outline-color .15s ease}[id^="field-"]:hover{outline-color:rgba(255,255,255,.35)}</style>

FOLLOW-UP INSTRUCTIONS:
- When modifying existing HTML, preserve ALL existing id="field-*" attributes exactly as they are
- Do NOT generate new field IDs — keep the existing ones
- Only change the content/text within elements, or add/remove elements as requested
- If the user asks to change colors, layout, or styling, apply those changes to the existing structure
- Output the COMPLETE updated HTML — not a diff, not a partial fragment`;

    // Build the contents array for multi-turn conversation
    const contents = [];

    // If there's history, add it as prior turns
    if (history.length > 0) {
      for (const msg of history) {
        // Map 'agent' role to 'model' for Gemini
        const role = msg.role === 'agent' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: msg.content }] });
      }
    }

    // If there's current HTML, add it as context before the new prompt
    if (currentHtml && currentHtml.trim()) {
      // Ensure we end with a user message (required by Gemini)
      if (contents.length === 0 || contents[contents.length - 1].role === 'model') {
        contents.push({
          role: 'user',
          parts: [{ text: `[Current HTML in preview]\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nThis is the HTML currently displayed in the preview. Keep this as context for the next instruction.` }],
        });
      } else {
        // Append to the last user message
        const lastUserIdx = contents.length - 1;
        contents[lastUserIdx].parts[0].text += `\n\n[Current HTML in preview]\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nThis is the HTML currently displayed in the preview. Keep this as context for the next instruction.`;
      }
    }

    // Add the actual user prompt as the final turn
    const userParts = [{ text: prompt }];

    // Attach base64 images if provided
    if (images && images.length > 0) {
      for (const img of images) {
        let mimeType = 'image/png';
        let base64Data = img;

        const mimeMatch = img.match(/^data:(image\/\w+);base64,(.+)$/s);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
          base64Data = mimeMatch[2];
        }

        userParts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data,
          },
        });
      }
    }

    contents.push({ role: 'user', parts: userParts });

    const geminiPayload = {
      contents,
      generation_config: {
        temperature: 0.7,
        top_p: 0.9,
        max_output_tokens: 8192,
      },
      system_instruction: {
        parts: [{ text: systemText }],
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    console.log(`[Gemini] Calling model: ${model} (${contents.length} turns in conversation)`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Gemini] API error ${response.status}:`, errText);
      throw new Error(`Gemini returned ${response.status}: ${errText}`);
    }

    // Stream SSE response back to client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from Gemini');

    const decoder = new TextDecoder();
    let buffer = '';
    let totalText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.error) {
              console.error('[Gemini] Stream error:', parsed.error);
              res.write(`data: ${JSON.stringify({ error: parsed.error.message || 'Gemini stream error' })}\n\n`);
              continue;
            }

            const candidates = parsed.candidates;
            if (candidates && candidates[0]) {
              const candidate = candidates[0];

              if (candidate.content && candidate.content.parts) {
                const textPart = candidate.content.parts
                  .filter((p) => p.text)
                  .map((p) => p.text)
                  .join('');

                if (textPart) {
                  totalText += textPart;
                  res.write(`data: ${JSON.stringify({ text: textPart, done: false })}\n\n`);
                }
              }

              if (candidate.finish_reason) {
                console.log(`[Gemini] Done. Finish reason: ${candidate.finish_reason}. Total chars: ${totalText.length}`);
                res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
              }
            }
          } catch (parseErr) {
            // Some Gemini SSE lines might not be JSON, skip them
          }
        }
      }
    }

    if (totalText.length === 0) {
      console.warn('[Gemini] No text received from API');
      res.write(`data: ${JSON.stringify({ text: 'No response from Gemini API. Check your API key.', done: true })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error('[Gemini] Proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: `Gemini proxy error: ${err.message}` });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

// GET /api/gemini/models — list available models
router.get('/models', (_req, res) => {
  res.json({
    models: [
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Fast and efficient' },
    ],
  });
});

export default router;

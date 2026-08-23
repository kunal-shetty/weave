import { Router } from 'express';

const router = Router();

/**
 * POST /api/reviews/analyze-wireframe
 *
 * Sends a wireframe image to Gemini Vision and asks it to detect UI regions
 * with confidence scores. Returns an array of region objects suitable for
 * bulk-inserting into the ReviewItem collection.
 *
 * Body: { imageBase64: string, mimeType?: string, sessionId?: string }
 */
router.post('/analyze-wireframe', async (req, res) => {
  const { imageBase64, mimeType = 'image/png', sessionId } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GOOGLE_AI_API_KEY not configured' });
  }

  const analysisPrompt = `You are a wireframe analysis AI for a CMS UI builder.
Analyze this wireframe image and identify every distinct UI region/component you can detect.

For EACH region, return a JSON array of objects with these fields:
- label: short kebab-case name for the region (e.g. "hero-banner", "nav-bar", "cta-button", "stat-card-1", "footer")
- confidence: your confidence 0-100 that this region is correctly identified
- x, y, width, height: bounding box as RELATIVE coordinates (0.0–1.0) of the image
- suggestion: what content should go here (e.g. "Main headline text", "Call-to-action button")

Be thorough — identify: navigation, hero sections, headings, subheadings, buttons, images, stat cards, lists, footers, and any other visible UI elements.

Return ONLY a JSON array. No markdown fences, no explanation.
Example: [{"label":"nav-bar","confidence":95,"x":0,"y":0,"width":1.0,"height":0.08,"suggestion":"Navigation bar with logo and links"}]`;

  try {
    const payload = {
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
          { text: analysisPrompt },
        ],
      }],
      generation_config: {
        temperature: 0.3,
        max_output_tokens: 4096,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON array from response (handle markdown fences if present)
    let cleaned = text.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) cleaned = fenceMatch[1].trim();

    const regions = JSON.parse(cleaned);

    if (!Array.isArray(regions)) {
      throw new Error('Gemini did not return a JSON array');
    }

    // Normalize and validate each region
    const validated = regions.map((r) => ({
      label: String(r.label || 'unknown'),
      confidence: Math.max(0, Math.min(100, Number(r.confidence) || 50)),
      region: {
        x: Math.max(0, Math.min(1, Number(r.x) || 0)),
        y: Math.max(0, Math.min(1, Number(r.y) || 0)),
        width: Math.max(0, Math.min(1, Number(r.width) || 0)),
        height: Math.max(0, Math.min(1, Number(r.height) || 0)),
      },
      suggestion: String(r.suggestion || ''),
    }));

    res.json({ regions: validated, sessionId: sessionId || null });
  } catch (err) {
    console.error('[WireframeAnalysis] Error:', err.message);
    res.status(502).json({ error: `Wireframe analysis failed: ${err.message}` });
  }
});

export default router;

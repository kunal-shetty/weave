/**
 * buildPreviewHtml
 *
 * Converts CMS element data (from Redux allSections) into a self-contained
 * HTML string that can be rendered in an iframe. This bridges the gap between
 * the generated JSX (which requires a React runtime) and a visual preview.
 *
 * The HTML uses the same fieldId-based IDs so the CMSEditor can visually
 * highlight editable regions.
 */

interface CardItem {
  fieldId1: string;
  fieldId2: string;
  value1: string;
  value2: string;
}

interface ElementData {
  [fieldId: string]: string | CardItem[];
}

interface CssData {
  [fieldId: string]: string;
}

/**
 * Escape HTML entities to prevent XSS from CMS content.
 */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a complete HTML document from element data.
 * Attempts to reconstruct the split-hero layout based on which elements exist.
 */
export function buildPreviewHtml(
  elements: ElementData,
  cssOverrides: CssData,
  accentColor: string = '#ef4444',
): string {
  const get = (id: string): string => {
    const val = elements[id];
    return typeof val === 'string' ? val : '';
  };

  const getHtml = (id: string): string => {
    const val = elements[id];
    return typeof val === 'string' ? esc(val) : '';
  };

  // Extract card loop data
  let cardsHtml = '';
  for (const [id, val] of Object.entries(elements)) {
    if (Array.isArray(val) && val.length > 0 && val[0]?.fieldId1) {
      cardsHtml = val
        .map(
          (card) => `
        <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:1rem">
          <div id="${card.fieldId1}" style="font-size:1.875rem;font-weight:700;color:white">${esc(card.value1)}</div>
          <div id="${card.fieldId2}" style="color:rgba(255,255,255,0.4);margin-top:0.25rem;font-size:0.875rem">${esc(card.value2)}</div>
        </div>`,
        )
        .join('');
      break; // take the first Cards element
    }
  }

  // Build CSS override styles
  const overrideStyles = Object.entries(cssOverrides)
    .map(([id, css]) => `#${id}{${css}}`)
    .join('\n');

  // Find image element
  let imageUrl = '';
  let imageFieldId = '';
  for (const [id, val] of Object.entries(elements)) {
    if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('/') || val.startsWith('data:'))) {
      // Heuristic: if it looks like an image URL and there's no text content nearby
      if (val.match(/\.(jpg|jpeg|png|webp|gif|svg)/i) || val.startsWith('data:image')) {
        imageUrl = val;
        imageFieldId = id;
        break;
      }
    }
  }

  // Find text elements by heuristic (non-empty strings that aren't image URLs)
  const textElements: { id: string; value: string }[] = [];
  for (const [id, val] of Object.entries(elements)) {
    if (typeof val === 'string' && val.trim() && id !== imageFieldId) {
      if (!val.match(/^(https?:\/\/|\/|data:)/)) {
        textElements.push({ id, value: val });
      }
    }
  }

  // Determine which text is likely the headline (ALL CAPS or longest)
  const headline = textElements.find((t) => t.value === t.value.toUpperCase() && t.value.length > 5)
    || textElements.find((t) => t.value.length > 15)
    || textElements[0];

  const badge = textElements.find((t) => t.value.length < 20 && t !== headline);
  const subheading = textElements.find((t) => t !== headline && t !== badge && t.value.length < 80);
  const description = textElements.find((t) => t !== headline && t !== badge && t !== subheading);

  // Find button/CTA
  let ctaText = 'Get Started';
  let ctaFieldId = '';
  for (const [id, val] of Object.entries(elements)) {
    if (typeof val === 'string' && val.match(/^[A-Z ]{3,}$/)) {
      // Likely a CTA button label
      if (id !== headline?.id && id !== badge?.id) {
        ctaText = val;
        ctaFieldId = id;
        break;
      }
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      height: 100%;
      overflow-y: auto;
      background: #0a0a0a;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    }
    ::-webkit-scrollbar { display: none; }
    body { -ms-overflow-style: none; scrollbar-width: none; }
    [id^="field-"] {
      outline: 1px dashed transparent;
      transition: outline-color 0.15s ease;
    }
    [id^="field-"]:hover {
      outline-color: rgba(255, 255, 255, 0.35);
    }
    ${overrideStyles}
  </style>
</head>
<body>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center;max-width:1200px;width:100%">
      <!-- Left: Image -->
      <div style="width:100%;aspect-ratio:4/3;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:1rem;display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${imageUrl
          ? `<img id="${imageFieldId}" src="${esc(imageUrl)}" alt="Hero image" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`
          : '<span style="color:#666;font-size:0.875rem">Generated preview</span>'
        }
      </div>

      <!-- Right: Content -->
      <div>
        ${badge ? `<div id="${badge.id}" style="display:inline-block;padding:0.4rem 1rem;background:rgba(${hexToRgb(accentColor)},0.1);color:${esc(accentColor)};border-radius:999px;font-size:0.75rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:1rem">${badge.value}</div>` : ''}
        ${headline ? `<h1 id="${headline.id}" style="font-size:3rem;font-weight:700;color:white;margin-bottom:1rem;line-height:1.1">${headline.value}</h1>` : ''}
        ${subheading ? `<p id="${subheading.id}" style="color:rgba(255,255,255,0.6);font-size:1.125rem;margin-bottom:0.5rem">${subheading.value}</p>` : ''}
        ${description ? `<p id="${description.id}" style="color:rgba(255,255,255,0.4);font-size:0.875rem;margin-bottom:1.5rem;line-height:1.6">${description.value}</p>` : ''}
        ${ctaFieldId ? `<button id="${ctaFieldId}" style="padding:1rem 2rem;background:${esc(accentColor)};color:white;border:none;border-radius:0.75rem;font-weight:700;font-size:0.875rem;cursor:pointer">${esc(ctaText)}</button>` : ''}
      </div>
    </div>
  </div>

  ${cardsHtml ? `
  <div style="max-width:1200px;margin:0 auto;padding:0 2rem 3rem">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
      ${cardsHtml}
    </div>
  </div>` : ''}
</body>
</html>`;
}

/**
 * Convert hex color to RGB string for rgba() usage.
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255,255,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

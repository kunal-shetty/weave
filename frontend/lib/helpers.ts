/**
 * Image helper — prefixes paths with VITE_STORAGE_URL / NEXT_PUBLIC_STORAGE_URL
 * and provides a placeholder fallback.
 */

export const PLACEHOLDER = '/placeholder.jpg';

export function getImage(path: string | undefined | null): string {
  if (!path) return PLACEHOLDER;
  // Already an absolute URL (S3, CDN, etc.) — use as-is
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Relative path — prepend storage base URL
  const base = process.env.NEXT_PUBLIC_STORAGE_URL || '';
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Sanitize CMS HTML — allow-list only safe inline tags.
 * In server components use a simple regex strip; in client components
 * DOMPurify is available and used instead.
 */
const ALLOW_TAGS = ['b', 'i', 'br', 'span', 'strong', 'em'];
const TAG_PATTERN = new RegExp(`<(?!\/?(${ALLOW_TAGS.join('|')})(\\s|>|\/))([^>]+)>`, 'gi');

export function sanitizeCmsHtml(html: string): string {
  if (!html) return '';
  // Strip disallowed tags (server-safe, no DOM dependency)
  return html.replace(TAG_PATTERN, '');
}

/**
 * Apply cssText overrides to DOM elements by ID.
 * Called inside a useEffect when allSectionsCss changes.
 */
export function applyCssOverrides(cssData: Record<string, string>) {
  if (typeof document === 'undefined') return;
  Object.entries(cssData).forEach(([fieldId, cssText]) => {
    const el = document.getElementById(fieldId);
    if (el && cssText) {
      el.style.cssText = cssText;
    }
  });
}

/**
 * Build a flat list of all fieldIds from an ids object (incl. nested card IDs).
 */
export function collectFieldIds(ids: Record<string, unknown>): string[] {
  const result: string[] = [];
  for (const val of Object.values(ids)) {
    if (typeof val === 'string') {
      result.push(val);
    } else if (Array.isArray(val)) {
      for (const card of val) {
        if (card && typeof card === 'object') {
          for (const v of Object.values(card)) {
            if (typeof v === 'string') result.push(v);
          }
        }
      }
    }
  }
  return result;
}

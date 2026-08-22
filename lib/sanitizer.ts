/**
 * Sanitise HTML content from CMS.
 * Allow-list: b, i, br, span, strong, em
 */
const ALLOWED_TAGS = /<\/?(b|i|br|span|strong|em)\b[^>]*>/gi
const STRIP_ALL_TAGS = /<[^>]*>/g

export function sanitiseHtml(html: string): string {
  if (!html) return ""

  // Remove script tags and event handlers first
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  clean = clean.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "")

  // Remove everything except allowed tags
  clean = clean.replace(STRIP_ALL_TAGS, (match) => {
    return ALLOWED_TAGS.test(match) ? match : ""
  })

  return clean.trim()
}

/**
 * Strip real names/hostnames from pasted code before saving.
 */
export function stripSensitiveInfo(code: string): string {
  if (!code) return ""

  let cleaned = code

  // Remove URLs with real hostnames
  cleaned = cleaned.replace(
    /https?:\/\/(?!localhost|127\.0\.0\.1|placeholder\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "https://placeholder.example.com"
  )

  // Remove common email patterns
  cleaned = cleaned.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "user@example.com"
  )

  // Remove API keys / secrets patterns
  cleaned = cleaned.replace(
    /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']+["']/gi,
    '$1: "REDACTED"'
  )

  return cleaned
}

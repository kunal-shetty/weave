import { nanoid } from "nanoid"

/**
 * Generate a unique 10-digit numeric ID.
 * Server-side only — never from LLM output.
 */
export function generateFieldId(): string {
  return nanoid(10)
}

/**
 * Generate multiple unique 10-digit IDs.
 */
export function generateFieldIds(count: number): string[] {
  const ids = new Set<string>()
  while (ids.size < count) {
    ids.add(nanoid(10))
  }
  return Array.from(ids)
}

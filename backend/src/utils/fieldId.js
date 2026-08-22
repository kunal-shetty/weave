/**
 * Generates a stable 10-digit numeric ID server-side.
 * NEVER delegate ID generation to the LLM.
 */
export function generateFieldId() {
  const ts = Date.now().toString().slice(-7); // last 7 digits of timestamp
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${ts}${rnd}`;
}

/**
 * Generate multiple unique field IDs.
 */
export function generateFieldIds(count) {
  const ids = new Set();
  while (ids.size < count) {
    ids.add(generateFieldId());
    // small delay trick to avoid timestamp collision
  }
  return Array.from(ids);
}

/**
 * Simple SHA-256 hashing using WebCrypto (works in Node and Browser).
 */
export async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Normalizes content for whitespace-insensitive hashing.
 */
export function normalizeContent(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\*\*|\*|__|\[|\]\(.*?\)/g, ''); // Simple markdown strip
}

/**
 * Generates a short hash for a clause based on its text content.
 */
export async function generateClauseHash(text: string): Promise<string> {
  const normalized = normalizeContent(text);
  const hash = await sha256(normalized);
  return hash;
}

/**
 * Derives a Plain License identifier from an SPDX ID.
 * Strips trailing version suffixes (-2.0, -3.0-only, -2.0-or-later)
 * and prepends "Plain-".
 */
export function derivePlainId(spdxId: string): string {
  const base = spdxId.replace(/-\d+\.\d+(-only|-or-later)?$/i, "");
  return `Plain-${base}`;
}

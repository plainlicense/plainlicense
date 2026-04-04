/**
 * Content processing utilities for licenses.
 * Includes readability scoring and shame word counting.
 */

/**
 * The heading that separates the plain-language section from the original license text.
 * Used as the canonical marker in both plain and original section extraction.
 */
export const ORIGINAL_LICENSE_HEADING = "# Original License Text";

/**
 * Escape special characters in a string so it can be safely used inside a RegExp.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Shared regex that matches the `---` boundary before the original license heading.
 * Case-sensitive to ensure consistent behaviour between plain/original extraction.
 */
const ORIGINAL_SECTION_BOUNDARY = new RegExp(
  `(^|\\n)---\\s*\\n(?=\\s*${escapeRegExp(ORIGINAL_LICENSE_HEADING)}\\b)`,
);

/**
 * Extract only the plain-language portion of a license body.
 * License markdown files contain the plain rewrite followed by a `---` separator
 * and then the original license text. Metrics should only cover the plain section.
 * If no `---` separator is found, the entire body is returned.
 */
export function extractPlainSection(body: string): string {
  // Align boundary detection with rendering/export logic:
  // find the '---' line that directly precedes the '# Original License Text' heading.
  const match = ORIGINAL_SECTION_BOUNDARY.exec(body);

  if (!match) {
    // If no specific boundary is found, treat the entire body as plain text.
    return body;
  }

  // Return everything before the boundary marker.
  return body.slice(0, match.index);
}

/**
 * Extract only the original license text portion of a license body.
 * Returns the text after the `---\n# Original License Text` separator.
 * Returns an empty string if no separator is found.
 *
 * Uses the same boundary regex as `extractPlainSection` for consistency.
 */
export function extractOriginalSection(body: string): string {
  const match = ORIGINAL_SECTION_BOUNDARY.exec(body);

  if (!match) {
    return "";
  }

  // The match ends just before '# Original License Text'. Skip past the heading
  // line itself to return only the body text of the original section.
  const afterBoundary = body.slice(match.index + match[0].length);
  // Strip the heading line (everything up to and including the first newline)
  const headingEnd = afterBoundary.indexOf("\n");
  const afterHeading =
    headingEnd === -1 ? "" : afterBoundary.slice(headingEnd + 1);
  return afterHeading.trim();
}

// Gunning Fog Index calculation
export function calculateGunningFog(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0).length;
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  const wordCount = words.length;

  if (wordCount === 0 || sentences === 0) return 0;

  const complexWords = words.filter((word) => {
    // Simple heuristic for complex words (3+ syllables)
    const syllables = countSyllables(word);
    return syllables >= 3;
  }).length;

  const score =
    0.4 * (wordCount / sentences + 100 * (complexWords / wordCount));
  return parseFloat(score.toFixed(2));
}

export function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;

  // 1. Basic count based on vowel groups
  const matches = word.match(/[aeiouy]{1,2}/g);
  let count = matches ? matches.length : 1;

  // 2. Adjust for 'e' at the end (usually silent)
  // But preserve 'le' as a syllable (e.g., sim-ple, ta-ble)
  if (word.endsWith("e")) {
    if (
      word.endsWith("le") &&
      word.length > 2 &&
      !/[aeiouy]/.test(word[word.length - 3])
    ) {
      // 'le' is its own syllable, keep it
    } else {
      count--;
    }
  }

  // 3. Ensure minimum of 1
  return Math.max(1, count);
}

/**
 * Single shame words — complex legal terms that should be replaced.
 * These are matched as whole words (case-insensitive).
 * Exported so other modules (e.g., build scripts, shame page) can reference
 * the canonical list directly.
 */
export const SHAME_WORDS: readonly string[] = [
  // Old legalese "here-" compounds
  "herein",
  "hereof",
  "hereby",
  "herewith",
  "hereto",
  "hereafter",
  "heretofore",
  // Old legalese "there-" compounds
  "therein",
  "thereof",
  "thereby",
  "therewith",
  "thereto",
  "thereafter",
  // Old legalese "where-" compounds
  "whereby",
  "whereof",
  "whereunder",
  "whereas",
  // Archaic/overly-formal terms
  "aforementioned",
  "witnesseth",
  "notwithstanding",
  "sublicense",
  "indemnify",
  "indemnification",
  "perpetual",
  "irrevocable",
  "attorney",
  "utilize",
  "utilization",
  "applicable",
  "imply",
  "statute",
  "alter",
  "alteration",
  // "grant" and "permit" are common English words that have plain alternatives
  // in the specific license-granting context
  "grant",
  "permit",
  // Additional formal terms
  "convey",
  "conveyance",
  "reproduce",
  "sublicensee",
  "shall",
  "pursuant",
  "perpetually",
];

/**
 * Multi-word shame phrases — complex wordy expressions that should be replaced.
 * These are matched as literal substrings (case-insensitive).
 * Exported so other modules can reference the canonical list.
 */
export const SHAME_PHRASES: readonly string[] = [
  "in order to",
  "in the event that",
  "with respect to",
  "with regard to",
  "in the course of",
  "pursuant to",
  "subject to",
  "in connection with",
  "for the purposes of",
  "in accordance with",
  "with the exception of",
];

export function countShameWords(text: string): number {
  const normalizedText = text.toLowerCase();
  let count = 0;

  // Count single-word matches (whole-word boundary).
  // Escape metacharacters defensively so future additions with punctuation
  // (e.g. hyphenated terms) don't accidentally break the regex.
  for (const word of SHAME_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "g");
    const matches = normalizedText.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  // Count multi-word phrase matches (literal substring).
  // Escape special regex characters defensively — SHAME_PHRASES currently
  // contains only plain strings, but this guard future-proofs the function
  // if phrases with punctuation (e.g., "e.g.,") are added later.
  for (const phrase of SHAME_PHRASES) {
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedPhrase, "gi");
    const matches = normalizedText.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

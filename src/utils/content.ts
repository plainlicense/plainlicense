/**
 * Content processing utilities for licenses.
 * Includes readability scoring and shame word counting.
 */

/**
 * Extract only the plain-language portion of a license body.
 * License markdown files contain the plain rewrite followed by a `---` separator
 * and then the original license text. Metrics should only cover the plain section.
 * If no `---` separator is found, the entire body is returned.
 */
export function extractPlainSection(body: string): string {
  const parts = body.split(/\n---\n/);
  return parts[0] ?? body;
}

// Gunning Fog Index calculation
export function calculateGunningFog(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  const wordCount = words.length;
  
  if (wordCount === 0 || sentences === 0) return 0;

  const complexWords = words.filter(word => {
    // Simple heuristic for complex words (3+ syllables)
    const syllables = countSyllables(word);
    return syllables >= 3;
  }).length;

  const score = 0.4 * ((wordCount / sentences) + 100 * (complexWords / wordCount));
  return parseFloat(score.toFixed(2));
}

export function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  // 1. Basic count based on vowel groups
  const matches = word.match(/[aeiouy]{1,2}/g);
  let count = matches ? matches.length : 1;

  // 2. Adjust for 'e' at the end (usually silent)
  // But preserve 'le' as a syllable (e.g., sim-ple, ta-ble)
  if (word.endsWith('e')) {
    if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
      // 'le' is its own syllable, keep it
    } else {
      count--;
    }
  }

  // 3. Ensure minimum of 1
  return Math.max(1, count);
}

// Shame words counter
// In a real implementation, this would load from a centralized list (e.g., mkdocs.yml)
const SHAME_WORDS = [
  'herein', 'therein', 'whereby', 'aforementioned', 'notwithstanding',
  'heretofore', 'whereas', 'witnesseth', 'indemnify', 'liability'
];

export function countShameWords(text: string): number {
  const normalizedText = text.toLowerCase();
  let count = 0;
  SHAME_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = normalizedText.match(regex);
    if (matches) {
      count += matches.length;
    }
  });
  return count;
}

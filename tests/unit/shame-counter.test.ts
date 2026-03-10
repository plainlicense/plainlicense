import { describe, it, expect } from 'vitest';
import { countShameWords } from '../../src/utils/content.ts';

describe('Shame Words Utilities', () => {
  describe('countShameWords', () => {
    it('should return 0 for clean text', () => {
      expect(countShameWords('This is a simple sentence.')).toBe(0);
    });

    it('should count known shame words', () => {
      const text = 'The aforementioned documentation notwithstanding, the individual shall indemnify the organization.';
      // aforementioned, notwithstanding, indemnify -> 3 words
      expect(countShameWords(text)).toBe(3);
    });

    it('should be case-insensitive', () => {
      expect(countShameWords('HEREIN and herein')).toBe(2);
    });

    it('should only match full words', () => {
      expect(countShameWords('indemnity')).toBe(0); // 'indemnify' is in the list, not 'indemnity'
    });
  });
});

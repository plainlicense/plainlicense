import { describe, it, expect } from 'vitest';
import { calculateGunningFog } from '../../src/utils/content.ts';

describe('Readability Utilities', () => {
  describe('calculateGunningFog', () => {
    it('should return 0 for empty string', () => {
      expect(calculateGunningFog('')).toBe(0);
    });

    it('should calculate higher score for complex text', () => {
      const simpleText = 'The cat sat on the mat.';
      const complexText = 'The aforementioned documentation notwithstanding, the individual shall indemnify the organization.';
      
      const simpleScore = calculateGunningFog(simpleText);
      const complexScore = calculateGunningFog(complexText);
      
      expect(complexScore).toBeGreaterThan(simpleScore);
    });

    it('should match expected score for sample text', () => {
      // "This is a simple sentence." -> 5 words, 1 sentence, 0 complex words
      // 0.4 * (5/1 + 100 * 0/5) = 0.4 * 5 = 2.0
      expect(calculateGunningFog('This is a simple sentence.')).toBe(2.0);
    });
  });
});

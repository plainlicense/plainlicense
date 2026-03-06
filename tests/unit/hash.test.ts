import { describe, it, expect } from 'vitest';
import { generateClauseHash, normalizeContent } from '../../src/utils/hash.ts';

describe('Hash Utilities', () => {
  describe('generateClauseHash', () => {
    it('should generate consistent hash for same content', async () => {
      const content = 'Test content';
      const hash1 = await generateClauseHash(content);
      const hash2 = await generateClauseHash(content);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should normalize whitespace before hashing', async () => {
      const content1 = '  Test   content  \n  with line breaks  ';
      const content2 = 'Test content with line breaks';
      expect(await generateClauseHash(content1)).toBe(await generateClauseHash(content2));
    });

    it('should strip markdown formatting if it does not change the core text', async () => {
      const content1 = 'Test **bold**';
      const content2 = 'Test bold';
      expect(await generateClauseHash(content1)).toBe(await generateClauseHash(content2));
    });
  });

  describe('normalizeContent', () => {
    it('should strip simple markdown formatting', () => {
      const content = 'Test **bold** and *italic* and [link](url)';
      // The current simple regex might leave some artifacts but let's see
      expect(normalizeContent(content)).toContain('test bold and italic and link');
    });
  });
});

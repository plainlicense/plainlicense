import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMarkdown } from '../../src/build/exports/markdown.ts';
import { generatePlaintext } from '../../src/build/exports/plaintext.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(''),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  readFile: vi.fn().mockResolvedValue(''),
}));

describe('Export Generators', () => {
  const ctx = {
    licenseId: 'MIT',
    version: '1.0.0',
    content: '# MIT License\n\nContent here.',
    metadata: { slug: 'mit', title: 'MIT License' },
    outputDir: '/tmp/exports/mit/v1.0.0'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMarkdown', () => {
    it('should write markdown file with header', async () => {
      await generateMarkdown(ctx);
      
      expect(fs.mkdir).toHaveBeenCalledWith(ctx.outputDir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(ctx.outputDir, 'MIT.md'),
        expect.stringContaining('Plain License: MIT v1.0.0')
      );
    });
  });

  describe('generatePlaintext', () => {
    it('should write plaintext file without markdown', async () => {
      await generatePlaintext(ctx);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(ctx.outputDir, 'MIT.txt'),
        expect.stringContaining('MIT LICENSE')
      );
      // Verify markdown # was removed
      const call = (fs.writeFile as any).mock.calls.find((c: any) => c[0].endsWith('MIT.txt'));
      expect(call?.[1]).not.toContain('# MIT');
    });
  });
});

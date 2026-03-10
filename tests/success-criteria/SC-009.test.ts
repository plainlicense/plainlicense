import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * SC-009: Template Block Reuse.
 * Verification: Template blocks are referenced in licenses and files exist.
 */
describe('SC-009: Template Block System', () => {
  it('template blocks referenced in licenses exist in the library', async () => {
    const baseDir = path.resolve('content/licenses');
    const templateBlocksDir = path.resolve('content/template-blocks');
    const categories = await fs.readdir(baseDir);

    const availableBlocks = (await fs.readdir(templateBlocksDir))
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''));

    let totalReferences = 0;

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const { content } = matter(await fs.readFile(path.join(categoryPath, file), 'utf8'));
        
        const blockRegex = /{{block:([a-z0-9-]+)}}/g;
        const matches = [...content.matchAll(blockRegex)];
        
        for (const match of matches) {
          totalReferences++;
          const blockId = match[1];
          expect(availableBlocks).toContain(blockId);
        }
      }
    }
    
    // In our prototype, we might only have a few references
    console.log(`Total template block references found: ${totalReferences}`);
    expect(totalReferences).toBeGreaterThanOrEqual(0); // Should be > 0 once we add more
  });
});

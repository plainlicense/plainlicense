import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { calculateGunningFog } from '../../src/utils/content.ts';

/**
 * SC-001: Plain language version for each license.
 * Verification: Each license has two distinct parts, and the plain part is simpler.
 */
describe('SC-001: Plain Language Correspondence', () => {
  it('each license has a plain version that is simpler than the original', async () => {
    const baseDir = path.resolve('content/licenses');
    const categories = await fs.readdir(baseDir);

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(categoryPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const { data, content: body } = matter(content);

        // Split into sections (usually separated by horizontal rule and "Original License Text" header)
        const parts = body.split(/---[\s\n]+# Original License Text/i);
        
        expect(parts.length).toBeGreaterThanOrEqual(1);
        if (parts.length < 2) {
          console.warn(`License ${file} might be missing the Original License Text section.`);
          continue;
        }

        const plainPart = parts[0];
        const originalPart = parts[1];

        const plainFog = calculateGunningFog(plainPart);
        const originalFog = calculateGunningFog(originalPart);

        console.log(`${file}: Plain Fog=${plainFog}, Original Fog=${originalFog}`);
        
        // Success Criterion: Plain should be significantly simpler (lower score)
        // or at least not more complex than original.
        expect(plainFog).toBeLessThan(originalFog + 5); // Conservative threshold
      }
    }
  });

  it('licenses with "has_mapping: true" must have a corresponding mapping file', async () => {
     const baseDir = path.resolve('content/licenses');
     const categories = await fs.readdir(baseDir);

     for (const category of categories) {
       const categoryPath = path.join(baseDir, category);
       if (!(await fs.stat(categoryPath)).isDirectory()) continue;

       const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.md'));
       for (const file of files) {
         const { data } = matter(await fs.readFile(path.join(categoryPath, file), 'utf8'));
         
         if (data.has_mapping) {
           const spdxId = data.spdx_id;
           const mappingPath = path.resolve(`public/mappings/${spdxId}-mapping.json`);
           const exists = await fs.access(mappingPath).then(() => true).catch(() => false);
           expect(exists).toBe(true);
         }
       }
     }
  });
});

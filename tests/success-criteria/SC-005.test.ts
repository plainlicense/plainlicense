import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * SC-005: Export format success rate.
 * Verification: 100% of published licenses have all export formats.
 */
describe('SC-005: Export Generation Success', () => {
  it('all published licenses have a complete set of export files', async () => {
    const baseDir = path.resolve('content/licenses');
    const categories = await fs.readdir(baseDir);
    let totalPublished = 0;
    let totalComplete = 0;

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const { data } = matter(await fs.readFile(path.join(categoryPath, file), 'utf8'));
        
        if (data.status === 'published') {
          totalPublished++;
          const slug = data.spdx_id.trim().toLowerCase();
          const version = data.version.trim();
          const exportDir = path.resolve(`public/exports/${slug}/v${version}`);
          
          const expectedFormats = [
            `${data.spdx_id.trim()}.gfm.md`,
            `${data.spdx_id.trim()}.cm.md`,
            `${data.spdx_id.trim()}.txt`,
            `${data.spdx_id.trim()}.pdf`,
            `${data.spdx_id.trim()}.xml`,
            `${data.spdx_id.trim()}-embed.html`,
          ];

          let allExist = true;
          for (const format of expectedFormats) {
            const exists = await fs.access(path.join(exportDir, format)).then(() => true).catch(() => false);
            if (!exists) {
              allExist = false;
              console.error(`Missing export ${format} for ${slug}@${version}`);
            }
            expect(exists).toBe(true);
          }
          if (allExist) totalComplete++;
        }
      }
    }
    
    expect(totalPublished).toBeGreaterThan(0);
    expect(totalComplete).toBe(totalPublished);
  });
});

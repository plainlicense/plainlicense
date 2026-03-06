import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * SC-008: Version History Access.
 * Verification: Version manifests correctly reference existing export files.
 */
describe('SC-008: Version History Access', () => {
  it('historical version links in manifest point to real export files', async () => {
    const baseDir = path.resolve('content/licenses');
    const categories = await fs.readdir(baseDir);

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const manifestFiles = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.versions.json'));
      
      for (const manifestFile of manifestFiles) {
        const slug = manifestFile.replace('.versions.json', '');
        const mdFile = path.join(categoryPath, `${slug}.md`);
        const { data } = matter(await fs.readFile(mdFile, 'utf8'));
        const spdxId = data.spdx_id.trim();

        const versions = JSON.parse(await fs.readFile(path.join(categoryPath, manifestFile), 'utf8'));
        
        for (const v of versions) {
          const exportDir = path.resolve(`public/exports/${slug}/v${v.version}`);
          
          // PDF, TXT, MD are the key ones we added to the UI
          const expectedFiles = [
            `${spdxId}.pdf`,
            `${spdxId}.txt`,
            `${spdxId}.gfm.md`
          ];

          for (const file of expectedFiles) {
            const exists = await fs.access(path.join(exportDir, file)).then(() => true).catch(() => false);
            if (!exists) {
              console.error(`Broken historical link: ${slug}@${v.version} -> ${file}`);
            }
            expect(exists).toBe(true);
          }
        }
      }
    }
  });
});

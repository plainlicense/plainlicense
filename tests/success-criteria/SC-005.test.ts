import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { derivePlainId } from '../../src/utils/plain-id.ts';

const distExports = path.resolve('dist/exports');
const hasBuildOutput = await fs.access(distExports).then(() => true).catch(() => false);

/**
 * SC-005: Export format success rate.
 * Verification: 100% of published licenses have all export formats.
 *
 * Requires `mise run build` to have been run first.
 */
describe('SC-005: Export Generation Success', () => {
  it.skipIf(!hasBuildOutput)('all published licenses have a complete set of export files', async () => {
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
          const version = data.plain_version.trim();
          const plainId = data.plain_id || derivePlainId(data.spdx_id.trim());
          const baseName = `${plainId}-${version}`;
          const exportDir = path.resolve(`dist/exports/${slug}/${version}`);

          const expectedFormats = [
            `${baseName}.gfm.md`,
            `${baseName}.cm.md`,
            `${baseName}.txt`,
            `${baseName}.pdf`,
            `${baseName}.xml`,
            `${baseName}-embed.html`,
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

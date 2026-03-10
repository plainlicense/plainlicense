import { z } from 'astro/zod'
import matter from 'gray-matter'
import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// We'll define the schema here since importing from src/content/config.ts
// might be tricky due to Astro's internal types.
const licenseSchema = z.object({
  title: z.string(),
  spdx_id: z.string(),
  version: z.string(),
  license_type: z.enum(['permissive', 'copyleft', 'source-available', 'public-domain' as any]),
  status: z.enum(['draft', 'published']),
  plain_gunning_fog: z.number().optional(),
  shame_words_count: z.number().optional(),
});

describe('Content Validation', () => {
  it('all licenses have valid frontmatter', async () => {
    const baseDir = path.resolve('content/licenses');
    const categories = await fs.readdir(baseDir);

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(categoryPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const { data } = matter(content);

        const result = licenseSchema.safeParse(data);
        if (!result.success) {
          console.error(`Validation failed for ${category}/${file}:`, result.error.format());
        }
        expect(result.success).toBe(true);
      }
    }
  });
});

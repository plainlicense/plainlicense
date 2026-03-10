import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * SC-007: Section Mapping Integrity.
 * Verification: Mapping files reference existing IDs in content.
 */
describe('SC-007: Section Mapping System', () => {
  it('mapping files reference valid IDs in markdown content', async () => {
    const mappingsDir = path.resolve('public/mappings');
    const mappingFiles = (await fs.readdir(mappingsDir)).filter(f => f.endsWith('.json'));

    for (const file of mappingFiles) {
      const mappingData = JSON.parse(await fs.readFile(path.join(mappingsDir, file), 'utf8'));
      const spdxId = mappingData.license_id;
      
      // Find the corresponding markdown file
      const baseDir = path.resolve('content/licenses');
      let found = false;
      const categories = await fs.readdir(baseDir);
      
      for (const cat of categories) {
        const catPath = path.join(baseDir, cat);
        if (!(await fs.stat(catPath)).isDirectory()) continue;
        
        const mdFiles = await fs.readdir(catPath);
        const mdFile = mdFiles.find(f => f.toLowerCase() === `${spdxId.toLowerCase()}.md`);
        
        if (mdFile) {
          found = true;
          const mdContent = await fs.readFile(path.join(catPath, mdFile), 'utf8');
          
          for (const m of mappingData.mappings) {
            const plainClauses = m.plain_clauses || (m.plain_clause ? [m.plain_clause] : []);
            const originalClauses = m.original_clauses || (m.original_clause ? [m.original_clause] : []);
            
            for (const c of [...plainClauses, ...originalClauses]) {
              const id = c.id;
              expect(mdContent).toContain(`id="${id}"`);
            }
          }
        }
      }
      expect(found).toBe(true);
    }
  });
});

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * Migrates existing licenses from docs/licenses/ to content/licenses/
 */
async function migrateLicenses() {
  const docsDir = path.resolve('docs/licenses');
  const targetDir = path.resolve('content/licenses');

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith('index.md') && dir !== docsDir) {
        // Skip docs/licenses/index.md, but process docs/licenses/{category}/{license}/index.md
        try {
          const fileContent = await fs.readFile(fullPath, 'utf8');
          const { data } = matter(fileContent);
          
          if (!data.spdx_id) continue;

          // Convert old frontmatter to new schema
          const newData: any = {
            title: data.plain_name || data.original_name,
            spdx_id: data.spdx_id,
            version: '0.1.0', // Default if missing
            original_version: data.original_version || 'unknown',
            description: data.license_description || '',
            license_type: data.category || 'permissive',
            is_osi_approved: data.no_official !== true,
            is_fsf_approved: true,
            status: 'published',
            summary: data.license_description ? data.license_description.split('.')[0] : '',
            permissions: data.permissions || [],
            conditions: data.conditions || [],
            limitations: data.limitations || [],
            canonical_url: data.original_url || '',
            plain_gunning_fog: data.plain_gunning_fog,
          };

          // Combine reader and original text into the body or keep as separate sections
          const newBody = `# ${newData.title}\n\n${data.reader_license_text}\n\n---\n\n# Original License Text\n\n${data.original_license_text}`;

          const slug = data.spdx_id.toLowerCase();
          const category = data.category || 'permissive';
          const targetSubDir = path.join(targetDir, category);
          await fs.mkdir(targetSubDir, { recursive: true });
          
          const targetFile = path.join(targetSubDir, `${slug}.md`);
          const newFileContent = matter.stringify(newBody, newData);
          
          await fs.writeFile(targetFile, newFileContent);
          console.log(`Migrated ${slug} to ${targetFile}`);
        } catch (e) {
          console.error(`Error migrating ${fullPath}:`, e);
        }
      }
    }
  }

  try {
    await walk(docsDir);
    console.log('Migration complete.');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

migrateLicenses();

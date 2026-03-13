import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * Generates [slug].versions.json for each license by reading the .md file metadata.
 * In a real production environment, this would also pull from Git tags/history.
 */
async function buildVersionsManifest() {
  const baseDir = path.resolve('content/licenses');
  const categories = await fs.readdir(baseDir);

  for (const category of categories) {
    const categoryPath = path.join(baseDir, category);
    if (!(await fs.stat(categoryPath)).isDirectory()) continue;

    const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const { data } = matter(await fs.readFile(filePath, 'utf8'));
      
      const slug = data.spdx_id.trim().toLowerCase();
      const versionsFile = path.join(categoryPath, `${slug}.versions.json`);
      
      let existingVersions = [];
      try {
        existingVersions = JSON.parse(await fs.readFile(versionsFile, 'utf8'));
      } catch {}

      // Check if current version already exists in manifest
      const exists = existingVersions.some((v: any) => v.version === data.plain_version);
      
      if (!exists) {
        existingVersions.unshift({
          version: data.plain_version,
          date: new Date().toISOString().split('T')[0],
          changelog: `Published version ${data.plain_version}`
        });
        
        await fs.writeFile(versionsFile, JSON.stringify(existingVersions, null, 2));
        console.log(`Updated version manifest for ${slug}: v${data.plain_version}`);
      }
    }
  }
}

buildVersionsManifest().catch(console.error);

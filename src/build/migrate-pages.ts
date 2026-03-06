import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * Migrates standard documentation pages to Astro pages as MDX.
 */
async function migratePages() {
  const sourceDirs = ['docs/about', 'docs/faq', 'docs/helping'];
  const sourceFiles = ['docs/shame.md'];
  const targetBase = path.resolve('src/pages');

  // Handle directories
  for (const dir of sourceDirs) {
    const fullSourceDir = path.resolve(dir);
    try {
      const entries = await fs.readdir(fullSourceDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          await processFile(path.join(fullSourceDir, entry.name), dir.replace('docs/', ''));
        }
      }
    } catch (e) {
      console.warn(`Skipping directory ${dir}:`, e);
    }
  }

  // Handle individual files
  for (const file of sourceFiles) {
    await processFile(path.resolve(file), '');
  }

  async function processFile(filePath: string, relativeDir: string) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const { data, content: body } = matter(content);
      
      // Map to MDX with layout
      const fileName = path.basename(filePath).replace('.md', '.mdx');
      const targetDir = path.join(targetBase, relativeDir);
      await fs.mkdir(targetDir, { recursive: true });

      // Ensure title exists
      if (!data.title) {
        data.title = fileName.replace('.mdx', '').charAt(0).toUpperCase() + fileName.replace('.mdx', '').slice(1);
      }

      // Add layout to frontmatter
      const newData = {
        ...data,
        layout: '../../layouts/PageLayout.astro'
      };

      // If it's a root file like shame.md, adjust layout path
      if (relativeDir === '') {
        newData.layout = '../layouts/PageLayout.astro';
      }

      const mdxContent = matter.stringify(body, newData);
      const targetPath = path.join(targetDir, fileName);
      
      await fs.writeFile(targetPath, mdxContent);
      console.log(`Migrated ${filePath} -> ${targetPath}`);
    } catch (e) {
      console.error(`Error processing ${filePath}:`, e);
    }
  }
}

migratePages();

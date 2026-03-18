import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { ExportOrchestrator, type ExportContext } from './exports/index.ts';

/**
 * Script to generate all license exports for all formats.
 * Reads content directly from content/ directory.
 */
async function generateAllExports() {
  const contentDir = path.resolve('content/licenses');
  const templateBlocksDir = path.resolve('content/template-blocks');
  const baseOutputDir = path.resolve('public/exports');
  const orchestrator = new ExportOrchestrator();

  // Load template blocks
  const templateBlocks: Record<string, string> = {};
  try {
    const blockFiles = await fs.readdir(templateBlocksDir);
    for (const file of blockFiles) {
      if (file.endsWith('.md')) {
        const blockContent = await fs.readFile(path.join(templateBlocksDir, file), 'utf8');
        const { content } = matter(blockContent);
        const id = file.replace(/\.md$/, '');
        templateBlocks[id] = content;
      }
    }
  } catch {}

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        const fileContent = await fs.readFile(fullPath, 'utf8');
        let { data, content } = matter(fileContent);
        
        if (!data.spdx_id || !data.plain_version) {
          console.warn(`Skipping ${entry.name} due to missing metadata.`);
          continue;
        }

        // Inject template blocks
        content = content.replace(/{{block:([a-z0-9-]+)}}/g, (match, id) => {
          return templateBlocks[id] || match;
        });

        const outputDir = path.join(baseOutputDir, data.spdx_id.toLowerCase(), `v${data.plain_version}`);
        
        const ctx: ExportContext = {
          licenseId: data.spdx_id,
          version: data.plain_version,
          content: content,
          metadata: data,
          outputDir: outputDir
        };

        await orchestrator.generateAll(ctx);
      }
    }
  }

  try {
    await fs.mkdir(baseOutputDir, { recursive: true });
    await walk(contentDir);
    console.log('All exports generated successfully.');
  } catch (error) {
    console.error('Error generating exports:', error);
    process.exit(1);
  }
}

generateAllExports();

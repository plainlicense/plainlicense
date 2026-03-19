import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { calculateGunningFog, countShameWords, extractPlainSection } from '../utils/content.ts';

/**
 * Updates readability metrics (Gunning Fog, shame words) in license frontmatter.
 * This can be run as part of the build pipeline to ensure metrics are current.
 */
async function updateMetrics() {
  const licensesDir = path.resolve('content/licenses');
  
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        const fileContent = await fs.readFile(fullPath, 'utf8');
        const { data, content } = matter(fileContent);
        
        // Only measure the plain-language section, not the original license text
        const plainContent = extractPlainSection(content);
        const newPlainFog = calculateGunningFog(plainContent);
        const newShameCount = countShameWords(plainContent);
        
        if (data.plain_gunning_fog !== newPlainFog || data.shame_words_count !== newShameCount) {
          data.plain_gunning_fog = newPlainFog;
          data.shame_words_count = newShameCount;
          
          const newFileContent = matter.stringify(content, data);
          await fs.writeFile(fullPath, newFileContent);
          console.log(`Updated metrics for ${entry.name}: Fog ${newPlainFog}, Shame ${newShameCount}`);
        }
      }
    }
  }

  try {
    await walk(licensesDir);
    console.log('Metrics update complete.');
  } catch (error) {
    console.error('Error during metrics update:', error);
    process.exit(1);
  }
}

updateMetrics();

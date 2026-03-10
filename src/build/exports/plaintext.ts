import fs from 'node:fs/promises';
import path from 'node:path';
import type { ExportContext } from './index.ts';

/**
 * Generates plaintext exports.
 * Removes markdown formatting while preserving structure.
 */
export async function generatePlaintext(ctx: ExportContext) {
  const { licenseId, version, content, metadata, outputDir } = ctx;
  const fileName = `${licenseId}.txt`;
  const filePath = path.join(outputDir, fileName);

  // Simple markdown to text conversion
  // Remove bold/italic, convert headers to uppercase, etc.
  let text = content
    .replace(/^#+ (.*)$/gm, (match, p1) => p1.toUpperCase())
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1');

  const header = `Plain License: ${licenseId} v${version}\n` +
                 `Attribution: https://plainlicense.org/licenses/${metadata.slug}\n\n` +
                 `========================================\n\n`;
  
  const fullContent = header + text;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, fullContent);
  console.log(`Generated Plaintext export: ${filePath}`);
}

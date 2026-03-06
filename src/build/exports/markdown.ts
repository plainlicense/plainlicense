import fs from 'node:fs/promises';
import path from 'node:path';
import type { ExportContext } from './index.ts';

/**
 * Generates GitHub-flavored and CommonMark markdown exports.
 */
export async function generateMarkdown(ctx: ExportContext) {
  const { licenseId, version, content, metadata, outputDir } = ctx;
  
  // GFM Version (includes metadata header)
  const gfmFileName = `${licenseId}.gfm.md`;
  const gfmFilePath = path.join(outputDir, gfmFileName);
  const gfmHeader = `<!-- Plain License: ${licenseId} v${version} -->\n` +
                 `<!-- Attribution: https://plainlicense.org/licenses/${metadata.slug || licenseId.toLowerCase()} -->\n\n`;
  const gfmContent = gfmHeader + content;

  // CommonMark Version (No comments, cleaner)
  const cmFileName = `${licenseId}.cm.md`;
  const cmFilePath = path.join(outputDir, cmFileName);
  const cmContent = content;

  // Default filename for backwards compatibility
  const defaultFilePath = path.join(outputDir, `${licenseId}.md`);

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(gfmFilePath, gfmContent),
    fs.writeFile(cmFilePath, cmContent),
    fs.writeFile(defaultFilePath, gfmContent) // Use GFM as default
  ]);

  console.log(`Generated Markdown exports: ${gfmFileName}, ${cmFileName}`);
}

import fs from "node:fs/promises";
import path from "node:path";
import type { ExportContext } from "./index.ts";

/**
 * Generates GitHub-flavored and CommonMark markdown exports.
 */
export async function generateMarkdown(ctx: ExportContext) {
  const { plainId, version, content, metadata, outputDir } = ctx;

  const baseName = `${plainId}-${version}`;

  // GFM Version (includes metadata header)
  const gfmFileName = `${baseName}.gfm.md`;
  const gfmFilePath = path.join(outputDir, gfmFileName);
  const slug = metadata.license_family
    ? `${metadata.license_family}/${ctx.licenseId.toLowerCase()}`
    : ctx.licenseId.toLowerCase();
  const gfmHeader =
    `<!-- Plain License: ${plainId} ${version} -->\n` +
    `<!-- Attribution: https://plainlicense.org/licenses/${slug} -->\n\n`;
  const gfmContent = gfmHeader + content;

  // CommonMark Version (No comments, cleaner)
  const cmFileName = `${baseName}.cm.md`;
  const cmFilePath = path.join(outputDir, cmFileName);
  const cmContent = content;

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(gfmFilePath, gfmContent),
    fs.writeFile(cmFilePath, cmContent),
  ]);

  console.log(`Generated Markdown exports: ${gfmFileName}, ${cmFileName}`);
}

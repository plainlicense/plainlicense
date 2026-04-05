import fs from "node:fs/promises";
import path from "node:path";
import { licenseUrl } from "../../utils/constants";
import type { ExportContext } from "./index.ts";
import {
  annotateTermsForMarkdown,
  appendTermFootnotes,
  convertDefinitionLists,
  extractSemanticBlocks,
  footnotesToInline,
  semanticBlockToCmBlockquote,
  semanticBlockToGfmAlert,
  stripHtmlDivs,
} from "./transforms.ts";

/**
 * Applies GFM-specific transforms to license content.
 * Pipeline: stripHtmlDivs → extractSemanticBlocks → GFM alerts.
 * Footnotes and definition lists are kept as-is (GitHub renders them natively).
 */
function transformGfm(content: string): string {
  let result = stripHtmlDivs(content);
  const { content: withPlaceholders, blocks } = extractSemanticBlocks(result);
  result = withPlaceholders;
  for (const block of blocks) {
    result = result.replace(
      `{{rendered:${block.id}}}`,
      semanticBlockToGfmAlert(block),
    );
  }
  // Annotate plain terms as GFM footnotes (first instance only)
  const { content: annotated, definitions } = annotateTermsForMarkdown(result);
  result = appendTermFootnotes(annotated, definitions);
  return result;
}

/**
 * Applies CommonMark-specific transforms to license content.
 * Pipeline: stripHtmlDivs → extractSemanticBlocks → CM blockquotes →
 *           footnotesToInline → convertDefinitionLists.
 */
function transformCm(content: string): string {
  let result = stripHtmlDivs(content);
  const { content: withPlaceholders, blocks } = extractSemanticBlocks(result);
  result = withPlaceholders;
  for (const block of blocks) {
    result = result.replace(
      `{{rendered:${block.id}}}`,
      semanticBlockToCmBlockquote(block),
    );
  }
  // Annotate terms before footnote inlining so they get converted to inline notes
  const { content: annotated, definitions } = annotateTermsForMarkdown(result);
  result = appendTermFootnotes(annotated, definitions);
  result = footnotesToInline(result);
  result = convertDefinitionLists(result, "markdown");
  return result;
}

/**
 * Generates GitHub-flavored and CommonMark markdown exports.
 * GFM uses alert syntax for semantic blocks; CM uses labelled blockquotes,
 * inline footnotes, and converted definition lists.
 */
export async function generateMarkdown(ctx: ExportContext) {
  const { plainId, version, content, metadata, outputDir } = ctx;

  const baseName = `${plainId}-${version}`;

  // GFM Version (includes metadata header + GFM-specific transforms)
  const gfmFileName = `${baseName}.gfm.md`;
  const gfmFilePath = path.join(outputDir, gfmFileName);
  const slug = metadata.license_family
    ? `${metadata.license_family}/${ctx.licenseId.toLowerCase()}`
    : ctx.licenseId.toLowerCase();
  const gfmHeader =
    `<!-- Plain License: ${plainId} ${version} -->\n` +
    `<!-- Attribution: ${licenseUrl(slug)} -->\n\n`;
  const gfmContent = gfmHeader + transformGfm(content);

  // CommonMark Version (no header, CM-specific transforms)
  const cmFileName = `${baseName}.cm.md`;
  const cmFilePath = path.join(outputDir, cmFileName);
  const cmContent = transformCm(content);

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(gfmFilePath, gfmContent),
    fs.writeFile(cmFilePath, cmContent),
  ]);

  console.log(`Generated Markdown exports: ${gfmFileName}, ${cmFileName}`);
}

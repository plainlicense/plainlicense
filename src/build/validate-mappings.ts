import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { resolveConceptMapping } from "./concept-resolver";
import type {
  ConceptMappingFile,
  ResolvedMappingFile,
} from "../types/concept-mapping";

// ── Constants ─────────────────────────────────────────────────────────

const CONTENT_DIR = path.resolve("content");
const MAPPINGS_DIR = path.join(CONTENT_DIR, "mappings");
const LICENSES_DIR = path.join(CONTENT_DIR, "licenses");
const TEMPLATE_BLOCKS_DIR = path.join(CONTENT_DIR, "template-blocks");
const PUBLIC_MAPPINGS_DIR = path.resolve("public", "mappings");

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Strip markdown formatting to produce plain text for matching.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "") // headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1") // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^[-*+]\s+/gm, "") // unordered lists
    .replace(/^\d+\.\s+/gm, "") // ordered lists
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/<[^>]+>/g, "") // HTML tags
    .replace(/\n{3,}/g, "\n\n") // collapse newlines
    .trim();
}

/**
 * Strip `{{component:...}}` placeholders from markdown.
 */
function stripComponents(md: string): string {
  return md.replace(/\{\{component:[^}]+\}\}/g, "");
}

/**
 * Resolve `{{block:...}}` template placeholders by reading
 * the corresponding template-block file and inserting its body.
 */
async function resolveTemplateBlocks(md: string): Promise<string> {
  const blockRegex = /\{\{block:([^}]+)\}\}/g;
  const matches = [...md.matchAll(blockRegex)];

  let resolved = md;
  for (const match of matches) {
    const blockId = match[1].trim();
    const blockPath = path.join(TEMPLATE_BLOCKS_DIR, `${blockId}.md`);
    try {
      const raw = await fs.readFile(blockPath, "utf8");
      const { content } = matter(raw);
      resolved = resolved.replace(match[0], content.trim());
    } catch {
      console.warn(`Template block not found: ${blockPath}`);
    }
  }

  return resolved;
}

/**
 * Find a license markdown file matching the given SPDX ID (case-insensitive).
 */
async function findLicenseFile(spdxId: string): Promise<string | null> {
  const categories = await fs.readdir(LICENSES_DIR, { withFileTypes: true });

  for (const cat of categories) {
    if (!cat.isDirectory()) continue;
    const catDir = path.join(LICENSES_DIR, cat.name);
    const files = await fs.readdir(catDir);

    for (const file of files) {
      if (file.toLowerCase() === `${spdxId.toLowerCase()}.md`) {
        return path.join(catDir, file);
      }
    }
  }

  return null;
}

/**
 * Split a license markdown body into plain and original sections.
 * Splits on `---` followed by `# Original License Text`.
 */
function splitPlainOriginal(body: string): {
  plain: string;
  original: string;
} {
  const separator = /---[\s\n]+#\s*Original License Text/;
  const match = separator.exec(body);

  if (!match) {
    return { plain: body, original: "" };
  }

  return {
    plain: body.slice(0, match.index).trim(),
    original: body.slice(match.index + match[0].length).trim(),
  };
}

// ── Build result type ─────────────────────────────────────────────────

export interface MappingBuildResult {
  licenseId: string;
  success: boolean;
  warnings: string[];
  errors: string[];
  resolved?: ResolvedMappingFile;
}

// ── Orchestration ─────────────────────────────────────────────────────

/**
 * Resolve all concept mapping files and export resolved JSON to public/.
 * Warnings don't fail the build — they're reported but mappings still export.
 */
export async function resolveAndExportMappings(): Promise<
  MappingBuildResult[]
> {
  const results: MappingBuildResult[] = [];

  let mappingFiles: string[];
  try {
    mappingFiles = (await fs.readdir(MAPPINGS_DIR)).filter((f) =>
      f.endsWith(".json"),
    );
  } catch {
    console.warn(`No mappings directory found at ${MAPPINGS_DIR}`);
    return results;
  }

  await fs.mkdir(PUBLIC_MAPPINGS_DIR, { recursive: true });

  for (const file of mappingFiles) {
    const mappingPath = path.join(MAPPINGS_DIR, file);
    const raw = await fs.readFile(mappingPath, "utf8");
    const mappingFile: ConceptMappingFile = JSON.parse(raw);

    const licenseFile = await findLicenseFile(mappingFile.license_id);
    if (!licenseFile) {
      results.push({
        licenseId: mappingFile.license_id,
        success: false,
        warnings: [],
        errors: [`License file not found for ${mappingFile.license_id}`],
      });
      continue;
    }

    const licenseRaw = await fs.readFile(licenseFile, "utf8");
    const { content: body } = matter(licenseRaw);
    const resolved = await resolveTemplateBlocks(body);
    const cleaned = stripComponents(resolved);
    const { plain, original } = splitPlainOriginal(cleaned);

    const plainText = stripMarkdown(plain);
    const originalText = stripMarkdown(original);

    const resolvedMapping = resolveConceptMapping(
      mappingFile,
      originalText,
      plainText,
    );

    const outPath = path.join(
      PUBLIC_MAPPINGS_DIR,
      `${mappingFile.license_id}-mapping.resolved.json`,
    );
    await fs.writeFile(outPath, JSON.stringify(resolvedMapping, null, 2));

    results.push({
      licenseId: mappingFile.license_id,
      success: resolvedMapping.warnings.length === 0,
      warnings: resolvedMapping.warnings,
      errors: [],
      resolved: resolvedMapping,
    });
  }

  return results;
}

// ── CLI entry point ───────────────────────────────────────────────────

async function main() {
  console.log("Resolving concept mappings...\n");
  const results = await resolveAndExportMappings();
  let hasWarnings = false;

  for (const result of results) {
    if (result.success) {
      const count = result.resolved?.concepts.length ?? 0;
      const fillerCount = result.resolved?.filler.length ?? 0;
      console.log(
        `  ${result.licenseId}: ${count} concepts, ${fillerCount} filler resolved`,
      );
    } else if (result.errors.length > 0) {
      console.error(`  ${result.licenseId}: ERROR`);
      for (const err of result.errors) console.error(`    ${err}`);
    } else {
      hasWarnings = true;
      console.warn(
        `  ${result.licenseId}: resolved with ${result.warnings.length} warnings`,
      );
      for (const w of result.warnings) console.warn(`    ${w}`);
    }
  }

  if (hasWarnings) {
    console.warn(
      "\nMapping resolution completed with warnings (mappings still exported).",
    );
  } else {
    console.log("\nAll mappings resolved successfully.");
  }
}

const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith("validate-mappings.ts") ||
    process.argv[1].endsWith("validate-mappings.js"));

if (isMainModule) {
  main();
}

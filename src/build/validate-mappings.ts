import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { generateClauseHash } from "../utils/hash.ts";

// ── Types ──────────────────────────────────────────────────────────────

export interface ClauseRef {
  id: string;
  hash: string;
  content: string;
}

interface MappingEntry {
  id: string;
  type: string;
  plain_clause?: ClauseRef;
  original_clause?: ClauseRef;
  plain_clauses?: ClauseRef[];
  original_clauses?: ClauseRef[];
  [key: string]: unknown;
}

interface MappingFile {
  license_id: string;
  version: string;
  mapping_philosophy: string;
  mappings: MappingEntry[];
}

export interface MappingValidationResult {
  licenseId: string;
  valid: boolean;
  staleClauseIds: string[];
  missingIds: string[];
  errors: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Extracts text inside `<div id="...">...</div>` blocks.
 * Returns a map of id → trimmed inner content.
 */
export function extractDivContent(md: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /<div\s+id="([^"]+)">\s*\n([\s\S]*?)\n<\/div>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(md)) !== null) {
    const id = match[1];
    const content = match[2].trim();
    result[id] = content;
  }

  return result;
}

/**
 * Collects all clause refs from a mapping entry, normalizing
 * singular (plain_clause/original_clause) and plural
 * (plain_clauses/original_clauses) keys into a flat array
 * with a side indicator.
 */
function collectClauseRefs(
  entry: MappingEntry,
): Array<{ ref: ClauseRef; side: "plain" | "original" }> {
  const refs: Array<{ ref: ClauseRef; side: "plain" | "original" }> = [];

  if (entry.plain_clause) {
    refs.push({ ref: entry.plain_clause, side: "plain" });
  }
  if (entry.plain_clauses) {
    for (const clause of entry.plain_clauses) {
      refs.push({ ref: clause, side: "plain" });
    }
  }
  if (entry.original_clause) {
    refs.push({ ref: entry.original_clause, side: "original" });
  }
  if (entry.original_clauses) {
    for (const clause of entry.original_clauses) {
      refs.push({ ref: clause, side: "original" });
    }
  }

  return refs;
}

/**
 * Validates mapping hashes against actual div content from a license file.
 */
export async function validateMappingHashes(
  mapping: MappingFile,
  plainDivs: Record<string, string>,
  originalDivs: Record<string, string>,
): Promise<MappingValidationResult> {
  const result: MappingValidationResult = {
    licenseId: mapping.license_id,
    valid: true,
    staleClauseIds: [],
    missingIds: [],
    errors: [],
  };

  for (const entry of mapping.mappings) {
    // Skip unmapped entries
    if (
      entry.type === "unmapped-plain" ||
      entry.type === "unmapped-original"
    ) {
      continue;
    }

    const clauseRefs = collectClauseRefs(entry);

    for (const { ref, side } of clauseRefs) {
      const divs = side === "plain" ? plainDivs : originalDivs;
      const divContent = divs[ref.id];

      if (divContent === undefined) {
        result.missingIds.push(ref.id);
        result.valid = false;
        continue;
      }

      const actualHash = `sha256:${await generateClauseHash(divContent)}`;

      if (actualHash !== ref.hash) {
        result.staleClauseIds.push(ref.id);
        result.valid = false;
      }
    }
  }

  return result;
}

// ── File-system operations ─────────────────────────────────────────────

const CONTENT_DIR = path.resolve("content");
const MAPPINGS_DIR = path.join(CONTENT_DIR, "mappings");
const LICENSES_DIR = path.join(CONTENT_DIR, "licenses");
const TEMPLATE_BLOCKS_DIR = path.join(CONTENT_DIR, "template-blocks");
const PUBLIC_MAPPINGS_DIR = path.resolve("public", "mappings");

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
      // If template block not found, leave placeholder
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
      if (
        file.toLowerCase() === `${spdxId.toLowerCase()}.md`
      ) {
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
function splitPlainOriginal(body: string): { plain: string; original: string } {
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

/**
 * Validate all mapping files against their corresponding license content.
 */
export async function validateAllMappings(): Promise<
  MappingValidationResult[]
> {
  const results: MappingValidationResult[] = [];

  let mappingFiles: string[];
  try {
    mappingFiles = (await fs.readdir(MAPPINGS_DIR)).filter((f) =>
      f.endsWith(".json"),
    );
  } catch {
    console.warn(`No mappings directory found at ${MAPPINGS_DIR}`);
    return results;
  }

  for (const file of mappingFiles) {
    const mappingPath = path.join(MAPPINGS_DIR, file);
    const raw = await fs.readFile(mappingPath, "utf8");
    const mapping: MappingFile = JSON.parse(raw);

    const licenseFile = await findLicenseFile(mapping.license_id);
    if (!licenseFile) {
      results.push({
        licenseId: mapping.license_id,
        valid: false,
        staleClauseIds: [],
        missingIds: [],
        errors: [
          `License file not found for ${mapping.license_id}`,
        ],
      });
      continue;
    }

    const licenseRaw = await fs.readFile(licenseFile, "utf8");
    const { content: body } = matter(licenseRaw);

    // Resolve template blocks
    const resolved = await resolveTemplateBlocks(body);

    // Split into plain / original
    const { plain, original } = splitPlainOriginal(resolved);

    // Extract divs from each section
    const plainDivs = extractDivContent(plain);
    const originalDivs = extractDivContent(original);

    const result = await validateMappingHashes(mapping, plainDivs, originalDivs);
    results.push(result);
  }

  return results;
}

// ── CLI entry point ────────────────────────────────────────────────────

async function main() {
  console.log("Validating mapping files...\n");

  const results = await validateAllMappings();

  let hasFailure = false;

  // Ensure public/mappings directory exists
  await fs.mkdir(PUBLIC_MAPPINGS_DIR, { recursive: true });

  for (const result of results) {
    if (result.valid) {
      console.log(`  ${result.licenseId}: all hashes valid`);
      // Copy valid mapping to public/mappings/
      const srcFile = path.join(
        MAPPINGS_DIR,
        `${result.licenseId}-mapping.json`,
      );
      const destFile = path.join(
        PUBLIC_MAPPINGS_DIR,
        `${result.licenseId}-mapping.json`,
      );
      await fs.copyFile(srcFile, destFile);
    } else {
      hasFailure = true;
      console.error(`  ${result.licenseId}: validation failed`);
      if (result.errors.length > 0) {
        for (const err of result.errors) {
          console.error(`   Error: ${err}`);
        }
      }
      if (result.staleClauseIds.length > 0) {
        console.error(
          `   Stale: ${result.staleClauseIds.join(", ")}`,
        );
      }
      if (result.missingIds.length > 0) {
        console.error(
          `   Missing: ${result.missingIds.join(", ")}`,
        );
      }
      // Remove stale mapping from public/mappings/ if it exists
      const destFile = path.join(
        PUBLIC_MAPPINGS_DIR,
        `${result.licenseId}-mapping.json`,
      );
      try {
        await fs.unlink(destFile);
        console.error(
          `   Removed stale ${result.licenseId}-mapping.json from public/mappings/`,
        );
      } catch {
        // File didn't exist, nothing to remove
      }
    }
  }

  if (hasFailure) {
    console.error("\nMapping validation failed.");
    process.exit(1);
  }

  console.log("\nAll mappings validated successfully.");
}

// Run as CLI when executed directly
const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith("validate-mappings.ts") ||
    process.argv[1].endsWith("validate-mappings.js"));

if (isMainModule) {
  main();
}

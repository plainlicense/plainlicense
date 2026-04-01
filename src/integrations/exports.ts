import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration, AstroIntegrationLogger } from "astro";
import matter from "gray-matter";
import { getCollectionSchema } from "~cfg/index";
import type { BuildCollectionSchemaResult } from "~cfg/utils";
import { type ExportContext, ExportOrchestrator } from "../build/exports/index";
import { getFileAtCommit, getTaggedVersions } from "../utils/git-versions";
import { derivePlainId } from "../utils/plain-id";

const licenseSchema: BuildCollectionSchemaResult = getCollectionSchema;

interface LicenseFrontmatter {
  plain_name?: string;
  spdx_id?: string;
  plain_version?: string;
  plain_id?: string;
  license_family?: string;
  status?: string;
  slug?: string;
  is_dedication?: boolean;
  original?: {
    name?: string;
    version_display?: string;
  };
  [key: string]: unknown;
}

/**
 * Resolves {{var:...}} placeholders in content using license frontmatter.
 */
function resolveTemplateVars(
  content: string,
  data: LicenseFrontmatter,
): string {
  const vars: Record<string, string> = {
    plain_name: data.plain_name || "",
    original_name: data.original?.name || "",
    original_version_name:
      data.original?.version_display || data.original?.name || "",
    license_type: data.is_dedication ? "dedication" : "license",
  };

  return content.replace(/\{\{var:([a-z_]+)\}\}/g, (_match, key) => {
    return vars[key] ?? `{{var:${key}}}`;
  });
}

/**
 * Injects template block content into {{block:id}} placeholders.
 */
function injectTemplateBlocks(
  content: string,
  templateBlocks: Record<string, string>,
): string {
  return content.replace(/\{\{block:([a-z0-9-]+)\}\}/g, (match, id) => {
    return templateBlocks[id] || match;
  });
}

/**
 * Copies versioned export files to a "latest" directory with version stripped.
 */
async function createLatestAliases(
  exportDir: string,
  latestDir: string,
): Promise<void> {
  await fs.mkdir(latestDir, { recursive: true });
  const exportedFiles = await fs.readdir(exportDir).catch(() => [] as string[]);
  for (const file of exportedFiles) {
    const latestFileName = file.replace(/-\d+\.\d+\.\d+/, "");
    await fs.copyFile(
      path.join(exportDir, file),
      path.join(latestDir, latestFileName),
    );
  }
}

/**
 * Generates exports for past tagged versions of a license.
 */
async function generateHistoricalExports(
  licensePath: string,
  data: LicenseFrontmatter,
  templateBlocks: Record<string, string>,
  orchestrator: ExportOrchestrator,
  outDir: string,
  spdxLower: string,
  currentVersion: string,
  logger: AstroIntegrationLogger,
): Promise<ReturnType<typeof getTaggedVersions>> {
  const taggedVersions = getTaggedVersions(data.spdx_id);

  for (const tv of taggedVersions) {
    if (tv.version === currentVersion) continue;

    // Use POSIX separators for git paths (git show fails with backslashes on Windows)
    const relPath = path
      .relative(path.resolve("."), licensePath)
      .split(path.sep)
      .join("/");
    const pastContent = getFileAtCommit(tv.commitRef, relPath);
    if (!pastContent) {
      logger.warn(
        `Could not read ${relPath} at ${tv.commitRef} for ${data.spdx_id}@${tv.version}`,
      );
      continue;
    }

    let { data: pastData, content: pastBody } = matter(pastContent);
    pastBody = injectTemplateBlocks(pastBody, templateBlocks);
    pastBody = resolveTemplateVars(pastBody, pastData);

    const pastPlainId = pastData.plain_id || derivePlainId(data.original?.);
    const pastExportDir = path.join(outDir, "exports", spdxLower, tv.version);

    const pastCtx: ExportContext = {
      licenseId: data.spdx_id,
      plainId: pastPlainId,
      version: tv.version,
      content: pastBody,
      metadata: {
        ...pastData,
        slug: pastData.slug || data.spdx_id.toLowerCase(),
      },
      outputDir: pastExportDir,
    };

    await orchestrator.generateAll(pastCtx);
  }

  return taggedVersions;
}

interface ManifestEntry {
  plainId: string;
  currentVersion: string;
  versions: string[];
  formats: string[];
}

/**
 * Updates the manifest with a license's version and format info.
 */
function updateManifest(
  manifest: Record<string, ManifestEntry>,
  spdxLower: string,
  plainId: string,
  currentVersion: string,
  taggedVersions: { version: string }[],
): void {
  const allVersions = [
    currentVersion,
    ...taggedVersions.map((tv) => tv.version),
  ]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  manifest[spdxLower] = {
    plainId,
    currentVersion,
    versions: allVersions,
    // Each format is the filename suffix after "{plainId}-{version}"
    formats: [".gfm.md", ".cm.md", ".txt", ".pdf", ".xml", "-embed.html"],
  };
}

export default function exportsIntegration(): AstroIntegration {
  return {
    name: "plainlicense-exports",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const contentDir = path.resolve("content/licenses");
        const templateBlocksDir = path.resolve("content/template-blocks");
        const orchestrator = new ExportOrchestrator();

        // Load template blocks
        const templateBlocks: Record<string, string> = {};
        try {
          const blockFiles = await fs.readdir(templateBlocksDir);
          for (const file of blockFiles) {
            if (file.endsWith(".md")) {
              const blockContent = await fs.readFile(
                path.join(templateBlocksDir, file),
                "utf8",
              );
              const { content } = matter(blockContent);
              templateBlocks[file.replace(/\.md$/, "")] = content;
            }
          }
        } catch {}

        const manifest: Record<string, ManifestEntry> = {};

        // Walk content/licenses/ and generate exports
        const walk = async (dir: string) => {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await walk(fullPath);
            } else if (entry.name.endsWith(".md")) {
              const fileContent = await fs.readFile(fullPath, "utf8");
              let { data, content } = matter(fileContent);

              if (!data.spdx_id || !data.plain_version) {
                logger.warn(
                  `Skipping ${entry.name}: missing spdx_id or plain_version`,
                );
                continue;
              }

              // Skip draft/unpublished licenses
              if (data.status && data.status !== "published") {
                logger.info(`Skipping draft: ${entry.name}`);
                continue;
              }

              content = injectTemplateBlocks(content, templateBlocks);
              content = resolveTemplateVars(content, data);

              const plainId = data.plain_id || derivePlainId(data.spdx_id);
              const spdxLower = data.spdx_id.toLowerCase();
              const version = data.plain_version;
              const exportDir = path.join(
                outDir,
                "exports",
                spdxLower,
                version,
              );

              const slug = data.license_family
                ? `${data.license_family}/${spdxLower}`
                : spdxLower;

              const ctx: ExportContext = {
                licenseId: data.spdx_id,
                plainId,
                version,
                content,
                metadata: { ...data, slug },
                outputDir: exportDir,
              };

              await orchestrator.generateAll(ctx);

              const latestDir = path.join(
                outDir,
                "exports",
                spdxLower,
                "latest",
              );
              await createLatestAliases(exportDir, latestDir);

              const taggedVersions = await generateHistoricalExports(
                fullPath,
                data,
                templateBlocks,
                orchestrator,
                outDir,
                spdxLower,
                version,
                logger,
              );

              updateManifest(
                manifest,
                spdxLower,
                plainId,
                version,
                taggedVersions,
              );
            }
          }
        };

        logger.info("Generating license exports...");
        await walk(contentDir);

        // Write manifest
        const manifestPath = path.join(outDir, "exports", "manifest.json");
        await fs.mkdir(path.dirname(manifestPath), { recursive: true });
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        logger.info(`Export manifest written: ${manifestPath}`);

        logger.info("License exports complete.");
      },
    },
  };
}

import fs from "node:fs/promises";
import path from "node:path";
import type { AstroIntegration } from "astro";
import matter from "gray-matter";
import {
  type ExportContext,
  ExportOrchestrator,
} from "../build/exports/index.ts";
import { getFileAtCommit, getTaggedVersions } from "../utils/git-versions.ts";
import { derivePlainId } from "../utils/plain-id.ts";

/**
 * Resolves {{var:...}} placeholders in content using license frontmatter.
 */
function resolveTemplateVars(
  content: string,
  data: Record<string, any>,
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

export default function exportsIntegration(): AstroIntegration {
  return {
    name: "plainlicense-exports",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = dir.pathname;
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

        // Manifest accumulator
        const manifest: Record<
          string,
          {
            plainId: string;
            currentVersion: string;
            versions: string[];
            formats: string[];
          }
        > = {};

        // Walk content/licenses/ and generate exports
        async function walk(dir: string) {
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

              // Inject template blocks and resolve variables
              content = content.replace(
                /\{\{block:([a-z0-9-]+)\}\}/g,
                (match, id) => {
                  return templateBlocks[id] || match;
                },
              );
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

              const ctx: ExportContext = {
                licenseId: data.spdx_id,
                plainId,
                version,
                content,
                metadata: data,
                outputDir: exportDir,
              };

              await orchestrator.generateAll(ctx);

              // Generate "latest" alias copies
              const latestDir = path.join(
                outDir,
                "exports",
                spdxLower,
                "latest",
              );
              await fs.mkdir(latestDir, { recursive: true });

              const exportedFiles = await fs
                .readdir(exportDir)
                .catch(() => [] as string[]);
              for (const file of exportedFiles) {
                // Strip the version from the filename: Plain-MIT-0.2.5.pdf → Plain-MIT.pdf
                const latestFileName = file.replace(/-\d+\.\d+\.\d+/, "");
                await fs.copyFile(
                  path.join(exportDir, file),
                  path.join(latestDir, latestFileName),
                );
              }

              // Generate exports for past tagged versions
              const taggedVersions = getTaggedVersions(data.spdx_id);
              for (const tv of taggedVersions) {
                // Skip if this is the current version (already generated above)
                if (tv.version === version) continue;

                // Get the relative path of this license file from repo root
                const relPath = path.relative(path.resolve("."), fullPath);
                const pastContent = getFileAtCommit(tv.commitRef, relPath);
                if (!pastContent) {
                  logger.warn(
                    `Could not read ${relPath} at ${tv.commitRef} for ${data.spdx_id}@${tv.version}`,
                  );
                  continue;
                }

                let { data: pastData, content: pastBody } = matter(pastContent);

                // Inject template blocks and resolve variables (use current blocks — past blocks may not exist)
                pastBody = pastBody.replace(
                  /\{\{block:([a-z0-9-]+)\}\}/g,
                  (match, id) => {
                    return templateBlocks[id] || match;
                  },
                );
                pastBody = resolveTemplateVars(pastBody, pastData);

                const pastPlainId =
                  pastData.plain_id || derivePlainId(data.spdx_id);
                const pastExportDir = path.join(
                  outDir,
                  "exports",
                  spdxLower,
                  tv.version,
                );

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

              // Add to manifest
              const allVersions = [
                version,
                ...taggedVersions.map((tv) => tv.version),
              ]
                .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicate
                .sort((a, b) =>
                  b.localeCompare(a, undefined, { numeric: true }),
                ); // newest first

              manifest[spdxLower] = {
                plainId,
                currentVersion: version,
                versions: allVersions,
                formats: ["gfm.md", "cm.md", "txt", "pdf", "xml", "embed.html"],
              };
            }
          }
        }

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

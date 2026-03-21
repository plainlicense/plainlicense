import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";

const distExports = path.resolve("dist/exports");
const hasBuildOutput = await fs
  .access(distExports)
  .then(() => true)
  .catch(() => false);

/**
 * SC-006: Professional PDF Generation.
 * Verification: PDF files exist and contain expected branding/attribution.
 *
 * Requires `mise run build` to have been run first.
 */
describe("SC-006: PDF Generation Quality", () => {
  it.skipIf(!hasBuildOutput)(
    "generated PDF files contain expected keywords",
    async () => {
      const pdfPath = path.resolve(
        "dist/exports/mit/0.2.1/Plain-MIT-0.2.1.pdf",
      );
      const exists = await fs
        .access(pdfPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      const result = spawnSync("strings", [pdfPath]);
      const output = result.stdout.toString();

      expect(output).toContain("Plain MIT License");
    },
  );

  it.skipIf(!hasBuildOutput)(
    "all published licenses have a PDF export",
    async () => {
      const baseDir = path.resolve("content/licenses");
      const categories = await fs.readdir(baseDir);

      for (const category of categories) {
        const categoryPath = path.join(baseDir, category);
        if (!(await fs.stat(categoryPath)).isDirectory()) continue;

        const files = (await fs.readdir(categoryPath)).filter((f) =>
          f.endsWith(".md"),
        );
        for (const file of files) {
          const { data } = matter(
            await fs.readFile(path.join(categoryPath, file), "utf8"),
          );
          if (data.status !== "published") continue;

          const slug = data.spdx_id.trim().toLowerCase();
          const version = data.plain_version.trim();
          const exportDir = path.resolve(`dist/exports/${slug}/${version}`);
          const dirExists = await fs
            .access(exportDir)
            .then(() => true)
            .catch(() => false);
          expect(dirExists).toBe(true);

          if (dirExists) {
            const exportFiles = await fs.readdir(exportDir);
            const pdfExists = exportFiles.some((f) =>
              f.toLowerCase().endsWith(".pdf"),
            );
            expect(pdfExists).toBe(true);
          }
        }
      }
    },
  );
});

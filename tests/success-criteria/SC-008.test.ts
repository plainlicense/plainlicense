import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const manifestPath = path.resolve("dist/exports/manifest.json");
const hasManifest = await fs
  .access(manifestPath)
  .then(() => true)
  .catch(() => false);

/**
 * SC-008: Version History Access.
 * Verification: Export manifest correctly references existing export files.
 *
 * Requires `mise run build` to have been run first.
 */
describe("SC-008: Version History Access", () => {
  it.skipIf(!hasManifest)(
    "export manifest entries point to real export directories",
    async () => {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

      for (const [spdxKey, entry] of Object.entries(manifest) as [
        string,
        any,
      ][]) {
        for (const version of entry.versions) {
          const exportDir = path.resolve(`dist/exports/${spdxKey}/${version}`);
          const dirExists = await fs
            .access(exportDir)
            .then(() => true)
            .catch(() => false);
          if (!dirExists) {
            console.error(`Missing export directory: ${spdxKey}@${version}`);
          }
          expect(dirExists).toBe(true);
        }
      }
    },
  );
});

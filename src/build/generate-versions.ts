import fs from "node:fs/promises";
import path from "node:path";

/**
 * Generates a unified versions.json file from all packages/ directory package.json files.
 * This ensures a single source of truth for license versions and prevents version drift.
 */
export async function generateVersionsJson() {
  const packagesDir = path.resolve("packages");
  const outputDir = path.resolve("content/config");
  const versions: Record<string, string> = {};

  try {
    const entries = await fs.readdir(packagesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pkgJsonPath = path.join(packagesDir, entry.name, "package.json");
        try {
          const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf8"));
          if (pkgJson.name && pkgJson.version) {
            // Map the package name (or part of it) to its version
            const licenseId = entry.name;
            versions[licenseId] = pkgJson.version;
          }
        } catch (_e) {
          // Skip directories without a valid package.json
        }
      }
    }

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(
      path.join(outputDir, "versions.json"),
      JSON.stringify(versions, null, 2),
    );
    console.log("Successfully generated versions.json");
  } catch (error) {
    console.error("Error generating versions.json:", error);
    process.exit(1);
  }
}

// Run if direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  generateVersionsJson();
}

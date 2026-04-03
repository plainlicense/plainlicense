import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  calculateGunningFog,
  countShameWords,
  extractOriginalSection,
  extractPlainSection,
} from "../utils/content";

/**
 * Updates readability metrics (Gunning Fog, shame words) in license frontmatter.
 * Calculates metrics for both the plain-language section and the original license text.
 * This is run as part of the build pipeline to ensure metrics are current.
 */
async function updateMetrics() {
  const licensesDir = path.resolve("content/licenses");

  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith(".md")) {
        const fileContent = await fs.readFile(fullPath, "utf8");
        const { data, content } = matter(fileContent);

        // Only measure the plain-language section, not the original license text
        const plainContent = extractPlainSection(content);
        const newPlainFog = calculateGunningFog(plainContent);
        const newShameCount = countShameWords(plainContent);

        // Calculate Gunning Fog for the original license text (if present)
        const originalContent = extractOriginalSection(content);
        const newOriginalFog =
          originalContent.length > 0
            ? calculateGunningFog(originalContent)
            : undefined;

        const currentOriginalFog = data.original?.gunning_fog;
        const needsUpdate =
          data.plain_gunning_fog !== newPlainFog ||
          data.shame_words_count !== newShameCount ||
          currentOriginalFog !== newOriginalFog;

        if (needsUpdate) {
          data.plain_gunning_fog = newPlainFog;
          data.shame_words_count = newShameCount;

          if (newOriginalFog !== undefined) {
            if (!data.original) {
              data.original = {};
            }
            data.original.gunning_fog = newOriginalFog;
          } else if (data.original && "gunning_fog" in data.original) {
            delete data.original.gunning_fog;
            if (Object.keys(data.original).length === 0) {
              delete data.original;
            }
          }

          const newFileContent = matter.stringify(content, data);
          await fs.writeFile(fullPath, newFileContent);
          const fogInfo =
            newOriginalFog !== undefined
              ? `Plain Fog ${newPlainFog}, Original Fog ${newOriginalFog}, Shame ${newShameCount}`
              : `Plain Fog ${newPlainFog}, Shame ${newShameCount}`;
          console.log(`Updated metrics for ${entry.name}: ${fogInfo}`);
        }
      }
    }
  };

  try {
    await walk(licensesDir);
    console.log("Metrics update complete.");
  } catch (error) {
    console.error("Error during metrics update:", error);
    process.exit(1);
  }
}

updateMetrics();

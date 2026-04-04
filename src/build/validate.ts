import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

/**
 * Validates all markdown content files in content/ directory.
 * Ensures minimum body length and other requirements.
 */
async function validateAllContent() {
  const contentDir = path.resolve("content");
  let errors = 0;

  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith(".md")) {
        const fileContent = await fs.readFile(fullPath, "utf8");
        const { content } = matter(fileContent);

        const relativePath = path.relative(contentDir, fullPath);

        if (relativePath.startsWith("licenses/")) {
          if (content.trim().length < 100) {
            console.error(
              `[VALIDATION ERROR] License ${relativePath} body too short: ${content.length} chars (min 100)`,
            );
            errors++;
          }
        } else if (
          relativePath.startsWith("blog/") &&
          content.trim().length < 200
        ) {
          console.error(
            `[VALIDATION ERROR] Blog post ${relativePath} body too short: ${content.length} chars (min 200)`,
          );
          errors++;
        }
      }
    }
  };

  try {
    await walk(contentDir);
    if (errors > 0) {
      console.error(`Validation failed with ${errors} errors.`);
      process.exit(1);
    }
    console.log("All content files validated successfully.");
  } catch (error) {
    console.error("Error during validation:", error);
    process.exit(1);
  }
}

validateAllContent();

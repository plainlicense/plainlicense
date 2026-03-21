import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";

/**
 * SC-011: OG Image Generation.
 * Verification: 100% of published licenses have an OG image in public/og/.
 */
describe("SC-011: OG Image Generation", () => {
  it("all published licenses have a corresponding PNG in public/og/", async () => {
    const baseDir = path.resolve("content/licenses");
    const ogDir = path.resolve("public/og");
    const categories = await fs.readdir(baseDir);
    let totalPublished = 0;
    let totalImagesFound = 0;

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

        if (data.status === "published") {
          totalPublished++;
          const slug = data.spdx_id.trim().toLowerCase();
          const imagePath = path.join(ogDir, `${slug}.png`);

          const exists = await fs
            .access(imagePath)
            .then(() => true)
            .catch(() => false);
          if (exists) {
            totalImagesFound++;

            // Basic validity check: size should be > 1KB
            const stats = await fs.stat(imagePath);
            expect(stats.size).toBeGreaterThan(1024);
          } else {
            console.error(`Missing OG image for ${slug}`);
          }
          expect(exists).toBe(true);
        }
      }
    }

    expect(totalPublished).toBeGreaterThan(0);
    expect(totalImagesFound).toBe(totalPublished);
  });
});

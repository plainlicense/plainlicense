import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * SC-015: Concurrent Editing.
 * Verification: CMS is configured with a Git-based backend which provides
 * natural conflict resolution and versioning.
 */
describe("SC-015: CMS Conflict Prevention", () => {
  it("CMS configuration uses a Git-based backend", async () => {
    const configPath = path.resolve("cmsconfig/index.ts");
    const content = await fs.readFile(configPath, "utf8");

    // Verify backend is GitHub (Git-based) — backend config is in cmsconfig/index.ts
    expect(content).toContain('name: "github"');
    expect(content).toContain('repo: "plainlicense/plainlicense"');
  });
});

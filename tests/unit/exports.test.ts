import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMarkdown } from "../../src/build/exports/markdown.ts";
import { generatePlaintext } from "../../src/build/exports/plaintext.ts";

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(""),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  readFile: vi.fn().mockResolvedValue(""),
}));

describe("Export Generators", () => {
  const ctx = {
    licenseId: "MIT",
    plainId: "Plain-MIT",
    version: "1.0.0",
    content: "# MIT License\n\nContent here.",
    metadata: { slug: "mit", title: "MIT License" },
    outputDir: "/tmp/exports/mit/1.0.0",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateMarkdown", () => {
    it("should write GFM markdown file with header", async () => {
      await generateMarkdown(ctx);

      expect(fs.mkdir).toHaveBeenCalledWith(ctx.outputDir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(ctx.outputDir, "Plain-MIT-1.0.0.gfm.md"),
        expect.stringContaining("Plain License: Plain-MIT 1.0.0"),
      );
    });

    it("should write CommonMark markdown file without GFM header", async () => {
      await generateMarkdown(ctx);

      const cmCall = (fs.writeFile as any).mock.calls.find(
        ([filePath]: [string]) =>
          filePath === path.join(ctx.outputDir, "Plain-MIT-1.0.0.cm.md"),
      );
      expect(cmCall).toBeDefined();
      const [, cmContent] = cmCall as [string, string];
      expect(cmContent).toContain("Content here.");
      expect(cmContent).not.toContain("Plain License:");
    });
  });

  describe("generatePlaintext", () => {
    it("should write plaintext file without markdown", async () => {
      await generatePlaintext(ctx);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(ctx.outputDir, "Plain-MIT-1.0.0.txt"),
        expect.stringContaining("MIT LICENSE"),
      );
      // Verify markdown # was removed
      const call = (fs.writeFile as any).mock.calls.find((c: any) =>
        c[0].endsWith(".txt"),
      );
      expect(call?.[1]).not.toContain("# MIT");
    });
  });
});

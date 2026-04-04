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
  /** Basic context without semantic blocks */
  const ctx = {
    licenseId: "MIT",
    plainId: "Plain-MIT",
    version: "1.0.0",
    content: "# MIT License\n\nContent here.",
    metadata: { slug: "mit", title: "MIT License" },
    outputDir: "/tmp/exports/mit/1.0.0",
  };

  /** Context with semantic warranty and interpretation blocks, divs, and footnotes */
  const richContent = [
    "# MIT License",
    "",
    '<div id="plain-permissions">',
    "You may use the work.",
    "</div>",
    "",
    "<!-- semantic:warranty -->\nThis software has no warranty.\n<!-- /semantic:warranty -->",
    "",
    "<!-- semantic:interpretation -->\nRead this license carefully.\n<!-- /semantic:interpretation -->",
    "",
    "Some text[^1] and more[^2].",
    "",
    "`we`",
    "",
    ":    The creators of the work.",
    "",
    "[^1]: First note",
    "[^2]: Second note",
  ].join("\n");

  const richCtx = {
    licenseId: "MIT",
    plainId: "Plain-MIT",
    version: "1.0.0",
    content: richContent,
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

    it("GFM output contains > [!CAUTION] for warranty blocks", async () => {
      await generateMarkdown(richCtx);

      const gfmCall = (fs.writeFile as any).mock.calls.find(
        ([p]: [string]) => p.endsWith(".gfm.md"),
      );
      expect(gfmCall).toBeDefined();
      const [, gfmContent] = gfmCall as [string, string];
      expect(gfmContent).toContain("> [!CAUTION]");
      expect(gfmContent).toContain("> This software has no warranty.");
    });

    it("GFM output contains > [!NOTE] for interpretation blocks", async () => {
      await generateMarkdown(richCtx);

      const gfmCall = (fs.writeFile as any).mock.calls.find(
        ([p]: [string]) => p.endsWith(".gfm.md"),
      );
      expect(gfmCall).toBeDefined();
      const [, gfmContent] = gfmCall as [string, string];
      expect(gfmContent).toContain("> [!NOTE]");
      expect(gfmContent).toContain("> Read this license carefully.");
    });

    it("GFM output doesn't contain <div tags", async () => {
      await generateMarkdown(richCtx);

      const gfmCall = (fs.writeFile as any).mock.calls.find(
        ([p]: [string]) => p.endsWith(".gfm.md"),
      );
      expect(gfmCall).toBeDefined();
      const [, gfmContent] = gfmCall as [string, string];
      expect(gfmContent).not.toContain("<div");
    });

    it("GFM output preserves footnotes as-is for native GitHub rendering", async () => {
      await generateMarkdown(richCtx);

      const gfmCall = (fs.writeFile as any).mock.calls.find(
        ([p]: [string]) => p.endsWith(".gfm.md"),
      );
      expect(gfmCall).toBeDefined();
      const [, gfmContent] = gfmCall as [string, string];
      expect(gfmContent).toContain("[^1]");
      expect(gfmContent).toContain("[^2]");
    });

    it("CM output contains > **Caution:** for warranty blocks", async () => {
      await generateMarkdown(richCtx);

      const cmCall = (fs.writeFile as any).mock.calls.find(
        ([p]: [string]) => p.endsWith(".cm.md"),
      );
      expect(cmCall).toBeDefined();
      const [, cmContent] = cmCall as [string, string];
      expect(cmContent).toContain("> **Caution:**");
      expect(cmContent).toContain("This software has no warranty.");
    });

    it("CM output contains > **Note:** for interpretation blocks", async () => {
      await generateMarkdown(richCtx);

      const cmCall = (fs.writeFile as any).mock.calls.find(
        ([p]: [string]) => p.endsWith(".cm.md"),
      );
      expect(cmCall).toBeDefined();
      const [, cmContent] = cmCall as [string, string];
      expect(cmContent).toContain("> **Note:**");
      expect(cmContent).toContain("Read this license carefully.");
    });

    it("CM output doesn't contain <div tags", async () => {
      await generateMarkdown(richCtx);

      const cmCall = (fs.writeFile as any).mock.calls.find(
        ([p]: [string]) => p.endsWith(".cm.md"),
      );
      expect(cmCall).toBeDefined();
      const [, cmContent] = cmCall as [string, string];
      expect(cmContent).not.toContain("<div");
    });

    it("CM output converts footnotes to inline notes", async () => {
      await generateMarkdown(richCtx);

      const cmCall = (fs.writeFile as any).mock.calls.find(
        ([p]: [string]) => p.endsWith(".cm.md"),
      );
      expect(cmCall).toBeDefined();
      const [, cmContent] = cmCall as [string, string];
      expect(cmContent).toContain("*(Note:");
      expect(cmContent).not.toContain("[^1]");
    });

    it("CM output converts definition lists to bold term format", async () => {
      await generateMarkdown(richCtx);

      const cmCall = (fs.writeFile as any).mock.calls.find(
        ([p]: [string]) => p.endsWith(".cm.md"),
      );
      expect(cmCall).toBeDefined();
      const [, cmContent] = cmCall as [string, string];
      expect(cmContent).toContain("**we** \u2014 The creators of the work.");
    });

    it("GFM output uses license_family in attribution URL when available", async () => {
      const ctxWithFamily = {
        ...ctx,
        metadata: { ...ctx.metadata, license_family: "permissive" },
      };
      await generateMarkdown(ctxWithFamily);

      const gfmCall = (fs.writeFile as any).mock.calls.find(
        ([p]: [string]) => p.endsWith(".gfm.md"),
      );
      expect(gfmCall).toBeDefined();
      const [, gfmContent] = gfmCall as [string, string];
      expect(gfmContent).toContain("permissive/mit");
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

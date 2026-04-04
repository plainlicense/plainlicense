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
    /** Helper to get the .txt file content from mock calls */
    function getTxtContent(): string {
      const call = (fs.writeFile as any).mock.calls.find((c: any) =>
        c[0].endsWith(".txt"),
      );
      expect(call).toBeDefined();
      return call[1] as string;
    }

    it("should write plaintext file with header and attribution", async () => {
      await generatePlaintext(ctx);

      const content = getTxtContent();
      expect(content).toContain("Plain License: Plain-MIT 1.0.0");
      expect(content).toContain("Attribution:");
      expect(content).toContain("========================================");
    });

    it("should uppercase headers and add underlines", async () => {
      await generatePlaintext({
        ...ctx,
        content: "# Main Title\n\n## Section Two\n\n### Sub Section\n\nBody text.",
      });

      const content = getTxtContent();
      expect(content).toContain("MAIN TITLE\n==========");
      expect(content).toContain("SECTION TWO\n-----------");
      expect(content).toContain("SUB SECTION\n");
      // H3 should NOT have underline
      expect(content).not.toMatch(/SUB SECTION\n[=-]+/);
    });

    it("should preserve link URLs for http links", async () => {
      await generatePlaintext({
        ...ctx,
        content: "Visit [Plain License](https://plainlicense.org) for details.",
      });

      const content = getTxtContent();
      expect(content).toContain("Plain License (https://plainlicense.org)");
    });

    it("should strip link URLs for relative links", async () => {
      await generatePlaintext({
        ...ctx,
        content: "See [the section](/about) for more.",
      });

      const content = getTxtContent();
      expect(content).toContain("the section");
      expect(content).not.toContain("/about");
    });

    it("should strip bold and italic markers", async () => {
      await generatePlaintext({
        ...ctx,
        content: "This is **bold** and *italic* text.",
      });

      const content = getTxtContent();
      expect(content).toContain("bold");
      expect(content).toContain("italic");
      expect(content).not.toContain("**");
      expect(content).not.toContain("*italic*");
    });

    it("should strip HTML divs", async () => {
      await generatePlaintext({
        ...ctx,
        content: '<div id="permissions">\n\nSome content.\n\n</div>',
      });

      const content = getTxtContent();
      expect(content).toContain("Some content.");
      expect(content).not.toContain("<div");
      expect(content).not.toContain("</div>");
    });

    it("should render warranty as plaintext box", async () => {
      await generatePlaintext({
        ...ctx,
        content:
          "Before.\n\n<!-- semantic:warranty -->\nNo warranty is given.\n<!-- /semantic:warranty -->\n\nAfter.",
      });

      const content = getTxtContent();
      expect(content).toContain("********************************************");
      expect(content).toContain("*** NO WARRANTY ***");
      expect(content).toContain("No warranty is given.");
    });

    it("should render interpretation as NOTE box", async () => {
      await generatePlaintext({
        ...ctx,
        content:
          "Before.\n\n<!-- semantic:interpretation -->\nHow to read this.\n<!-- /semantic:interpretation -->\n\nAfter.",
      });

      const content = getTxtContent();
      expect(content).toContain("*** NOTE ***");
    });

    it("should convert footnotes to endnotes", async () => {
      await generatePlaintext({
        ...ctx,
        content: "Some text[^1] here.\n\n[^1]: This is the first note.",
      });

      const content = getTxtContent();
      expect(content).toContain("[1]");
      expect(content).toContain("Notes");
      expect(content).toContain("[1] This is the first note.");
      // Footnote definition should be removed from body
      expect(content).not.toContain("[^1]:");
    });

    it("should not render Notes section when no endnotes", async () => {
      await generatePlaintext(ctx);

      const content = getTxtContent();
      expect(content).not.toContain("Notes\n");
    });

    it("should indent blockquotes with 4 spaces", async () => {
      await generatePlaintext({
        ...ctx,
        content: "> This is a blockquote.\n> Second line.",
      });

      const content = getTxtContent();
      expect(content).toContain("    This is a blockquote.");
    });

    it("should convert HR to line of equals signs", async () => {
      await generatePlaintext({
        ...ctx,
        content: "Before.\n\n---\n\nAfter.",
      });

      const content = getTxtContent();
      // Count occurrences - header has one, body should have another
      const matches = content.match(/========================================/g);
      expect(matches).toBeDefined();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });

    it("should convert definition lists", async () => {
      await generatePlaintext({
        ...ctx,
        content: "`we`\n\n:    The creators of the work.",
      });

      const content = getTxtContent();
      expect(content).toContain("WE \u2014 The creators of the work.");
    });

    it("should strip code fences but keep content", async () => {
      await generatePlaintext({
        ...ctx,
        content: "```\nsome code here\n```",
      });

      const content = getTxtContent();
      expect(content).toContain("some code here");
      expect(content).not.toContain("```");
    });

    it("should render unordered lists with dashes", async () => {
      await generatePlaintext({
        ...ctx,
        content: "- First item\n- Second item\n- Third item",
      });

      const content = getTxtContent();
      expect(content).toContain("- First item");
      expect(content).toContain("- Second item");
    });

    it("should render ordered lists with numbers", async () => {
      await generatePlaintext({
        ...ctx,
        content: "1. First item\n2. Second item\n3. Third item",
      });

      const content = getTxtContent();
      expect(content).toContain("1. First item");
      expect(content).toContain("2. Second item");
    });

    it("should strip inline code backticks", async () => {
      await generatePlaintext({
        ...ctx,
        content: "Use the `foo` command.",
      });

      const content = getTxtContent();
      expect(content).toContain("foo");
      expect(content).not.toMatch(/`foo`/);
    });

    it("should use license_family in attribution URL", async () => {
      await generatePlaintext({
        ...ctx,
        metadata: { ...ctx.metadata, license_family: "permissive" },
      });

      const content = getTxtContent();
      expect(content).toContain("permissive/mit");
    });
  });
});

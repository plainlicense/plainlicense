# Format-Specific Export Transforms Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make each export format (GFM, CommonMark, plaintext) exploit its medium's unique features instead of emitting near-identical content.

**Architecture:** Hybrid approach — regex-based composable transform pipelines for GFM/CM (markdown-to-markdown), AST-based renderer using `marked.lexer` for plaintext (markdown-to-text). Semantic block markers injected during template processing let format renderers detect warranty/interpretation sections without fragile content matching.

**Tech Stack:** `marked` ^17 (already a dependency), Vitest 4, Bun, TypeScript.

---

## Background

### Current State

- **GFM vs CM**: Identical content. GFM adds an HTML comment header. That's the only difference.
- **Plaintext**: 4 regex rules strip bold, italic, links (losing URLs entirely), and uppercase headers. Footnotes, definition lists, `<div>` tags, code fences, blockquotes, and horizontal rules all pass through raw.
- **Semantic sections**: Warranty and interpretation template blocks are injected as plain text with no format-aware treatment.

### Content Features Present in Licenses

| Feature | Files | Example |
|---|---|---|
| Footnotes `[^n]` | MPL, Elastic | `[^1]: Fair use explanation...` |
| Definition lists `` `term`\n:    def `` | MPL, Elastic | `` `we`\n:    The people who created the work `` |
| HTML `<div>` wrappers | MIT | `<div id="plain-permissions">` |
| Blockquotes `>` | MPL original text | Warranty/liability disclaimers |
| Code blocks | MPL | Notice templates in fenced blocks |
| Template blocks | All | `{{block:warranty}}`, `{{block:interpretation}}` |
| Reference-style links | Elastic | `[selflink]`, `[spdx-guide]` |

### Target Format Capabilities

| Element | GFM | CommonMark | Plaintext |
|---|---|---|---|
| Warranty block | `> [!CAUTION]` alert | `> **Caution:**` blockquote | `*** NO WARRANTY ***` box |
| Interpretation block | `> [!NOTE]` alert | `> **Note:**` blockquote | `--- NOTE ---` section |
| Footnotes | Native `[^n]` (passthrough) | Inline parenthetical or endnotes | Numbered endnotes `[1]` |
| Definition lists | `**term** — definition` | `**term** — definition` | `TERM — definition` |
| HTML divs | Strip | Strip | Strip |
| Links | Keep `[text](url)` | Keep `[text](url)` | `text (url)` |
| Bold | Keep `**text**` | Keep `**text**` | `text` (strip markers) |
| Italic | Keep `*text*` | Keep `*text*` | `text` (strip markers) |
| Code spans | Keep `` `code` `` | Keep `` `code` `` | `code` (strip backticks) |
| Code fences | Keep | Keep | Content only, no fences |
| Blockquotes | Keep `>` | Keep `>` | `    ` (4-space indent) |
| HR `---` | Keep | Keep | `========================================` |

---

## File Map

```
src/build/exports/
  transforms.ts      <- NEW: shared + format-specific transform functions
  markdown.ts        <- REWRITE: GFM and CM get separate pipelines
  plaintext.ts       <- REWRITE: AST-based renderer using marked.lexer
  index.ts           <- MINOR: pass semantic markers through to generators
  pdf.ts             <- NO CHANGE (already AST-based, works well)

src/integrations/
  exports.ts         <- MODIFY: wrap injected blocks with semantic markers

tests/unit/
  export-transforms.test.ts  <- NEW: unit tests for all transform functions
  exports.test.ts             <- UPDATE: adapt to new output expectations
```

---

## Task 1: Add Semantic Block Markers During Template Injection

**Files:**
- Modify: `src/integrations/exports.ts:36-43` (`injectTemplateBlocks` function)

**Why:** Format generators need to know *which* template block they're looking at to apply semantic formatting (warranty -> caution alert, interpretation -> note). Currently blocks are injected as raw text with no metadata.

**Step 1: Write the failing test**

Create `tests/unit/export-transforms.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

describe("Semantic Block Markers", () => {
  it("should wrap warranty block content with semantic markers", () => {
    const content = "Some text\n\n{{block:warranty}}\n\nMore text";
    const blocks = { warranty: "\nWarranty content here.\n" };

    // After injection, markers should surround block content
    const result = injectTemplateBlocks(content, blocks);
    expect(result).toContain("<!-- semantic:warranty -->");
    expect(result).toContain("Warranty content here.");
    expect(result).toContain("<!-- /semantic:warranty -->");
  });

  it("should wrap interpretation block with semantic markers", () => {
    const content = "{{block:interpretation}}";
    const blocks = { interpretation: "\nInterpretation content.\n" };

    const result = injectTemplateBlocks(content, blocks);
    expect(result).toContain("<!-- semantic:interpretation -->");
    expect(result).toContain("<!-- /semantic:interpretation -->");
  });

  it("should not add markers for unknown block IDs", () => {
    const content = "{{block:custom}}";
    const blocks = { custom: "\nCustom content.\n" };

    const result = injectTemplateBlocks(content, blocks);
    expect(result).not.toContain("<!-- semantic:");
    expect(result).toContain("Custom content.");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/export-transforms.test.ts`
Expected: FAIL -- `injectTemplateBlocks` not imported / markers not present.

**Step 3: Modify `injectTemplateBlocks` in `src/integrations/exports.ts`**

The semantic block IDs that get special treatment:

```typescript
const SEMANTIC_BLOCK_IDS = new Set(["warranty", "interpretation"]);

function injectTemplateBlocks(
  content: string,
  templateBlocks: Record<string, string>,
): string {
  return content.replace(/\{\{block:([a-z0-9-]+)\}\}/g, (match, id) => {
    const blockContent = templateBlocks[id];
    if (!blockContent) return match;
    if (SEMANTIC_BLOCK_IDS.has(id)) {
      return `\n<!-- semantic:${id} -->\n${blockContent}\n<!-- /semantic:${id} -->\n`;
    }
    return blockContent;
  });
}
```

Export `SEMANTIC_BLOCK_IDS` and `injectTemplateBlocks` so tests can import them. Move them to `src/build/exports/transforms.ts` or export from integrations -- whatever keeps the import graph clean. The integration file currently defines `injectTemplateBlocks` as a module-level function; extracting it to transforms.ts is cleaner since the test file and format generators both need it.

**Step 4: Run test to verify it passes**

Run: `bunx vitest run tests/unit/export-transforms.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat(infra): add semantic markers to template block injection
```

---

## Task 2: Create Shared Transform Utilities

**Files:**
- Create: `src/build/exports/transforms.ts`
- Test: `tests/unit/export-transforms.test.ts` (extend)

**Why:** Both GFM and CM generators need shared transforms (strip divs, extract semantic blocks, handle footnotes). These are pure functions, trivially testable.

**Step 1: Write failing tests for shared transforms**

Add to `tests/unit/export-transforms.test.ts`:

```typescript
import {
  stripHtmlDivs,
  extractSemanticBlocks,
  convertFootnotesToEndnotes,
  convertDefinitionLists,
} from "../../src/build/exports/transforms";

describe("stripHtmlDivs", () => {
  it("should remove opening and closing div tags", () => {
    const input = '<div id="plain-permissions">\n\nContent here.\n\n</div>';
    expect(stripHtmlDivs(input)).toBe("\n\nContent here.\n\n");
  });

  it("should handle multiple divs", () => {
    const input = '<div id="a">\nA\n</div>\n<div id="b">\nB\n</div>';
    const result = stripHtmlDivs(input);
    expect(result).not.toContain("<div");
    expect(result).not.toContain("</div>");
    expect(result).toContain("A");
    expect(result).toContain("B");
  });

  it("should leave non-div HTML alone", () => {
    const input = '<a href="http://example.com">link</a>';
    expect(stripHtmlDivs(input)).toBe(input);
  });
});

describe("extractSemanticBlocks", () => {
  it("should extract warranty block content and markers", () => {
    const input =
      "Before\n\n<!-- semantic:warranty -->\nWarranty text.\n<!-- /semantic:warranty -->\n\nAfter";
    const result = extractSemanticBlocks(input);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].id).toBe("warranty");
    expect(result.blocks[0].content).toContain("Warranty text.");
  });

  it("should extract multiple blocks", () => {
    const input =
      "<!-- semantic:warranty -->\nW\n<!-- /semantic:warranty -->\n\n<!-- semantic:interpretation -->\nI\n<!-- /semantic:interpretation -->";
    const result = extractSemanticBlocks(input);
    expect(result.blocks).toHaveLength(2);
  });

  it("should return stripped content without markers", () => {
    const input =
      "Before\n\n<!-- semantic:warranty -->\nW\n<!-- /semantic:warranty -->\n\nAfter";
    const result = extractSemanticBlocks(input);
    // The stripped content has a placeholder
    expect(result.content).not.toContain("<!-- semantic:");
  });
});

describe("convertFootnotesToEndnotes", () => {
  it("should collect definitions and replace refs with [n]", () => {
    const input =
      "Some text[^1] and more[^2].\n\n[^1]: First note.\n\n[^2]: Second note.";
    const result = convertFootnotesToEndnotes(input);
    expect(result.content).toContain("[1]");
    expect(result.content).toContain("[2]");
    expect(result.content).not.toContain("[^1]");
    expect(result.endnotes).toHaveLength(2);
    expect(result.endnotes[0]).toContain("First note.");
  });

  it("should handle content with no footnotes", () => {
    const input = "No footnotes here.";
    const result = convertFootnotesToEndnotes(input);
    expect(result.content).toBe(input);
    expect(result.endnotes).toHaveLength(0);
  });
});

describe("convertDefinitionLists", () => {
  it("should convert definition list to bold-dash format", () => {
    const input = "`we`\n\n:    The people who created the work";
    const result = convertDefinitionLists(input, "markdown");
    expect(result).toContain("**we**");
    expect(result).toContain("The people who created the work");
  });

  it("should convert definition list to plaintext format", () => {
    const input = "`the work`\n\n:    The materials covered by this license";
    const result = convertDefinitionLists(input, "plaintext");
    expect(result).toContain("THE WORK");
    expect(result).toContain("The materials covered by this license");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bunx vitest run tests/unit/export-transforms.test.ts`
Expected: FAIL -- functions don't exist yet.

**Step 3: Implement `src/build/exports/transforms.ts`**

```typescript
/**
 * Composable content transforms for format-specific export generation.
 * Pure functions: string -> string (or structured output).
 */

// -- Semantic block IDs that receive special formatting --

export const SEMANTIC_BLOCK_IDS = new Set(["warranty", "interpretation"]);

// -- Types --

export interface SemanticBlock {
  id: string;
  content: string;
  raw: string; // full match including markers
}

export interface ExtractedBlocks {
  content: string; // content with blocks replaced by {{rendered:id}} placeholders
  blocks: SemanticBlock[];
}

export interface FootnoteResult {
  content: string;
  endnotes: string[];
}

// -- Template block injection (moved from integrations/exports.ts) --

export function injectTemplateBlocks(
  content: string,
  templateBlocks: Record<string, string>,
): string {
  return content.replace(/\{\{block:([a-z0-9-]+)\}\}/g, (match, id) => {
    const blockContent = templateBlocks[id];
    if (!blockContent) return match;
    if (SEMANTIC_BLOCK_IDS.has(id)) {
      return `\n<!-- semantic:${id} -->\n${blockContent}\n<!-- /semantic:${id} -->\n`;
    }
    return blockContent;
  });
}

// -- Shared transforms --

/** Strip HTML <div> and </div> tags, preserving inner content. */
export function stripHtmlDivs(content: string): string {
  return content
    .replace(/<div[^>]*>\n?/g, "")
    .replace(/<\/div>\n?/g, "");
}

/**
 * Extract semantic blocks from content, replacing them with
 * `{{rendered:id}}` placeholders for later format-specific injection.
 */
export function extractSemanticBlocks(content: string): ExtractedBlocks {
  const blocks: SemanticBlock[] = [];
  const regex =
    /<!-- semantic:([a-z-]+) -->\n([\s\S]*?)\n<!-- \/semantic:\1 -->/g;

  let result = content;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      id: match[1],
      content: match[2].trim(),
      raw: match[0],
    });
    result = result.replace(match[0], `{{rendered:${match[1]}}}`);
  }

  return { content: result, blocks };
}

/**
 * Extract footnote definitions and convert references from `[^n]` to `[n]`.
 * Returns endnotes array for appending to document.
 */
export function convertFootnotesToEndnotes(content: string): FootnoteResult {
  const definitions = new Map<string, string>();
  const defRegex = /^\[\^(\d+)\]:\s*(.+(?:\n(?!\[|\n).+)*)/gm;
  let match: RegExpExecArray | null;
  while ((match = defRegex.exec(content)) !== null) {
    definitions.set(match[1], match[2].trim());
  }

  if (definitions.size === 0) {
    return { content, endnotes: [] };
  }

  // Remove definition lines from content
  let result = content.replace(
    /^\[\^(\d+)\]:\s*(.+(?:\n(?!\[|\n).+)*)\n?/gm,
    "",
  );

  // Replace [^n] references with [n]
  result = result.replace(/\[\^(\d+)\]/g, "[$1]");

  // Build ordered endnotes
  const endnotes: string[] = [];
  for (const [num, text] of definitions) {
    endnotes.push(`[${num}] ${text}`);
  }
  endnotes.sort((a, b) => {
    const na = parseInt(a.match(/\[(\d+)\]/)![1]);
    const nb = parseInt(b.match(/\[(\d+)\]/)![1]);
    return na - nb;
  });

  return { content: result.replace(/\n{3,}/g, "\n\n"), endnotes };
}

/**
 * Convert markdown definition lists to the target format.
 *
 * Input format (from content):
 *   `term`
 *
 *   :    Definition text
 *
 * Output depends on mode:
 *   "markdown" -> **term** -- Definition text
 *   "plaintext" -> TERM -- Definition text
 */
export function convertDefinitionLists(
  content: string,
  mode: "markdown" | "plaintext",
): string {
  return content.replace(
    /`([^`]+)`\n\n?:[ ]{4}(.+(?:\n(?!`|\n:).+)*)/g,
    (_match, term, def) => {
      const definition = def.trim();
      if (mode === "plaintext") {
        return `${term.toUpperCase()} -- ${definition}`;
      }
      return `**${term}** -- ${definition}`;
    },
  );
}

// -- GFM-specific transforms --

/**
 * Convert a semantic block to a GFM alert.
 * warranty -> [!CAUTION], interpretation -> [!NOTE]
 */
export function semanticBlockToGfmAlert(block: SemanticBlock): string {
  const alertType =
    block.id === "warranty" ? "CAUTION" : "NOTE";
  const lines = block.content.split("\n");
  return `> [!${alertType}]\n${lines.map((l) => `> ${l}`).join("\n")}`;
}

// -- CM-specific transforms --

/**
 * Convert a semantic block to a CommonMark styled blockquote.
 * warranty -> "> **Caution:** ...", interpretation -> "> **Note:** ..."
 */
export function semanticBlockToCmBlockquote(block: SemanticBlock): string {
  const label = block.id === "warranty" ? "Caution" : "Note";
  const lines = block.content.split("\n");
  const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
  if (firstNonEmpty >= 0) {
    lines[firstNonEmpty] = `**${label}:** ${lines[firstNonEmpty]}`;
  }
  return lines.map((l) => `> ${l}`).join("\n");
}

/**
 * Convert GFM footnotes to inline parenthetical notes for CommonMark.
 * Replaces [^n] with (Note: ...) inline.
 */
export function footnotesToInline(content: string): string {
  const definitions = new Map<string, string>();
  const defRegex = /^\[\^(\d+)\]:\s*(.+(?:\n(?!\[|\n).+)*)/gm;
  let match: RegExpExecArray | null;
  while ((match = defRegex.exec(content)) !== null) {
    definitions.set(match[1], match[2].trim());
  }

  if (definitions.size === 0) return content;

  // Remove definition lines
  let result = content.replace(
    /^\[\^(\d+)\]:\s*(.+(?:\n(?!\[|\n).+)*)\n?/gm,
    "",
  );

  // Replace references with inline notes
  result = result.replace(/\[\^(\d+)\]/g, (_m, num) => {
    const note = definitions.get(num);
    return note ? `*(Note: ${note})*` : `[^${num}]`;
  });

  return result.replace(/\n{3,}/g, "\n\n");
}
```

**Step 4: Run tests**

Run: `bunx vitest run tests/unit/export-transforms.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat(infra): add composable export transform utilities
```

---

## Task 3: Rewrite GFM Generator

**Files:**
- Modify: `src/build/exports/markdown.ts`
- Test: `tests/unit/exports.test.ts` (update GFM expectations)

**Why:** GFM should use alerts for warranty/interpretation, strip HTML divs, and include its metadata header. Footnotes and definition lists pass through (GitHub renders both).

**Step 1: Write failing tests**

Update the GFM test in `tests/unit/exports.test.ts`:

```typescript
describe("generateMarkdown", () => {
  const ctxWithSemantics = {
    ...ctx,
    content:
      '# MIT License\n\n<div id="test">\n\nContent.\n\n</div>\n\n' +
      "<!-- semantic:warranty -->\nWarranty text.\n- No guarantees.\n<!-- /semantic:warranty -->\n\n" +
      "<!-- semantic:interpretation -->\nPlain language version note.\n<!-- /semantic:interpretation -->",
  };

  it("should convert warranty to GFM CAUTION alert", async () => {
    await generateMarkdown(ctxWithSemantics);
    const gfmCall = (fs.writeFile as any).mock.calls.find(
      ([p]: [string]) => p.endsWith(".gfm.md"),
    );
    expect(gfmCall[1]).toContain("> [!CAUTION]");
    expect(gfmCall[1]).toContain("> Warranty text.");
  });

  it("should convert interpretation to GFM NOTE alert", async () => {
    await generateMarkdown(ctxWithSemantics);
    const gfmCall = (fs.writeFile as any).mock.calls.find(
      ([p]: [string]) => p.endsWith(".gfm.md"),
    );
    expect(gfmCall[1]).toContain("> [!NOTE]");
    expect(gfmCall[1]).toContain("> Plain language version note.");
  });

  it("should strip HTML divs from GFM output", async () => {
    await generateMarkdown(ctxWithSemantics);
    const gfmCall = (fs.writeFile as any).mock.calls.find(
      ([p]: [string]) => p.endsWith(".gfm.md"),
    );
    expect(gfmCall[1]).not.toContain("<div");
    expect(gfmCall[1]).not.toContain("</div>");
  });

  it("should strip HTML divs from CM output", async () => {
    await generateMarkdown(ctxWithSemantics);
    const cmCall = (fs.writeFile as any).mock.calls.find(
      ([p]: [string]) => p.endsWith(".cm.md"),
    );
    expect(cmCall[1]).not.toContain("<div");
  });

  it("should convert semantic blocks to styled blockquotes in CM", async () => {
    await generateMarkdown(ctxWithSemantics);
    const cmCall = (fs.writeFile as any).mock.calls.find(
      ([p]: [string]) => p.endsWith(".cm.md"),
    );
    expect(cmCall[1]).toContain("> **Caution:**");
    expect(cmCall[1]).toContain("> **Note:**");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bunx vitest run tests/unit/exports.test.ts`

**Step 3: Rewrite `src/build/exports/markdown.ts`**

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import type { ExportContext } from "./index.ts";
import {
  convertDefinitionLists,
  extractSemanticBlocks,
  footnotesToInline,
  semanticBlockToCmBlockquote,
  semanticBlockToGfmAlert,
  stripHtmlDivs,
} from "./transforms.ts";
import { licenseUrl } from "../../utils/constants";

/** Apply GFM-specific transforms to content. */
function transformGfm(raw: string): string {
  let content = stripHtmlDivs(raw);

  const { content: stripped, blocks } = extractSemanticBlocks(content);
  content = stripped;

  for (const block of blocks) {
    content = content.replace(
      `{{rendered:${block.id}}}`,
      semanticBlockToGfmAlert(block),
    );
  }

  return content;
}

/** Apply CommonMark-specific transforms to content. */
function transformCm(raw: string): string {
  let content = stripHtmlDivs(raw);

  const { content: stripped, blocks } = extractSemanticBlocks(content);
  content = stripped;

  for (const block of blocks) {
    content = content.replace(
      `{{rendered:${block.id}}}`,
      semanticBlockToCmBlockquote(block),
    );
  }

  content = footnotesToInline(content);
  content = convertDefinitionLists(content, "markdown");

  return content;
}

/**
 * Generates GitHub-flavored and CommonMark markdown exports.
 */
export async function generateMarkdown(ctx: ExportContext) {
  const { plainId, version, content, metadata, outputDir } = ctx;
  const baseName = `${plainId}-${version}`;

  const slug = metadata.license_family
    ? `${metadata.license_family}/${ctx.licenseId.toLowerCase()}`
    : ctx.licenseId.toLowerCase();

  const gfmHeader =
    `<!-- Plain License: ${plainId} ${version} -->\n` +
    `<!-- Attribution: ${licenseUrl(slug)} -->\n\n`;
  const gfmContent = gfmHeader + transformGfm(content);

  const cmContent = transformCm(content);

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputDir, `${baseName}.gfm.md`), gfmContent),
    fs.writeFile(path.join(outputDir, `${baseName}.cm.md`), cmContent),
  ]);

  console.log(
    `Generated Markdown exports: ${baseName}.gfm.md, ${baseName}.cm.md`,
  );
}
```

**Step 4: Run tests**

Run: `bunx vitest run tests/unit/exports.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat(infra): add format-specific GFM alerts and CM blockquotes to markdown exports
```

---

## Task 4: Rewrite Plaintext Generator (AST-Based)

**Files:**
- Modify: `src/build/exports/plaintext.ts`
- Test: `tests/unit/exports.test.ts` (update plaintext expectations)

**Why:** The regex approach misses most markdown features. An AST walk (like the PDF generator already uses) handles nested structures correctly and preserves link URLs.

**Step 1: Write failing tests**

Add to `tests/unit/exports.test.ts`:

```typescript
describe("generatePlaintext", () => {
  const richCtx = {
    ...ctx,
    content: [
      "# License Title",
      "",
      "## Section One",
      "",
      "Here is **bold text** and *italic text*.",
      "",
      "Visit [Plain License](https://plainlicense.org) for details.",
      "",
      "> This is a blockquote.",
      "",
      "```markdown",
      "code example",
      "```",
      "",
      "---",
      "",
      '<div id="test">',
      "",
      "Inner content.",
      "",
      "</div>",
      "",
      "<!-- semantic:warranty -->",
      "We give you the work as it is.",
      "- No guarantees.",
      "<!-- /semantic:warranty -->",
      "",
      "Text with a footnote[^1].",
      "",
      "[^1]: This is the footnote text.",
      "",
      "`term`",
      "",
      ":    The definition of term.",
    ].join("\n"),
  };

  it("should uppercase headers with underlines", async () => {
    await generatePlaintext(richCtx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).toContain("LICENSE TITLE");
  });

  it("should preserve link URLs", async () => {
    await generatePlaintext(richCtx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).toContain("Plain License (https://plainlicense.org)");
  });

  it("should strip bold and italic markers", async () => {
    await generatePlaintext(richCtx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).toContain("bold text");
    expect(call[1]).not.toContain("**bold");
    expect(call[1]).not.toContain("*italic");
  });

  it("should strip HTML divs", async () => {
    await generatePlaintext(richCtx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).not.toContain("<div");
    expect(call[1]).toContain("Inner content.");
  });

  it("should render warranty as a caution box", async () => {
    await generatePlaintext(richCtx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).toMatch(/[*=]+\s*NO WARRANTY/i);
  });

  it("should convert footnotes to endnotes", async () => {
    await generatePlaintext(richCtx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).toContain("[1]");
    expect(call[1]).toContain("This is the footnote text.");
    expect(call[1]).not.toContain("[^1]");
  });

  it("should indent blockquotes", async () => {
    await generatePlaintext(richCtx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).toContain("    This is a blockquote.");
  });

  it("should convert HR to visual separator", async () => {
    await generatePlaintext(richCtx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).toContain("========================================");
  });

  it("should handle definition lists", async () => {
    await generatePlaintext(richCtx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).toContain("TERM");
    expect(call[1]).toContain("The definition of term.");
  });

  it("should strip code fences but keep content", async () => {
    await generatePlaintext(richCtx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).toContain("code example");
    expect(call[1]).not.toContain("```");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bunx vitest run tests/unit/exports.test.ts`

**Step 3: Rewrite `src/build/exports/plaintext.ts`**

Use the `marked` lexer to walk the token tree (same approach as `pdf.ts`). Pre-process with transforms for semantic blocks, footnotes, definition lists, and HTML divs before lexing.

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import type { ExportContext } from "./index.ts";
import {
  convertDefinitionLists,
  convertFootnotesToEndnotes,
  extractSemanticBlocks,
  stripHtmlDivs,
} from "./transforms.ts";
import { licenseUrl } from "../../utils/constants";

/**
 * Generates plaintext exports using AST-based markdown conversion.
 */
export async function generatePlaintext(ctx: ExportContext) {
  const { plainId, version, content, metadata, outputDir } = ctx;
  const fileName = `${plainId}-${version}.txt`;
  const filePath = path.join(outputDir, fileName);

  let processed = stripHtmlDivs(content);

  const { content: withoutBlocks, blocks } = extractSemanticBlocks(processed);
  processed = withoutBlocks;

  const { content: withoutFootnotes, endnotes } =
    convertFootnotesToEndnotes(processed);
  processed = withoutFootnotes;

  processed = convertDefinitionLists(processed, "plaintext");

  for (const block of blocks) {
    const boxContent = renderPlaintextBox(block.id, block.content);
    processed = processed.replace(`{{rendered:${block.id}}}`, boxContent);
  }

  const tokens = marked.lexer(processed);
  let text = renderTokens(tokens);

  const slug = metadata.license_family
    ? `${metadata.license_family}/${ctx.licenseId.toLowerCase()}`
    : ctx.licenseId.toLowerCase();

  const header =
    `Plain License: ${plainId} ${version}\n` +
    `Attribution: ${licenseUrl(slug)}\n\n` +
    "========================================\n\n";

  let fullContent = header + text;

  if (endnotes.length > 0) {
    fullContent +=
      "\n----------------------------------------\nNotes\n----------------------------------------\n\n" +
      endnotes.join("\n\n") +
      "\n";
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, fullContent);
  console.log(`Generated Plaintext export: ${fileName}`);
}

function renderPlaintextBox(id: string, content: string): string {
  const label =
    id === "warranty" ? "NO WARRANTY" : "NOTE";
  const border = "********************************************";
  const plain = content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1");
  return `\n${border}\n*** ${label} ***\n${border}\n\n${plain}\n\n${border}\n`;
}

function renderTokens(tokens: any[]): string {
  let result = "";
  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const text = renderInline(token.tokens);
        const upper = text.toUpperCase();
        if (token.depth <= 2) {
          const char = token.depth === 1 ? "=" : "-";
          result += `${upper}\n${char.repeat(upper.length)}\n\n`;
        } else {
          result += `${upper}\n\n`;
        }
        break;
      }
      case "paragraph":
        result += `${renderInline(token.tokens)}\n\n`;
        break;
      case "list":
        result += renderList(token) + "\n";
        break;
      case "blockquote":
        result +=
          renderTokens(token.tokens)
            .trim()
            .split("\n")
            .map((line: string) => `    ${line}`)
            .join("\n") + "\n\n";
        break;
      case "code":
        result += `${token.text}\n\n`;
        break;
      case "hr":
        result += "========================================\n\n";
        break;
      case "html":
        break;
      case "space":
        break;
      default:
        if (token.text) result += token.text;
    }
  }
  return result;
}

function renderInline(tokens: any[]): string {
  if (!tokens) return "";
  let result = "";
  for (const token of tokens) {
    switch (token.type) {
      case "text":
        result += token.tokens ? renderInline(token.tokens) : token.text;
        break;
      case "strong":
        result += renderInline(token.tokens);
        break;
      case "em":
        result += renderInline(token.tokens);
        break;
      case "link":
        result += token.href?.startsWith("http")
          ? `${renderInline(token.tokens)} (${token.href})`
          : renderInline(token.tokens);
        break;
      case "codespan":
        result += token.text;
        break;
      case "br":
        result += "\n";
        break;
      default:
        result += token.text || "";
    }
  }
  return result;
}

function renderList(token: any): string {
  return (
    token.items
      .map((item: any, i: number) => {
        const bullet = token.ordered ? `${i + 1}. ` : "- ";
        const text = renderTokens(item.tokens).trim();
        const indent = " ".repeat(bullet.length);
        const lines = text.split("\n");
        return (
          bullet +
          lines[0] +
          lines
            .slice(1)
            .map((l: string) => `\n${indent}${l}`)
            .join("")
        );
      })
      .join("\n") + "\n"
  );
}
```

**Step 4: Run tests**

Run: `bunx vitest run tests/unit/exports.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat(infra): rewrite plaintext export with AST-based rendering and endnotes
```

---

## Task 5: Update Integration to Use Extracted `injectTemplateBlocks`

**Files:**
- Modify: `src/integrations/exports.ts:36-43`

**Why:** The `injectTemplateBlocks` function now lives in `transforms.ts` (with semantic marker support). The integration should import it from there instead of defining its own copy.

**Step 1: Update the import and remove the local definition**

In `src/integrations/exports.ts`, replace the local `injectTemplateBlocks` function:

```typescript
import { injectTemplateBlocks } from "../build/exports/transforms";
```

Remove lines 36-43 (the local `injectTemplateBlocks` definition).

**Step 2: Run integration test**

Run: `bunx vitest run tests/integration/export_orchestrator.test.ts`
Expected: PASS

**Step 3: Run unit tests to catch regressions**

Run: `bunx vitest run tests/unit/exports.test.ts tests/unit/export-transforms.test.ts`
Expected: PASS

**Step 4: Commit**

```
refactor(infra): use shared injectTemplateBlocks from transforms module
```

---

## Task 6: Update Existing Tests and Add Edge Cases

**Files:**
- Modify: `tests/unit/exports.test.ts`
- Modify: `tests/unit/export-transforms.test.ts`

**Why:** Ensure edge cases are covered: content with no semantic blocks, mixed footnotes and definition lists, deeply nested markdown.

**Step 1: Add edge case tests**

```typescript
// In export-transforms.test.ts
describe("Edge cases", () => {
  it("should handle content with no semantic blocks gracefully", () => {
    const input = "# Title\n\nJust regular content.";
    const result = extractSemanticBlocks(input);
    expect(result.blocks).toHaveLength(0);
    expect(result.content).toBe(input);
  });

  it("should handle multiline footnote definitions", () => {
    const input =
      "Text[^1].\n\n[^1]: First line of note.\nSecond line continues.";
    const result = convertFootnotesToEndnotes(input);
    expect(result.endnotes[0]).toContain("Second line continues.");
  });

  it("should handle definition list with multiline definition", () => {
    const input =
      "`term`\n\n:    First line.\n    Second line of definition.";
    const result = convertDefinitionLists(input, "markdown");
    expect(result).toContain("**term**");
  });
});

// In exports.test.ts
describe("generatePlaintext edge cases", () => {
  it("should handle content with no special features", async () => {
    await generatePlaintext(ctx);
    const call = (fs.writeFile as any).mock.calls.find((c: any) =>
      c[0].endsWith(".txt"),
    );
    expect(call[1]).toContain("MIT LICENSE");
    expect(call[1]).toContain("Content here.");
  });
});
```

**Step 2: Run all tests**

Run: `bunx vitest run tests/unit/`
Expected: PASS

**Step 3: Commit**

```
test(infra): add edge case tests for export transforms
```

---

## Task 7: Run Full Build and Verify Output

**Step 1: Run the full build**

Run: `mise run build`

**Step 2: Inspect generated exports**

Check a generated GFM file for alerts:
```bash
command cat dist/exports/mit/latest/Plain-MIT.gfm.md | head -40
```

Check a generated CM file for styled blockquotes:
```bash
command cat dist/exports/mit/latest/Plain-MIT.cm.md | head -40
```

Check a generated plaintext file for proper formatting:
```bash
command cat dist/exports/mit/latest/Plain-MIT.txt
```

Check MPL exports (has footnotes and definition lists):
```bash
command cat dist/exports/mpl-2.0/latest/Plain-MPL.gfm.md | tail -40
command cat dist/exports/mpl-2.0/latest/Plain-MPL.txt | tail -40
```

**Step 3: Verify no regressions**

Run: `bunx vitest run`

**Step 4: Fix any issues discovered during manual inspection**

Iterate on transforms if output doesn't look right.

**Step 5: Final commit**

```
feat(infra): format-specific export transforms for GFM, CM, and plaintext
```

---

## Summary of Changes

| File | Change | Lines (est.) |
|---|---|---|
| `src/build/exports/transforms.ts` | NEW -- all transform functions | ~180 |
| `src/build/exports/markdown.ts` | REWRITE -- GFM/CM pipelines | ~70 |
| `src/build/exports/plaintext.ts` | REWRITE -- AST renderer | ~150 |
| `src/integrations/exports.ts` | MINOR -- import shared function | ~3 |
| `tests/unit/export-transforms.test.ts` | NEW -- transform unit tests | ~120 |
| `tests/unit/exports.test.ts` | UPDATE -- new expectations | ~80 |

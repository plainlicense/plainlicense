/**
 * Shared and format-specific transform functions for license export generation.
 * Used by the markdown (GFM/CM) and plaintext export pipelines.
 */

// ── Types ──────────────────────────────────────────────────────────

export interface SemanticBlock {
  id: string;
  content: string;
  raw: string;
}

export interface ExtractedBlocks {
  content: string;
  blocks: SemanticBlock[];
}

export interface FootnoteResult {
  content: string;
  endnotes: string[];
}

// ── Constants ──────────────────────────────────────────────────────

/** Block IDs that get semantic markers for format-specific rendering. */
export const SEMANTIC_BLOCK_IDS = new Set(["warranty", "interpretation"]);

const SEMANTIC_ALERT_MAP: Record<string, { gfm: string; cm: string }> = {
  warranty: { gfm: "CAUTION", cm: "Caution" },
  interpretation: { gfm: "NOTE", cm: "Note" },
};

// ── Content Stripping ─────────────────────────────────────────────

/**
 * Strips the original license text from markdown content.
 * Exports only contain the plain language version, not the original.
 * Original text appears after a `---` separator followed by `# Original License Text`.
 */
export function stripOriginalLicenseText(markdown: string): string {
  const separatorPattern = /\n---\s*\n+#\s*Original\s+License\s+Text/i;
  const match = markdown.match(separatorPattern);
  if (match?.index != null) {
    return markdown.slice(0, match.index).trimEnd();
  }
  return markdown;
}

// ── Shared Transforms ──────────────────────────────────────────────

/**
 * Replaces `{{block:id}}` placeholders with template block content.
 * For IDs in SEMANTIC_BLOCK_IDS, wraps with `<!-- semantic:id -->` markers.
 * Unresolved placeholders remain as-is.
 */
export function injectTemplateBlocks(
  content: string,
  templateBlocks: Record<string, string>,
): string {
  return content.replace(/\{\{block:([a-z0-9-]+)\}\}/g, (match, id) => {
    const block = templateBlocks[id];
    if (block === undefined) return match;

    if (SEMANTIC_BLOCK_IDS.has(id)) {
      return `<!-- semantic:${id} -->\n${block}\n<!-- /semantic:${id} -->`;
    }
    return block;
  });
}

/**
 * Removes `<div ...>` and `</div>` tags (with optional trailing newline),
 * preserving inner content. Leaves non-div HTML alone.
 */
export function stripHtmlDivs(content: string): string {
  return content.replace(/<div[^>]*>\n?/g, "").replace(/<\/div>\n?/g, "");
}

/**
 * Extracts `<!-- semantic:id -->...<!-- /semantic:id -->` markers.
 * Returns content with blocks replaced by `{{rendered:id}}` placeholders,
 * and an array of extracted blocks.
 */
export function extractSemanticBlocks(content: string): ExtractedBlocks {
  const blocks: SemanticBlock[] = [];
  const processed = content.replace(
    /<!-- semantic:([a-z0-9-]+) -->\n([\s\S]*?)\n<!-- \/semantic:\1 -->/g,
    (raw, id, inner) => {
      blocks.push({ id, content: inner, raw });
      return `{{rendered:${id}}}`;
    },
  );
  return { content: processed, blocks };
}

// ── Footnote Transforms ────────────────────────────────────────────

/**
 * Parses `[^n]: text` definitions from content, including multiline continuations.
 * Returns a map of footnote number to definition text, and the content with
 * definitions removed.
 */
function parseFootnoteDefinitions(content: string): {
  definitions: Map<number, string>;
  cleaned: string;
} {
  const definitions = new Map<number, string>();
  const lines = content.split("\n");
  const cleanedLines: string[] = [];
  let currentNote: number | null = null;
  let currentLines: string[] = [];

  const flushCurrent = () => {
    if (currentNote !== null) {
      definitions.set(currentNote, currentLines.join("\n"));
      currentNote = null;
      currentLines = [];
    }
  };

  for (const line of lines) {
    const defMatch = line.match(/^\[\^(\d+)\]:\s*(.*)/);
    if (defMatch) {
      flushCurrent();
      currentNote = Number.parseInt(defMatch[1], 10);
      currentLines = [defMatch[2]];
      continue;
    }

    if (currentNote !== null) {
      // Continuation: non-empty line that doesn't start with `[` or blank line
      if (line === "") {
        flushCurrent();
        cleanedLines.push(line);
      } else if (line.startsWith("[")) {
        flushCurrent();
        // Re-process this line — it might be another footnote def
        const reMatch = line.match(/^\[\^(\d+)\]:\s*(.*)/);
        if (reMatch) {
          currentNote = Number.parseInt(reMatch[1], 10);
          currentLines = [reMatch[2]];
        } else {
          cleanedLines.push(line);
        }
      } else {
        currentLines.push(line);
      }
      continue;
    }

    cleanedLines.push(line);
  }
  flushCurrent();

  return { definitions, cleaned: cleanedLines.join("\n") };
}

/**
 * Converts footnotes to endnotes. Extracts `[^n]: text` definitions,
 * replaces `[^n]` references with `[n]`, returns endnotes sorted numerically.
 */
export function convertFootnotesToEndnotes(content: string): FootnoteResult {
  const { definitions, cleaned } = parseFootnoteDefinitions(content);

  if (definitions.size === 0) {
    return { content, endnotes: [] };
  }

  // Replace references: [^n] → [n]
  const processed = cleaned.replace(/\[\^(\d+)\]/g, (_match, n) => `[${n}]`);

  // Sort numerically
  const sorted = [...definitions.entries()].sort(([a], [b]) => a - b);
  const endnotes = sorted.map(([, text]) => text);

  return { content: processed, endnotes };
}

/**
 * For CommonMark: replaces `[^n]` references with inline `*(Note: text)*`
 * and removes footnote definition lines. Multiline definitions are joined
 * with spaces.
 */
export function footnotesToInline(content: string): string {
  const { definitions, cleaned } = parseFootnoteDefinitions(content);

  if (definitions.size === 0) {
    return content;
  }

  // Replace references with inline notes
  const processed = cleaned.replace(/\[\^(\d+)\]/g, (_match, n) => {
    const num = Number.parseInt(n, 10);
    const text = definitions.get(num);
    if (!text) return _match;
    // Join multiline with space for inline form
    const inline = text.replace(/\n/g, " ");
    return ` *(Note: ${inline})*`;
  });

  return processed;
}

// ── Definition List Transforms ─────────────────────────────────────

/**
 * Converts `` `term`\n\n:    definition `` patterns.
 * Mode "markdown" → `**term** — definition`.
 * Mode "plaintext" → `TERM — definition`.
 */
export function convertDefinitionLists(
  content: string,
  mode: "markdown" | "plaintext",
): string {
  return content.replace(
    /`([^`]+)`\n\n?: {4}(.*)/g,
    (_match, term: string, definition: string) => {
      if (mode === "plaintext") {
        return `${term.toUpperCase()} \u2014 ${definition}`;
      }
      return `**${term}** \u2014 ${definition}`;
    },
  );
}

// ── Semantic Block Format Converters ───────────────────────────────

/**
 * Converts a SemanticBlock to GFM alert syntax.
 * warranty → `> [!CAUTION]`, interpretation → `> [!NOTE]`.
 */
export function semanticBlockToGfmAlert(block: SemanticBlock): string {
  const alertType = SEMANTIC_ALERT_MAP[block.id]?.gfm ?? "NOTE";
  const lines = block.content.split("\n").map((l) => `> ${l}`);
  return `> [!${alertType}]\n${lines.join("\n")}`;
}

/**
 * Converts a SemanticBlock to CommonMark blockquote.
 * warranty → `> **Caution:** ...`, interpretation → `> **Note:** ...`.
 */
export function semanticBlockToCmBlockquote(block: SemanticBlock): string {
  const label = SEMANTIC_ALERT_MAP[block.id]?.cm ?? "Note";
  const lines = block.content.split("\n");
  const first = `> **${label}:** ${lines[0]}`;
  if (lines.length === 1) return first;
  const rest = lines.slice(1).map((l) => `> ${l}`);
  return `${first}\n${rest.join("\n")}`;
}

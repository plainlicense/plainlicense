import fs from "node:fs/promises";
import path from "node:path";
import type { Token, Tokens } from "marked";
import { marked } from "marked";
import { licenseUrl } from "../../utils/constants";
import type { ExportContext } from "./index.ts";
import {
  convertDefinitionLists,
  convertFootnotesToEndnotes,
  extractSemanticBlocks,
  stripHtmlDivs,
} from "./transforms";

// ── Constants ─────────────────────────────────────────────────────

const HR_LINE = "========================================";
const BOX_LINE = "********************************************";

const SEMANTIC_LABEL_MAP: Record<string, string> = {
  warranty: "NO WARRANTY",
  interpretation: "NOTE",
};

// ── Inline Rendering ──────────────────────────────────────────────

/**
 * Renders inline tokens to plain text:
 * strips bold/italic markers, converts links to `text (url)` form,
 * strips code backticks, and recurses into sub-tokens.
 */
function renderInline(tokens: Token[]): string {
  let result = "";
  for (const token of tokens) {
    switch (token.type) {
      case "text":
        if ((token as Tokens.Text).tokens) {
          result += renderInline((token as Tokens.Text).tokens ?? []);
        } else {
          result += token.raw !== undefined ? (token as Tokens.Text).text : "";
        }
        break;
      case "strong":
        result += renderInline((token as Tokens.Strong).tokens);
        break;
      case "em":
        result += renderInline((token as Tokens.Em).tokens);
        break;
      case "link": {
        const link = token as Tokens.Link;
        const text = renderInline(link.tokens);
        if (link.href.startsWith("http")) {
          result += `${text} (${link.href})`;
        } else {
          result += text;
        }
        break;
      }
      case "codespan":
        result += (token as Tokens.Codespan).text;
        break;
      case "br":
        result += "\n";
        break;
      default:
        // Fallback: use text property if available
        if ("text" in token && typeof token.text === "string") {
          result += token.text;
        }
        break;
    }
  }
  return result;
}

// ── Block Rendering ───────────────────────────────────────────────

/**
 * Walks the marked AST token array and renders each block to plaintext.
 */
function renderTokens(tokens: Token[]): string {
  let result = "";

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const heading = token as Tokens.Heading;
        const text = renderInline(heading.tokens).toUpperCase();
        result += `${text}\n`;
        if (heading.depth === 1) {
          result += `${"=".repeat(text.length)}\n`;
        } else if (heading.depth === 2) {
          result += `${"-".repeat(text.length)}\n`;
        }
        result += "\n";
        break;
      }
      case "paragraph": {
        const para = token as Tokens.Paragraph;
        result += `${renderInline(para.tokens)}\n\n`;
        break;
      }
      case "list": {
        const list = token as Tokens.List;
        list.items.forEach((item: Tokens.ListItem, i: number) => {
          const bullet = list.ordered
            ? `${Number(list.start ?? 1) + i}. `
            : "- ";
          const indent = " ".repeat(bullet.length);
          const content = renderTokens(item.tokens).trim();
          const lines = content.split("\n");
          const first = `${bullet}${lines[0]}`;
          const rest = lines.slice(1).map((l) => `${indent}${l}`);
          result += `${[first, ...rest].join("\n")}\n`;
        });
        result += "\n";
        break;
      }
      case "blockquote": {
        const bq = token as Tokens.Blockquote;
        const content = renderTokens(bq.tokens).trimEnd();
        const lines = content.split("\n");
        result += `${lines.map((l) => `    ${l}`).join("\n")}\n\n`;
        break;
      }
      case "code": {
        const code = token as Tokens.Code;
        result += `${code.text}\n\n`;
        break;
      }
      case "hr":
        result += `${HR_LINE}\n\n`;
        break;
      case "text": {
        // Tight list items produce block-level text tokens with inline sub-tokens
        const textTok = token as Tokens.Text;
        if (textTok.tokens) {
          result += `${renderInline(textTok.tokens)}\n\n`;
        } else {
          result += `${textTok.text}\n\n`;
        }
        break;
      }
      case "html":
        // Strip HTML — already handled by pre-processing
        break;
      case "space":
        break;
      default:
        // For any unhandled block token with text, render it
        if ("text" in token && typeof token.text === "string") {
          result += `${token.text}\n\n`;
        }
        break;
    }
  }

  return result;
}

// ── Semantic Block Rendering ──────────────────────────────────────

/**
 * Renders a semantic block (warranty, interpretation) as a plaintext box.
 * Content is rendered via AST to strip markdown formatting.
 */
function renderPlaintextBox(id: string, content: string): string {
  const label = SEMANTIC_LABEL_MAP[id] ?? id.toUpperCase();
  const labelLine = `*** ${label} ***`;

  // Strip markdown from block content via AST
  const tokens = marked.lexer(content);
  const rendered = renderTokens(tokens).trim();

  return [BOX_LINE, labelLine, BOX_LINE, "", rendered, "", BOX_LINE].join("\n");
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Generates a plaintext export of a license.
 * Uses the marked lexer for proper AST-based markdown-to-plaintext conversion.
 */
export async function generatePlaintext(ctx: ExportContext) {
  const { plainId, version, content, metadata, outputDir } = ctx;
  const fileName = `${plainId}-${version}.txt`;
  const filePath = path.join(outputDir, fileName);

  // ── Pre-processing pipeline ──────────────────────────────────
  let processed = stripHtmlDivs(content);
  const { content: withPlaceholders, blocks } =
    extractSemanticBlocks(processed);
  processed = withPlaceholders;

  const { content: withEndnoteRefs, endnotes } =
    convertFootnotesToEndnotes(processed);
  processed = withEndnoteRefs;

  processed = convertDefinitionLists(processed, "plaintext");

  // ── AST rendering ────────────────────────────────────────────
  // Render main content through AST first, while placeholders are still simple strings
  const tokens = marked.lexer(processed);
  let body = renderTokens(tokens);

  // Replace semantic block placeholders with rendered boxes AFTER AST rendering
  // (avoids the box decorations being re-parsed by the lexer)
  for (const block of blocks) {
    body = body.replace(
      `{{rendered:${block.id}}}`,
      renderPlaintextBox(block.id, block.content),
    );
  }

  // ── Document assembly ────────────────────────────────────────
  const slug = metadata.license_family
    ? `${metadata.license_family}/${ctx.licenseId.toLowerCase()}`
    : ctx.licenseId.toLowerCase();

  const header =
    `Plain License: ${plainId} ${version}\n` +
    `Attribution: ${licenseUrl(slug)}\n\n` +
    `${HR_LINE}\n\n`;

  let fullContent = header + body.trimEnd();

  // Endnotes section
  if (endnotes.length > 0) {
    const notesSeparator = "----------------------------------------";
    const notesHeader = `\n\n${notesSeparator}\nNotes\n${notesSeparator}\n\n`;
    const notesBody = endnotes
      .map((note, i) => {
        // Strip markdown from endnote text via AST
        const tokens = marked.lexer(note);
        const plain = renderTokens(tokens).trim();
        return `[${i + 1}] ${plain}`;
      })
      .join("\n\n");
    fullContent += notesHeader + notesBody;
  }

  fullContent += "\n";

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, fullContent);
  console.log(`Generated Plaintext export: ${filePath}`);
}

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { licenseUrl, SITE_URL } from "../../utils/constants";
import type { ExportContext } from "./index.ts";
import { annotateTermsForMarkdown, appendTermFootnotes } from "./transforms.ts";

/**
 * Color palettes per license family, matching the website's CSS variables.
 */
const FAMILY_COLORS: Record<
  string,
  { accent: string; muted: string; label: string }
> = {
  permissive: {
    accent: "rgb(21, 219, 149)",
    muted: "rgb(9, 93, 64)",
    label: "Permissive",
  },
  copyleft: {
    accent: "rgb(58, 198, 240)",
    muted: "rgb(18, 34, 43)",
    label: "Copyleft",
  },
  "source-available": {
    accent: "rgb(232, 197, 71)",
    muted: "rgb(50, 38, 11)",
    label: "Source Available",
  },
  "public-domain": {
    accent: "rgb(212, 153, 255)",
    muted: "rgb(63, 39, 63)",
    label: "Public Domain",
  },
  proprietary: {
    accent: "rgb(255, 142, 71)",
    muted: "rgb(82, 31, 0)",
    label: "Proprietary",
  },
};

/** Zone-specific accent colors matching the website's semantic coloring. */
const ZONE_COLORS = {
  permissions: "rgb(21, 219, 149)", // emerald
  conditions: "rgb(228, 197, 129)", // ecru
  restrictions: "rgb(234, 100, 80)", // restriction-red
  protections: "rgb(108, 166, 193)", // air-superiority-blue
  interpretation: "rgb(228, 197, 129)", // ecru (matches website)
};

/**
 * Generates PDF exports using Typst.
 * Uses custom Typst templates styled to match the Plain License website.
 */
export async function generatePDF(ctx: ExportContext) {
  const { plainId, version, content, metadata, outputDir } = ctx;
  const baseName = `${plainId}-${version}`;
  const fileName = `${baseName}.pdf`;
  const filePath = path.join(outputDir, fileName);
  const typPath = path.join(outputDir, `${baseName}.typ`);

  const typstDoc = generateTypst(content, metadata, version);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(typPath, typstDoc);

  if (process.env.DEBUG_TYPST) {
    console.log(
      `Typst source for ${plainId} contains interactive: ${typstDoc.includes("interactive")}`,
    );
  }

  return new Promise<void>((resolve, reject) => {
    const child = spawn("typst", ["compile", typPath, filePath]);
    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", async (err) => {
      await fs.unlink(typPath).catch(() => {});
      reject(err);
    });
    child.on("close", async (code) => {
      if (code !== 0) {
        console.error(`Typst error output for ${plainId}: ${stderr}`);
      }
      await fs.unlink(typPath).catch(() => {});
      if (code === 0) {
        console.log(`Generated PDF export: ${filePath}`);
        resolve();
      } else {
        reject(new Error(`Typst failed with code ${code} for ${plainId}`));
      }
    });
  });
}

/**
 * Resolves markdown footnotes into Typst #footnote[...] inline calls.
 * Parses `[^id]: text` definitions, then replaces `[^id]` references
 * with `#footnote[text]`. Handles both numeric and string IDs.
 */
function resolveFootnotesForTypst(content: string): string {
  // Parse footnote definitions (handles both `[^1]: text` and `[^term-id]: text`)
  const defs = new Map<string, string>();
  const lines = content.split("\n");
  const cleanedLines: string[] = [];
  let currentId: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentId !== null) {
      defs.set(currentId, currentLines.join(" ").trim());
      currentId = null;
      currentLines = [];
    }
  };

  for (const line of lines) {
    const defMatch = line.match(/^\[\^([^\]]+)\]:\s*(.*)/);
    if (defMatch) {
      flush();
      currentId = defMatch[1];
      currentLines = [defMatch[2]];
      continue;
    }
    if (currentId !== null) {
      if (line === "" || line.startsWith("[")) {
        flush();
        cleanedLines.push(line);
      } else {
        currentLines.push(line);
      }
      continue;
    }
    cleanedLines.push(line);
  }
  flush();

  if (defs.size === 0) return content;

  // Replace references with Typst footnote calls
  let result = cleanedLines.join("\n");
  result = result.replace(/\[\^([^\]]+)\]/g, (_match, id) => {
    const text = defs.get(id);
    if (!text) return _match;
    // Strip surrounding quotes from term definitions for cleaner footnotes
    const clean = text.replace(/^"[^"]*"\s*/, "").replace(/\.$/, "");
    return `TYPST_FOOTNOTE{${clean}}`;
  });

  return result;
}

function generateTypst(
  markdown: string,
  metadata: any,
  version: string,
): string {
  const family = metadata.license_family || "permissive";
  const colors = FAMILY_COLORS[family] || FAMILY_COLORS.permissive;
  const slug = metadata.slug || "";
  const tldr: string[] = metadata.tldr || [];
  const description = metadata.description || "";
  const isDedication = metadata.is_dedication || false;
  const originalName = metadata.original?.name || "";

  // Track which zone we're currently inside
  let currentZone: string | null = null;
  let firstH1Skipped = false;

  function escapeTypst(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/#/g, "\\#")
      .replace(/\$/g, "\\$")
      .replace(/@/g, "\\@")
      .replace(/</g, "\\<")
      .replace(/>/g, "\\>")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}");
  }

  // Pre-process: annotate terms as footnotes, then resolve all footnotes to Typst
  const { content: annotated, definitions } =
    annotateTermsForMarkdown(markdown);
  const withDefs = appendTermFootnotes(annotated, definitions);
  const preprocessed = resolveFootnotesForTypst(withDefs);

  const tokens = marked.lexer(preprocessed);
  let body = "";

  /**
   * Detect definition list patterns: a paragraph containing only a code span
   * followed by a paragraph starting with `:`.
   */
  function isDefinitionTerm(token: any): boolean {
    if (token.type !== "paragraph" || !token.tokens) return false;
    // All non-space tokens should be codespans (possibly with surrounding text tokens that are just whitespace/connectors)
    const meaningful = token.tokens.filter((t: any) => t.type !== "space");
    // Simple case: single codespan, or codespans joined by "and"/"/"
    const hasCodespan = meaningful.some((t: any) => t.type === "codespan");
    const onlyCodesAndText = meaningful.every(
      (t: any) =>
        t.type === "codespan" ||
        (t.type === "text" && /^\s*(and|\/|,)\s*$/.test(t.text)),
    );
    return hasCodespan && onlyCodesAndText;
  }

  function isDefinitionBody(token: any): boolean {
    if (token.type !== "paragraph" || !token.tokens) return false;
    const firstText = token.tokens[0];
    return firstText?.type === "text" && /^:\s+/.test(firstText.text);
  }

  function processTokens(tokens: any[], depth = 0): string {
    let result = "";
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Definition list detection: term paragraph followed by definition paragraph
      if (isDefinitionTerm(token)) {
        const termText = processTokens(token.tokens, depth);
        // Look ahead for the definition body
        const nextNonSpace = tokens
          .slice(i + 1)
          .find((t: any) => t.type !== "space");
        if (nextNonSpace && isDefinitionBody(nextNonSpace)) {
          // Skip the space token(s) between term and definition
          while (i + 1 < tokens.length && tokens[i + 1].type === "space") i++;
          i++; // skip the definition body token
          // Process definition body, stripping the leading `: `
          const defTokens = [...nextNonSpace.tokens];
          if (defTokens[0]?.type === "text") {
            defTokens[0] = {
              ...defTokens[0],
              text: defTokens[0].text.replace(/^:\s+/, ""),
            };
          }
          const defText = processTokens(defTokens, depth);

          result += `#block(inset: (left: 12pt, top: 6pt, bottom: 6pt), stroke: (left: 2pt + rgb(50, 55, 70)))[\n`;
          result += `  #text(font: "JetBrains Mono", size: 9.5pt, weight: "bold", fill: ${colors.accent})[${termText.trim()}] \\\n`;
          result += `  #text(size: 9.5pt, fill: rgb(180, 188, 200))[${defText.trim()}]\n`;
          result += `]\n#v(0.3em)\n\n`;
          continue;
        }
      }

      switch (token.type) {
        case "heading": {
          const headingText = processTokens(token.tokens, depth);
          if (token.depth === 1 && !firstH1Skipped) {
            // Skip the first H1 — it duplicates the title block
            firstH1Skipped = true;
            break;
          }
          if (token.depth === 1) {
            // H1 — major section header
            result += `\n#v(1.5em)\n`;
            result += `#block(width: 100%, below: 1em)[\n`;
            result += `  #text(font: "Plus Jakarta Sans", size: 18pt, weight: "bold", fill: ${colors.accent})[${headingText}]\n`;
            result += `]\n`;
            result += `#line(length: 100%, stroke: 0.75pt + ${colors.accent})\n`;
            result += `#v(0.5em)\n\n`;
          } else if (token.depth === 2) {
            // H2 — zone headers
            const zoneColor = getZoneColor(currentZone);
            result += `\n#v(1em)\n`;
            result += `#text(font: "Plus Jakarta Sans", size: 14pt, weight: "bold", fill: ${zoneColor})[${headingText}]\n`;
            result += `#v(0.4em)\n\n`;
          } else {
            // H3+ — sub-headers
            result += `\n#v(0.6em)\n`;
            result += `#text(font: "Plus Jakarta Sans", size: 11.5pt, weight: "semibold")[${headingText}]\n`;
            result += `#v(0.3em)\n\n`;
          }
          break;
        }
        case "paragraph":
          result += `${processTokens(token.tokens, depth)}\n\n`;
          break;
        case "text":
          result += token.tokens
            ? processTokens(token.tokens, depth)
            : escapeTypst(token.text);
          break;
        case "strong":
          result += `*${processTokens(token.tokens, depth)}*`;
          break;
        case "em":
          result += `_${processTokens(token.tokens, depth)}_`;
          break;
        case "list": {
          const indent = "  ".repeat(depth);
          const items = token.items.map((item: any) => {
            const bullet = token.ordered ? "+ " : "- ";
            const content = processTokens(item.tokens, depth + 1)
              .trim()
              .replace(/\n{2,}/g, "\n") // collapse double newlines to preserve Typst nesting
              .replace(/\n/g, `\n${indent}  `);
            return `${indent}${bullet}${content}`;
          });
          result += `${items.join("\n")}\n\n`;
          break;
        }
        case "link":
          if (token.href.startsWith("http")) {
            result += `#link("${token.href}")[#text(fill: ${colors.accent})[${processTokens(token.tokens, depth)}]]`;
          } else {
            result += processTokens(token.tokens, depth);
          }
          break;
        case "codespan":
          result += `#box(fill: rgb(30, 35, 45), inset: (x: 4pt, y: 2pt), radius: 3pt)[#text(font: "JetBrains Mono", size: 9pt, fill: rgb(200, 210, 225))[${escapeTypst(token.text)}]]`;
          break;
        case "code": {
          // Use raw() to avoid // being treated as Typst comments inside content blocks
          const escaped = token.text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          result += `#block(fill: rgb(22, 25, 35), inset: 12pt, radius: 4pt, width: 100%)[#set text(font: "JetBrains Mono", size: 8.5pt, fill: rgb(200, 210, 225)); #raw("${escaped}", block: true)]\n\n`;
          break;
        }
        case "blockquote":
          result += `#block(inset: (left: 16pt, y: 8pt), stroke: (left: 3pt + rgb(108, 166, 193)))[#text(fill: rgb(160, 170, 185), style: "italic")[${processTokens(token.tokens, depth).trim()}]]\n\n`;
          break;
        case "table": {
          const cols = token.header.length;
          const header = token.header
            .map((h: any) => `[*${processTokens(h.tokens, depth)}*]`)
            .join(", ");
          const rows = token.rows
            .map((row: any) =>
              row
                .map((cell: any) => `[${processTokens(cell.tokens, depth)}]`)
                .join(", "),
            )
            .join(",\n    ");
          result += `#table(\n`;
          result += `  columns: ${cols},\n`;
          result += `  inset: 10pt,\n`;
          result += `  align: horizon,\n`;
          result += `  fill: (_, row) => if row == 0 { rgb(22, 25, 35) } else if calc.odd(row) { rgb(13, 15, 21) } else { none },\n`;
          result += `  ${header},\n`;
          result += `  ${rows}\n`;
          result += `)\n\n`;
          break;
        }
        case "hr":
          result += `#v(0.5em)\n#line(length: 100%, stroke: 0.5pt + rgb(60, 65, 80))\n#v(0.5em)\n\n`;
          break;
        case "br":
          result += " \\ ";
          break;
        case "space":
          break;
        case "html": {
          // Handle inline <ins> tags → underline in Typst
          if (token.text === "<ins>") {
            insideIns = true;
            result += "#underline[";
            break;
          }
          if (token.text === "</ins>") {
            insideIns = false;
            result += "]";
            break;
          }
          // Parse zone divs to track current section for accent coloring
          const openMatch = token.text.match(/<div\s+id="([^"]+)"/);
          const closeMatch = token.text.match(/<\/div>/);
          if (openMatch) {
            currentZone = openMatch[1];
            const zoneColor = getZoneColor(currentZone);
            // Emit a subtle zone indicator bar
            result += `\n#block(stroke: (left: 3pt + ${zoneColor}), inset: (left: 12pt, top: 4pt, bottom: 4pt))[\n`;
          } else if (closeMatch && currentZone) {
            result += `]\n\n`;
            currentZone = null;
          }
          break;
        }
        default:
          result += token.text ? escapeTypst(token.text) : "";
      }
    }
    return result;
  }

  body = processTokens(tokens);

  // Convert TYPST_FOOTNOTE placeholders to actual Typst footnote calls.
  // The placeholder survives escapeTypst because it contains no special chars
  // except braces, which get escaped. Match both escaped and unescaped forms.
  body = body.replace(
    /TYPST_FOOTNOTE\\\{([^}]*?)\\\}/g,
    (_match, text) => `#footnote[${text}]`,
  );
  body = body.replace(
    /TYPST_FOOTNOTE\{([^}]*?)\}/g,
    (_match, text) => `#footnote[${text}]`,
  );

  // Build the TL;DR callout
  const tldrBlock =
    tldr.length > 0
      ? `#block(
  fill: rgb(22, 25, 35),
  stroke: (left: 4pt + ${colors.accent}),
  inset: (left: 16pt, right: 16pt, top: 12pt, bottom: 12pt),
  radius: (right: 4pt),
  width: 100%,
)[
  #text(font: "Plus Jakarta Sans", size: 9pt, weight: "bold", fill: ${colors.accent})[TL;DR]
  #v(4pt)
  ${tldr.map((item) => `- #text(size: 10pt)[${escapeTypst(item)}]`).join("\n  ")}
]

#v(0.75em)
`
      : "";

  // Family badge text
  const familyBadge = isDedication ? "Public Domain Dedication" : colors.label;

  return `// Plain License PDF — generated by plainlicense.org build system
// ${metadata.title} v${version}

#set page(
  width: 8.5in,
  height: 11in,
  margin: (top: 1.1in, bottom: 1in, x: 1in),
  fill: rgb(13, 15, 21),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(size: 7.5pt, fill: rgb(100, 110, 125), font: "Lexend")
      #grid(
        columns: (1fr, 1fr),
        [#text(fill: ${colors.accent})[■] ${escapeTypst(metadata.title)}],
        [#align(right)[plainlicense.org]]
      )
      #v(2pt)
      #line(length: 100%, stroke: 0.3pt + rgb(40, 45, 60))
    ]
  },
  footer: context [
    #set text(size: 7.5pt, fill: rgb(100, 110, 125), font: "Lexend")
    #line(length: 100%, stroke: 0.3pt + rgb(40, 45, 60))
    #v(4pt)
    #grid(
      columns: (1fr, auto, 1fr),
      [v${version}],
      [#text(fill: rgb(80, 85, 100))[${escapeTypst(familyBadge)}]],
      [#align(right)[#counter(page).display()]]
    )
  ]
)

// Typography defaults
#set text(
  font: "Lexend",
  size: 10pt,
  fill: rgb(232, 234, 240),
  lang: "en",
)
#set par(justify: true, leading: 0.72em)
#show heading: set block(above: 1.2em, below: 0.8em)

// Link styling
#show link: it => text(fill: ${colors.accent})[#it]

// ── Title Block ──────────────────────────────────────────
#v(0.5in)

#align(center)[
  // Family badge
  #box(
    fill: rgb(22, 25, 35),
    stroke: 1pt + ${colors.accent},
    inset: (x: 12pt, y: 5pt),
    radius: 99pt,
  )[
    #text(
      font: "Plus Jakarta Sans",
      size: 8pt,
      weight: "bold",
      fill: ${colors.accent},
      tracking: 0.06em,
    )[${escapeTypst(familyBadge.toUpperCase())}]
  ]

  #v(0.75em)

  // License title
  #text(
    font: "Plus Jakarta Sans",
    size: 26pt,
    weight: "bold",
    fill: rgb(232, 234, 240),
  )[${escapeTypst(metadata.title)}]

  #v(0.3em)

  // Version and original reference
  #text(size: 11pt, fill: rgb(140, 150, 165))[
    Plain Language Version ${version}${originalName ? ` · Based on ${escapeTypst(originalName)}` : ""}
  ]

  #v(0.4em)

  // Accent line
  #line(length: 40%, stroke: 1.5pt + ${colors.accent})
]

#v(1em)

// Description
${description ? `#text(size: 10.5pt, fill: rgb(180, 188, 200))[${escapeTypst(description)}]\n\n#v(0.5em)\n` : ""}

// TL;DR callout
${tldrBlock}

// ── License Body ─────────────────────────────────────────

${body}

// ── Footer ───────────────────────────────────────────────
#v(2em)
#line(length: 100%, stroke: 0.5pt + rgb(50, 55, 70))
#v(0.5em)

#block(
  fill: rgb(22, 25, 35),
  inset: 12pt,
  radius: 4pt,
  width: 100%,
)[
  #text(font: "Plus Jakarta Sans", size: 8pt, fill: rgb(120, 130, 145))[
    *Disclaimer:* This is a plain language version of the original license. It is meant to help you understand your rights and responsibilities, not to replace the original. When in doubt, refer to the original license text.

    #v(4pt)
    *Source:* #link("${licenseUrl(slug)}")[${licenseUrl(slug)}] ·
    *Project:* #link("${SITE_URL}")[${SITE_URL}]
  ]
]
`;
}

/** Map a zone div ID to its accent color. */
function getZoneColor(zone: string | null): string {
  if (!zone) return "rgb(160, 170, 185)";
  if (zone.includes("permission")) return ZONE_COLORS.permissions;
  if (zone.includes("condition")) return ZONE_COLORS.conditions;
  if (zone.includes("restriction")) return ZONE_COLORS.restrictions;
  if (zone.includes("protection")) return ZONE_COLORS.protections;
  if (zone.includes("interpretation")) return ZONE_COLORS.interpretation;
  return "rgb(160, 170, 185)";
}

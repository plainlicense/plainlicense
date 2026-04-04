import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import type { ExportContext } from "./index.ts";
import { licenseUrl, SITE_URL } from "../../utils/constants";

/**
 * Color palettes per license family, matching the website's CSS variables.
 * Each tuple: [primary accent, muted accent for backgrounds].
 */
const FAMILY_COLORS: Record<string, { accent: string; muted: string; label: string }> = {
  permissive: { accent: "rgb(21, 219, 149)", muted: "rgb(9, 93, 64)", label: "Permissive" },
  copyleft: { accent: "rgb(58, 198, 240)", muted: "rgb(18, 34, 43)", label: "Copyleft" },
  "source-available": { accent: "rgb(232, 197, 71)", muted: "rgb(50, 38, 11)", label: "Source Available" },
  "public-domain": { accent: "rgb(212, 153, 255)", muted: "rgb(63, 39, 63)", label: "Public Domain" },
  proprietary: { accent: "rgb(255, 142, 71)", muted: "rgb(82, 31, 0)", label: "Proprietary" },
};

/** Zone-specific accent colors matching the website's semantic coloring. */
const ZONE_COLORS = {
  permissions: "rgb(21, 219, 149)",    // emerald
  conditions: "rgb(228, 197, 129)",    // ecru
  restrictions: "rgb(234, 100, 80)",   // restriction-red
  protections: "rgb(108, 166, 193)",   // air-superiority-blue
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
  const readabilityScore = metadata.plain_gunning_fog;
  const originalScore = metadata.original?.original_gunning_fog;

  // Track which zone we're currently inside
  let currentZone: string | null = null;
  let firstH1Skipped = false;
  const tokens = marked.lexer(markdown);
  let body = "";

  function escapeTypst(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/#/g, "\\#")
      .replace(/\$/g, "\\$")
      .replace(/@/g, "\\@")
      .replace(/</g, "\\<")
      .replace(/>/g, "\\>");
  }

  function processTokens(tokens: any[], depth = 0): string {
    let result = "";
    for (const token of tokens) {
      switch (token.type) {
        case "heading": {
          const headingText = processTokens(token.tokens, depth);
          if (token.depth === 1 && !firstH1Skipped) {
            // Skip the first H1 — it duplicates the title block
            firstH1Skipped = true;
            break;
          }
          if (token.depth === 1) {
            // H1 — major section header (e.g. "Original License Text")
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
          result += token.tokens ? processTokens(token.tokens, depth) : escapeTypst(token.text);
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
              .replace(/\n{2,}/g, "\n")   // collapse double newlines to preserve Typst nesting
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
        case "code":
          result += `#block(fill: rgb(22, 25, 35), inset: 12pt, radius: 4pt, width: 100%)[\n`;
          result += `#text(font: "JetBrains Mono", size: 8.5pt, fill: rgb(200, 210, 225))[${escapeTypst(token.text)}]\n`;
          result += `]\n\n`;
          break;
        case "blockquote":
          result += `#block(inset: (left: 16pt, y: 8pt), stroke: (left: 3pt + rgb(108, 166, 193)))[\n`;
          result += `#text(fill: rgb(160, 170, 185), style: "italic")[${processTokens(token.tokens, depth)}]\n`;
          result += `]\n\n`;
          break;
        case "table": {
          const cols = token.header.length;
          const header = token.header
            .map((h: any) => `[*${processTokens(h.tokens, depth)}*]`)
            .join(", ");
          const rows = token.rows
            .map((row: any) =>
              row.map((cell: any) => `[${processTokens(cell.tokens, depth)}]`).join(", "),
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

  // Build the TL;DR callout
  const tldrBlock = tldr.length > 0
    ? `#block(
  fill: rgb(22, 25, 35),
  stroke: (left: 4pt + ${colors.accent}),
  inset: (left: 16pt, right: 16pt, top: 12pt, bottom: 12pt),
  radius: (right: 4pt),
  width: 100%,
)[
  #text(font: "Plus Jakarta Sans", size: 9pt, weight: "bold", fill: ${colors.accent})[TL;DR]
  #v(4pt)
  ${tldr.map(item => `- #text(size: 10pt)[${escapeTypst(item)}]`).join("\n  ")}
]

#v(0.75em)
`
    : "";

  // Build readability stats if available
  const readabilityBlock = readabilityScore != null
    ? `#block(
  fill: rgb(22, 25, 35),
  inset: 12pt,
  radius: 4pt,
  width: 100%,
)[
  #text(font: "Plus Jakarta Sans", size: 9pt, weight: "bold", fill: rgb(160, 170, 185))[READABILITY]
  #v(4pt)
  #grid(
    columns: (1fr, 1fr),
    gutter: 8pt,
    [#text(size: 9pt, fill: rgb(120, 130, 145))[Plain version:] #text(size: 10pt, weight: "bold", fill: ${colors.accent})[${readabilityScore.toFixed(1)}]],
    [${originalScore != null ? `#text(size: 9pt, fill: rgb(120, 130, 145))[Original:] #text(size: 10pt, fill: rgb(160, 170, 185))[${originalScore.toFixed(1)}]` : ""}],
  )
  #v(2pt)
  #text(size: 8pt, fill: rgb(100, 110, 125))[Gunning Fog Index — lower is easier to read. Aim for < 12.]
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

// Readability
${readabilityBlock}

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
  // Original license sections get a muted treatment
  if (zone.startsWith("original")) return "rgb(100, 110, 125)";
  return "rgb(160, 170, 185)";
}

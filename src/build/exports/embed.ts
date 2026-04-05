/**
 * Self-contained embed HTML export generator.
 *
 * Produces a complete HTML document with inlined styles that adapts to the
 * host environment via `prefers-color-scheme` media query. Host sites can
 * further customise by overriding `--pl-*` CSS custom properties.
 *
 * Light-mode values are drawn from the same palette as the print stylesheet
 * to ensure visual coherence across exported formats.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { annotateHtmlString } from "../../data/plainTerms";
import { licenseUrl } from "../../utils/constants";
import type { ExportContext } from "./index";
import { stripHtmlDivs } from "./transforms";

// ── Category colour map ────────────────────────────────────────────

interface CategoryColors {
  accent: string;
  accentRgb: string;
  /** Darkened version for light-mode text contrast */
  accentDark: string;
  label: string;
}

const CATEGORY_COLORS: Record<string, CategoryColors> = {
  permissive: {
    accent: "rgb(21, 219, 149)",
    accentRgb: "21, 219, 149",
    accentDark: "rgb(9, 93, 64)",
    label: "Permissive",
  },
  copyleft: {
    accent: "rgb(58, 198, 240)",
    accentRgb: "58, 198, 240",
    accentDark: "rgb(20, 100, 130)",
    label: "Copyleft",
  },
  "source-available": {
    accent: "rgb(232, 197, 71)",
    accentRgb: "232, 197, 71",
    accentDark: "rgb(140, 115, 20)",
    label: "Source Available",
  },
  "public-domain": {
    accent: "rgb(212, 153, 255)",
    accentRgb: "212, 153, 255",
    accentDark: "rgb(120, 60, 170)",
    label: "Public Domain",
  },
  proprietary: {
    accent: "rgb(255, 142, 71)",
    accentRgb: "255, 142, 71",
    accentDark: "rgb(170, 80, 20)",
    label: "Proprietary",
  },
};

const DEFAULT_COLORS: CategoryColors = {
  accent: "rgb(21, 219, 149)",
  accentRgb: "21, 219, 149",
  accentDark: "rgb(9, 93, 64)",
  label: "License",
};

// ── Markdown pre-processing ────────────────────────────────────────

/** Convert PyMdown `^^text^^` caret syntax to `<ins>`. */
function convertCaretInsert(md: string): string {
  return md.replace(/\^\^((?:[^^]|\^(?!\^))+?)\^\^/g, "<ins>$1</ins>");
}

/** Convert mkdocs definition lists under ## Definitions to <dl>. */
function convertDefinitionLists(md: string): string {
  const sectionPattern =
    /(## Definitions\n)([\s\S]*?)(?=\n##\s|\n\{\{block:|\n---|\n$)/g;

  return md.replace(sectionPattern, (_match, heading: string, body: string) => {
    const entries: { term: string; definition: string }[] = [];
    const lines = body.split("\n");
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      const termMatch = line.match(/^`([^`]+)`(?:\s+and\s+`([^`]+)`)?$/);
      if (termMatch) {
        const term = termMatch[2]
          ? `${termMatch[1]} / ${termMatch[2]}`
          : termMatch[1];
        i++;
        while (i < lines.length && lines[i].trim() === "") i++;
        if (i < lines.length && lines[i].trim().startsWith(":")) {
          const def = lines[i].trim().replace(/^:\s+/, "");
          entries.push({ term, definition: def });
        }
      }
      i++;
    }

    if (entries.length === 0) return heading + body;
    const dlHtml = entries
      .map((e) => `  <dt>${e.term}</dt>\n  <dd>${e.definition}</dd>`)
      .join("\n");
    return `${heading}\n<dl class="pl-definitions">\n${dlHtml}\n</dl>\n\n`;
  });
}

/** Strip `<!-- semantic:... -->` wrappers, keeping inner content. */
function stripSemanticMarkers(content: string): string {
  return content.replace(
    /<!-- semantic:([a-z0-9-]+) -->\n?([\s\S]*?)\n?<!-- \/semantic:\1 -->/g,
    (_match, _id, inner) => inner,
  );
}

/**
 * Render markdown to HTML for the embed, with mkdocs extension support.
 * Strips div wrappers and semantic markers first.
 */
function renderContent(md: string): string {
  let content = stripHtmlDivs(md);
  content = stripSemanticMarkers(content);
  content = convertCaretInsert(convertDefinitionLists(content));
  return marked.parse(content) as string;
}

// ── HTML template ──────────────────────────────────────────────────

function buildEmbedHtml(ctx: ExportContext, renderedBody: string): string {
  const { plainId, version, licenseId, metadata } = ctx;
  const cat = CATEGORY_COLORS[metadata.license_family] ?? DEFAULT_COLORS;
  const title = metadata.plain_name || metadata.title || plainId;
  const originalName = metadata.original?.name ?? licenseId;
  const canonicalUrl =
    metadata.original?.canonical_url ??
    `https://spdx.org/licenses/${licenseId}.html`;
  const slug = metadata.slug ?? licenseId.toLowerCase();
  const pageUrl = licenseUrl(slug);

  // TL;DR items
  const tldrItems: string[] = metadata.tldr ?? [];
  const tldrHtml =
    tldrItems.length > 0
      ? `<ul class="pl-tldr">\n${tldrItems.map((t: string) => `      <li>${t}</li>`).join("\n")}\n    </ul>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} (v${version})</title>
<meta name="generator" content="Plain License — plainlicense.org">
<meta name="license" content="${licenseId}">
<style>
/* ═══════════════════════════════════════════════════════════════════
   Plain License Embed — Self-contained, theme-adaptive
   Override any --pl-* variable on a parent element to customise.
   ═══════════════════════════════════════════════════════════════════ */

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  /* ── Light mode (default) ────────────────────────────── */
  --pl-bg: #fff;
  --pl-surface: #f5f5f5;
  --pl-border: #ddd;
  --pl-text: #1a1a1a;
  --pl-text-secondary: #555;
  --pl-text-muted: #777;
  --pl-accent: ${cat.accentDark};
  --pl-accent-rgb: ${cat.accentRgb};
  --pl-accent-bg: rgba(${cat.accentRgb}, 0.08);
  --pl-accent-border: rgba(${cat.accentRgb}, 0.25);
  --pl-code-bg: #f0f0f0;
  --pl-link: ${cat.accentDark};

  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: var(--pl-text);
  background: var(--pl-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@media (prefers-color-scheme: dark) {
  :root {
    --pl-bg: #0d0f15;
    --pl-surface: #161923;
    --pl-border: #242836;
    --pl-text: #e8eaf0;
    --pl-text-secondary: #c0c4d0;
    --pl-text-muted: #8b90a0;
    --pl-accent: ${cat.accent};
    --pl-accent-bg: rgba(${cat.accentRgb}, 0.06);
    --pl-accent-border: rgba(${cat.accentRgb}, 0.2);
    --pl-code-bg: #161923;
    --pl-link: ${cat.accent};
  }
}

body {
  background: var(--pl-bg);
  padding: 0;
  margin: 0;
}

/* ── Container ─────────────────────────────────────────── */

.pl-embed {
  max-width: 72ch;
  margin: 0 auto;
  padding: 2rem 2.5rem;
}

/* ── Header ────────────────────────────────────────────── */

.pl-header {
  margin-bottom: 1.75rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--pl-border);
}

.pl-title {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--pl-text);
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.pl-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--pl-text-muted);
}

.pl-badge {
  display: inline-block;
  padding: 0.15em 0.6em;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pl-accent);
  background: var(--pl-accent-bg);
  border: 1px solid var(--pl-accent-border);
  border-radius: 99px;
}

.pl-meta a {
  color: var(--pl-text-muted);
  text-decoration: underline;
  text-decoration-color: var(--pl-border);
  text-underline-offset: 2px;
}

.pl-meta a:hover {
  color: var(--pl-link);
  text-decoration-color: var(--pl-link);
}

/* ── TL;DR ─────────────────────────────────────────────── */

.pl-tldr {
  margin: 0 0 1.75rem;
  padding: 1rem 1.25rem 1rem 1.5rem;
  list-style: none;
  background: var(--pl-accent-bg);
  border-left: 3px solid var(--pl-accent);
  border-radius: 0 8px 8px 0;
}

.pl-tldr li {
  position: relative;
  padding-left: 1.1em;
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
  color: var(--pl-text-secondary);
}

.pl-tldr li:last-child {
  margin-bottom: 0;
}

.pl-tldr li::before {
  content: "\\2022";
  position: absolute;
  left: 0;
  color: var(--pl-accent);
  font-weight: 700;
}

/* ── Body ──────────────────────────────────────────────── */

.pl-body h1 {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--pl-text);
  margin: 2rem 0 0.75rem;
  letter-spacing: -0.01em;
}

.pl-body h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--pl-text);
  margin: 1.75rem 0 0.6rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--pl-border);
}

.pl-body h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--pl-text);
  margin: 1.25rem 0 0.4rem;
}

.pl-body p {
  margin-bottom: 0.9rem;
  color: var(--pl-text-secondary);
}

.pl-body ul,
.pl-body ol {
  padding-left: 1.5rem;
  margin-bottom: 0.9rem;
  color: var(--pl-text-secondary);
}

.pl-body li {
  margin-bottom: 0.3rem;
}

.pl-body li > p {
  margin-bottom: 0.3rem;
}

.pl-body strong {
  color: var(--pl-text);
  font-weight: 600;
}

.pl-body em {
  font-style: italic;
}

.pl-body a {
  color: var(--pl-link);
  text-decoration: underline;
  text-decoration-color: rgba(${cat.accentRgb}, 0.4);
  text-underline-offset: 2px;
  transition: text-decoration-color 0.15s;
}

.pl-body a:hover {
  text-decoration-color: var(--pl-link);
}

.pl-body code {
  font-family: ui-monospace, "Cascadia Code", "JetBrains Mono", Menlo, monospace;
  font-size: 0.85em;
  padding: 0.15em 0.35em;
  background: var(--pl-code-bg);
  border: 1px solid var(--pl-border);
  border-radius: 4px;
  color: var(--pl-text);
}

.pl-body pre {
  margin: 0.9rem 0;
  padding: 1rem;
  background: var(--pl-code-bg);
  border: 1px solid var(--pl-border);
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.85rem;
  line-height: 1.5;
}

.pl-body pre code {
  padding: 0;
  background: none;
  border: none;
}

.pl-body blockquote {
  margin: 0.9rem 0;
  padding: 0.5rem 1rem;
  border-left: 3px solid var(--pl-accent-border);
  color: var(--pl-text-secondary);
}

.pl-body ins {
  text-decoration: none;
  background: linear-gradient(
    to top,
    rgba(${cat.accentRgb}, 0.2) 0%,
    rgba(${cat.accentRgb}, 0.2) 35%,
    transparent 35%
  );
  padding: 0 0.05em;
}

.pl-body hr {
  margin: 2rem 0;
  border: none;
  border-top: 1px solid var(--pl-border);
}

/* ── Definition lists ──────────────────────────────────── */

.pl-definitions {
  margin: 1.25rem 0;
  border: 1px solid var(--pl-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--pl-surface);
}

.pl-definitions dt {
  font-family: ui-monospace, "Cascadia Code", "JetBrains Mono", Menlo, monospace;
  font-size: 0.88em;
  font-weight: 600;
  color: var(--pl-accent);
  padding: 0.75rem 1rem 0.2rem;
  border-top: 1px solid var(--pl-border);
  background: var(--pl-accent-bg);
}

.pl-definitions dt:first-child {
  border-top: none;
}

.pl-definitions dd {
  margin: 0;
  padding: 0.2rem 1rem 0.75rem;
  font-size: 0.88rem;
  color: var(--pl-text-secondary);
  line-height: 1.6;
  background: var(--pl-accent-bg);
}

/* ── Footnotes ─────────────────────────────────────────── */

.pl-body sup a {
  color: var(--pl-accent);
  font-size: 0.8em;
  text-decoration: none;
  font-weight: 600;
}

.pl-body .footnotes {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pl-border);
  font-size: 0.85rem;
  color: var(--pl-text-muted);
}

/* ── Plain Term Annotations ───────────────────────────── */

abbr.plain-term {
  text-decoration: underline dotted var(--pl-text-muted);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
  cursor: help;
}

abbr.plain-term:hover,
abbr.plain-term:focus-visible {
  text-decoration-color: var(--pl-accent);
  outline: none;
}

/* ── Footer ────────────────────────────────────────────── */

.pl-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pl-border);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--pl-text-muted);
}

.pl-footer a {
  color: var(--pl-accent);
  text-decoration: none;
}

.pl-footer a:hover {
  text-decoration: underline;
}

/* ── Responsive ────────────────────────────────────────── */

@media (max-width: 600px) {
  .pl-embed {
    padding: 1.25rem 1rem;
  }

  .pl-title {
    font-size: 1.3rem;
  }

  .pl-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}

/* ── Print: inherit light mode ─────────────────────────── */

@media print {
  :root {
    --pl-bg: #fff;
    --pl-surface: #f5f5f5;
    --pl-border: #ddd;
    --pl-text: #1a1a1a;
    --pl-text-secondary: #333;
    --pl-text-muted: #555;
    --pl-accent: ${cat.accentDark};
    --pl-accent-bg: rgba(${cat.accentRgb}, 0.06);
    --pl-accent-border: rgba(${cat.accentRgb}, 0.2);
    --pl-code-bg: #f0f0f0;
    --pl-link: #1a1a1a;
  }

  .pl-embed {
    max-width: 100%;
    padding: 0;
  }

  .pl-footer a::after {
    content: " (" attr(href) ")";
    font-size: 0.65rem;
    color: #777;
  }
}
</style>
</head>
<body>
<article class="pl-embed" data-license="${licenseId}" data-version="${version}" data-family="${metadata.license_family || ""}">
  <header class="pl-header">
    <h1 class="pl-title">${title}</h1>
    <div class="pl-meta">
      <span class="pl-badge">${cat.label}</span>
      <span>v${version}</span>
      <span>\u00b7</span>
      <span>Based on <a href="${canonicalUrl}" rel="noopener">${originalName}</a></span>
    </div>
  </header>

  ${tldrHtml ? `<section class="pl-tldr-section" aria-label="Summary">\n    ${tldrHtml}\n  </section>` : ""}

  <div class="pl-body">
    ${renderedBody}
  </div>

  <footer class="pl-footer">
    <span><a href="${pageUrl}">plainlicense.org</a></span>
    <span>${plainId} v${version} \u00b7 ${licenseId}</span>
  </footer>
</article>
</body>
</html>`;
}

// ── Public API ──────────────────────────────────────────────────────

export async function generateEmbed(ctx: ExportContext): Promise<void> {
  const { plainId, version, content, outputDir } = ctx;
  const fileName = `${plainId}-${version}-embed.html`;
  const filePath = path.join(outputDir, fileName);

  const renderedBody = annotateHtmlString(renderContent(content));
  const html = buildEmbedHtml(ctx, renderedBody);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, html);
  console.log(`Generated Embed HTML export: ${filePath}`);
}

# Print Stylesheet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a print stylesheet that makes license pages produce beautiful, well-formatted printed documents — white background, readable in grayscale, with all content visible and interactive elements hidden.

**Architecture:** A single `print.css` file loaded globally via Astro's customCss array. Uses `@media print` to override screen styles. No JavaScript changes needed — CSS-only approach using `display: none`, forced `<details>` open state, and print-specific typography/color overrides.

**Tech Stack:** CSS `@media print`, CSS custom properties, Astro customCss config

---

## Context

License pages (`src/pages/licenses/[...slug].astro`) use a tab UI with two panels:
- **Quick Reference** (zone-based anatomy, 7 zones) — default visible
- **Full License Text** (rendered markdown with optional original comparison) — hidden by default

For print, we show **both panels** sequentially (Quick Reference first, then Full License Text), with all collapsed `<details>` elements forced open, and all interactive/navigation elements hidden.

### Layout used by license pages

License pages use `src/layouts/BaseLayout.astro` (NOT Starlight's layout). The structure is:

```
<body>
  <a class="skip-link">
  <header class="site-header">       ← HIDE
    <div class="header-inner">
    <nav class="mobile-nav">
  <main class="page-main">
    <div class="license-container cat-{family}">
      <nav class="license-tabs">      ← HIDE
      <div#panel-reference .tab-panel> ← FORCE VISIBLE
        <article .plain-license>
          Zone 1: .zone-identity
          Zone 2: .zone-permissions
          Zone 3: .zone-conditions     (conditional)
          Zone 4: .zone-credit         (conditional)
          .fold-divider                ← HIDE label, keep line
          Zone 5: .zone-restrictions   (conditional)
          CompareWith                  ← HIDE (links don't work on paper)
          Zone 6: <details .zone-protections>  ← FORCE OPEN
          Zone 7: <details .zone-interpretation> ← FORCE OPEN
      <div#panel-fulltext .tab-panel>  ← FORCE VISIBLE
        .fulltext-readability bar
        .license-layout
          .plain-version column
          .original-version column     ← only if comparison active
      <section .download-section>      ← HIDE entirely
      <div .reference-fold>
      <div .reference-section>
        ReadabilitySidebar
        VersionHistory
        NotLegalAdvice
      ComparisonModal                  ← HIDE
  <footer class="site-footer">         ← HIDE
  #scroll-to-top                       ← HIDE
```

### Starlight pages

Pages that go through Starlight's layout (blog, about, FAQ, etc.) use different markup. The print stylesheet should provide basic coverage for those too (hide nav chrome, white bg), but the primary focus is license pages.

### Color strategy

The site uses category colors (`--cat-color`) for each license family:
- Permissive: emerald green
- Copyleft: vivid sky blue  
- Source-available: saffron yellow
- Public-domain: mauve purple

**For print:** Keep category colors for borders and accent lines — they provide visual hierarchy. But ensure all TEXT has sufficient contrast on white paper. The key principle: color adds meaning but is never the ONLY way to convey information. In grayscale, the borders and backgrounds become varying shades of gray, which still provides visual separation.

---

### Task 1: Create the print stylesheet file

**Files:**
- Create: `src/assets/stylesheets/print.css`

**Step 1: Create the base print reset**

```css
/* ══════════════════════════════════════════════════════════════
   Print Stylesheet — Plain License
   
   Design principles:
   - White background, dark text
   - Category colors for accents (grayscale-safe)
   - All content visible (no hidden tabs, no collapsed details)
   - No interactive elements (buttons, toggles, modals)
   - Clean page breaks between major sections
   ══════════════════════════════════════════════════════════════ */

@media print {
  /* ── Reset: white canvas ──────────────────────────────────── */
  :root,
  :root[data-theme="dark"] {
    --sl-color-bg: #fff;
    --sl-color-bg-nav: #fff;
    --sl-color-bg-sidebar: #fff;
    --sl-color-text: #1a1a1a;
    --sl-color-text-accent: #0d19a3;
    --sl-color-white: #1a1a1a;
    --sl-color-black: #fff;
    --sl-color-gray-1: #1a1a1a;
    --sl-color-gray-2: #333;
    --sl-color-gray-3: #555;
    --sl-color-gray-4: #999;
    --sl-color-gray-5: #ccc;
    --sl-color-gray-6: #f5f5f5;
    --sl-color-gray-7: #fff;
    --sl-color-hairline: #ddd;
    --sl-color-hairline-light: #eee;
    --bg: #fff;
    --bg-surface: #f5f5f5;
    --bg-border: #ddd;
    --text: #1a1a1a;
    --text-muted: #555;
    color-adjust: exact;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  html {
    background: #fff;
    color: #1a1a1a;
    font-size: 11pt;
  }

  body {
    background: #fff;
    margin: 0;
  }

  /* ── Hide site chrome & interactive elements ──────────────── */
  .site-header,
  .site-footer,
  .skip-link,
  .mobile-menu-toggle,
  .mobile-nav,
  #scroll-to-top,
  .license-tabs,
  .download-section,
  .copy-button,
  #copy-clipboard,
  #copy-status,
  #embed-panel,
  #embed-toggle,
  #comparison-toggle-wrapper,
  .comparison-toggle,
  .toggle-btn,
  #comparison-modal,
  .fn-tooltip,
  .compare-with {
    display: none !important;
  }

  /* Starlight chrome (for non-license pages) */
  .sidebar-pane,
  starlight-menu-button,
  starlight-theme-select,
  .right-sidebar,
  .pagination-links,
  [data-pagefind-ignore] {
    display: none !important;
  }

  /* ── Show all tab panels ──────────────────────────────────── */
  .tab-panel,
  .tab-panel[hidden] {
    display: block !important;
    visibility: visible !important;
  }

  /* ── Force details elements open ──────────────────────────── */
  details,
  details.zone-protections,
  details.zone-interpretation {
    open: true; /* Progressive — not widely supported yet */
  }

  /* Fallback: make content visible regardless of open state */
  details > summary {
    list-style: none;
    cursor: default;
  }

  details > summary::-webkit-details-marker {
    display: none;
  }

  .summary-arrow {
    display: none !important;
  }

  details > *:not(summary) {
    display: block !important;
  }

  /* ── Page break management ────────────────────────────────── */

  /* Never break inside these */
  .zone,
  .zone-identity,
  .zone-permissions,
  .zone-conditions,
  .zone-credit,
  .zone-protections,
  .zone-interpretation,
  .zone-restrictions,
  .permission-card,
  .restriction-card,
  .condition-card,
  .tldr-block,
  .copyright-block,
  .attribution-template,
  .readability-bar,
  .reference-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Encourage break before major sections */
  #panel-fulltext {
    break-before: page;
    page-break-before: always;
  }

  .reference-fold {
    break-before: page;
    page-break-before: always;
  }

  /* Headings should not be orphaned */
  h1, h2, h3, h4, h5, h6 {
    break-after: avoid;
    page-break-after: avoid;
  }

  /* Avoid widows and orphans */
  p {
    orphans: 3;
    widows: 3;
  }

  /* ── Typography for print ─────────────────────────────────── */

  .license-container {
    max-width: 100%;
    padding: 0;
    margin: 0;
  }

  .page-main {
    padding: 0;
  }

  /* License title */
  .license-title {
    font-size: 22pt;
    color: #1a1a1a;
  }

  /* Zone headings */
  .zone-heading {
    font-size: 14pt;
    color: #1a1a1a;
    border-bottom: 1.5pt solid #333;
    padding-bottom: 4pt;
  }

  .zone-heading--permissions {
    color: #1a1a1a;
  }

  /* Body text */
  .full-license-text {
    max-width: 100%;
    font-size: 10.5pt;
    line-height: 1.6;
    color: #1a1a1a;
  }

  .full-license-text h1 {
    font-size: 18pt;
    color: #1a1a1a;
  }

  .full-license-text h2 {
    font-size: 13pt;
    color: #1a1a1a;
    border-bottom: 0.75pt solid #999;
  }

  .full-license-text strong {
    color: #1a1a1a;
  }

  /* ── Links: show URL ──────────────────────────────────────── */
  .full-license-text a[href^="http"]::after,
  .interpretation-content a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 8pt;
    color: #555;
    word-break: break-all;
  }

  /* Don't show URL for internal navigation links */
  .full-license-text a[href^="/"]::after,
  .full-license-text a[href^="#"]::after {
    content: none;
  }

  /* ── Badges: ensure readability ───────────────────────────── */
  .family-badge {
    border: 1.5pt solid #333;
    color: #333;
    background: #f0f0f0;
    font-size: 8pt;
    padding: 2pt 8pt;
  }

  .dedication-badge {
    border: 1.5pt solid #555;
    color: #555;
    background: #f5f5f5;
  }

  .column-badge {
    border: 1pt solid #999;
    background: #f5f5f5;
    color: #333;
  }

  /* ── TL;DR block ──────────────────────────────────────────── */
  .tldr-block {
    background: #f8f8f8;
    border: 1pt solid #ccc;
    border-left: 4pt solid #333;
  }

  .tldr-header strong {
    color: #1a1a1a;
  }

  .tldr-list li {
    color: #1a1a1a;
  }

  /* ── Permission/restriction cards ─────────────────────────── */
  .permission-card {
    border: 1pt solid #ccc;
    border-top: 2.5pt solid #555;
    background: #fafafa;
  }

  .permission-card:hover {
    transform: none;
  }

  .card-icon {
    color: #333;
  }

  .card-label {
    color: #1a1a1a;
  }

  /* ── Zone backgrounds ─────────────────────────────────────── */
  .zone-permissions {
    background: #fafafa;
    border: 1pt solid #ddd;
    border-radius: 6pt;
  }

  .zone-credit {
    border-left: 3pt solid #555;
    background: #fafafa;
  }

  .zone-protections {
    border: 1pt solid #ccc;
    border-left: 3pt solid #777;
    background: #fafafa;
  }

  .zone-interpretation {
    border: 1pt solid #ccc;
    border-left: 3pt solid #999;
    background: #fafafa;
  }

  .protections-summary,
  .interpretation-summary {
    cursor: default;
    padding: 8pt 12pt;
    font-weight: 700;
    border-bottom: 1pt solid #ddd;
  }

  .protections-summary:hover,
  .interpretation-summary:hover {
    background: transparent;
  }

  .summary-icon {
    color: #555;
  }

  /* ── Callout (source-available warning) ───────────────────── */
  .callout--important {
    border: 1.5pt solid #555;
    background: #f8f8f8;
  }

  .callout-icon {
    color: #555;
  }

  /* ── Copyright block ──────────────────────────────────────── */
  .copyright-block {
    background: #f5f5f5;
    border: 1pt solid #ccc;
  }

  .placeholder {
    color: #555;
    font-style: italic;
  }

  /* ── Attribution template ─────────────────────────────────── */
  .attribution-template {
    background: #f5f5f5;
    border: 1pt solid #ccc;
  }

  .example-item {
    background: #fafafa;
    border: 1pt solid #ccc;
  }

  .example-context {
    background: #eee;
    color: #333;
  }

  .not-required-box {
    background: #f5f5f5;
    border: 1pt solid #ccc;
  }

  /* ── Readability bar (fulltext tab) ───────────────────────── */
  .readability-bar {
    background: #f5f5f5;
    border: 1pt solid #ccc;
  }

  .bar-stat-score {
    color: #1a1a1a;
  }

  .bar-stat--plain .bar-stat-score {
    color: #1a1a1a;
    font-weight: 800;
  }

  .bar-improvement {
    background: #eee;
    color: #333;
  }

  /* ── Reference section ────────────────────────────────────── */
  .reference-section {
    background: #fafafa;
    border: 1pt solid #ccc;
  }

  /* ── Fold dividers ────────────────────────────────────────── */
  .fold-divider {
    margin: 1.5rem 0 1rem;
  }

  .fold-label {
    background: #f0f0f0;
    border: 1pt solid #ccc;
    color: #555;
  }

  .fold-divider::before,
  .fold-divider::after {
    background: #ccc;
  }

  .reference-fold .fold-rule {
    background: #ccc;
  }

  .reference-fold .fold-note {
    color: #555;
  }

  /* ── Definition lists ─────────────────────────────────────── */
  .full-license-text dl.license-definitions {
    border: 1pt solid #ccc;
    background: #fafafa;
  }

  .full-license-text dl.license-definitions dt {
    border-top-color: #ddd;
    background: #f5f5f5;
    color: #1a1a1a;
    font-weight: 700;
  }

  .full-license-text dl.license-definitions dd {
    background: #fafafa;
    color: #333;
  }

  /* ── Code blocks ──────────────────────────────────────────── */
  .full-license-text code,
  code {
    background: #f0f0f0;
    border: 0.5pt solid #ccc;
    color: #1a1a1a;
  }

  pre {
    background: #f5f5f5 !important;
    border: 1pt solid #ccc !important;
  }

  pre code {
    border: none !important;
    background: none !important;
  }

  /* ── Blockquotes ──────────────────────────────────────────── */
  .prose blockquote,
  blockquote {
    border-left: 3pt solid #999;
    color: #333;
  }

  /* ── Insert/underline emphasis ─────────────────────────────── */
  .full-license-text ins {
    background: none;
    text-decoration: underline;
    text-decoration-thickness: 1.5pt;
    text-underline-offset: 2pt;
  }

  /* ── Footnote markers (print-friendly) ────────────────────── */
  .fn-marker {
    color: #333;
    cursor: default;
  }

  .fn-marker:hover {
    color: #333;
  }

  /* ── Suppress hover/transition effects ────────────────────── */
  * {
    transition: none !important;
    animation: none !important;
  }

  a {
    color: #1a1a1a;
    text-decoration: underline;
  }

  /* ── Highlight strips (from mapping viewer) ───────────────── */
  .highlight-active,
  .highlight-match {
    background: none !important;
    box-shadow: none !important;
  }

  /* ── Print header — branding at top of first page ─────────── */
  .license-container::before {
    content: "Plain License — plainlicense.org";
    display: block;
    font-size: 9pt;
    color: #777;
    text-align: right;
    padding-bottom: 8pt;
    margin-bottom: 16pt;
    border-bottom: 0.5pt solid #ccc;
  }

  /* ── Panel separator ──────────────────────────────────────── */
  #panel-fulltext::before {
    content: "Full License Text";
    display: block;
    font-size: 18pt;
    font-weight: 800;
    color: #1a1a1a;
    margin-bottom: 16pt;
    padding-bottom: 6pt;
    border-bottom: 2pt solid #333;
  }

  /* ── Page margins via @page ───────────────────────────────── */
  @page {
    margin: 2cm 2.5cm;
    size: auto;
  }

  @page :first {
    margin-top: 2.5cm;
  }
}
```

**Step 2: Run a quick visual check**

Open a license page in the browser, hit Ctrl+P, and verify the basic structure renders correctly. Adjust any obvious issues.

**Step 3: Commit**

```bash
git add src/assets/stylesheets/print.css
git commit -m "new(ui): add print stylesheet for license pages"
```

---

### Task 2: Register the stylesheet in Astro config

**Files:**
- Modify: `astro.config.mts:329` (customCss array)
- Modify: `src/layouts/BaseLayout.astro` (add import)

**Step 1: Add to Starlight's customCss**

In `astro.config.mts`, the `customCss` array at line 329 currently has:
```ts
customCss: ["./src/assets/stylesheets/custom.css"],
```

Change to:
```ts
customCss: [
  "./src/assets/stylesheets/custom.css",
  "./src/assets/stylesheets/print.css",
],
```

This covers all Starlight-rendered pages (blog, about, FAQ, etc.).

**Step 2: Import in BaseLayout.astro**

License pages use `BaseLayout.astro`, not Starlight's layout. Add the print stylesheet import in the frontmatter section (after the existing style imports around line 7):

In `src/layouts/BaseLayout.astro`, inside the `<head>`:
```astro
<link rel="stylesheet" href="/print.css" media="print" />
```

Wait — Astro handles CSS imports differently. The correct approach is to import it in the frontmatter:

```ts
import "../assets/stylesheets/print.css";
```

But since `print.css` is wrapped entirely in `@media print`, importing it globally is safe — it won't affect screen rendering at all. Add the import in BaseLayout's frontmatter.

**Step 3: Verify both entry points load the stylesheet**

- Visit a Starlight page (e.g., /about/) → Ctrl+P → verify basic print cleanup
- Visit a license page (e.g., /licenses/mit) → Ctrl+P → verify full print treatment

**Step 4: Commit**

```bash
git add astro.config.mts src/layouts/BaseLayout.astro
git commit -m "chore(ui): register print stylesheet in Astro config and BaseLayout"
```

---

### Task 3: Test and refine with real license pages

**Files:**
- Modify: `src/assets/stylesheets/print.css` (refinements from testing)

**Step 1: Test with MIT (permissive, has attribution/credit zone)**

Open `/licenses/permissive/mit` → Print Preview. Check:
- [ ] White background, dark text
- [ ] Site header/footer hidden
- [ ] Tab nav hidden, both panels visible
- [ ] Quick Reference zones all visible
- [ ] Zone 6 (protections) content visible (not collapsed)
- [ ] Zone 7 (interpretation) content visible (not collapsed)
- [ ] Full License Text on new page
- [ ] Download section hidden
- [ ] Permission cards readable with borders
- [ ] TL;DR block has visible left border
- [ ] Copyright template block visible
- [ ] Credit zone (Zone 4) examples visible
- [ ] Category color accent visible but not required for meaning

**Step 2: Test with MPL-2.0 (copyleft, has footnotes, definitions)**

Open `/licenses/copyleft/mpl-2.0` → Print Preview. Check:
- [ ] Footnote markers visible (no tooltips)
- [ ] Definition list styled with borders
- [ ] Conditions zone visible
- [ ] All permission/condition/restriction cards break properly

**Step 3: Test with Elastic-2.0 (source-available, has commercial restrictions warning)**

Open `/licenses/source-available/elastic-2.0` → Print Preview. Check:
- [ ] Callout (commercial restrictions warning) has visible border
- [ ] Restriction cards visible and readable

**Step 4: Test with Unlicense (public-domain, simplest)**

Open `/licenses/public-domain/unlicense` → Print Preview. Check:
- [ ] Clean, simple layout
- [ ] No empty zones or awkward spacing

**Step 5: Test grayscale**

Print to PDF and convert to grayscale (or use browser DevTools to emulate). Verify:
- [ ] All text readable
- [ ] Borders and backgrounds provide sufficient contrast
- [ ] No information lost without color

**Step 6: Apply fixes discovered during testing**

Fix any issues found. Common things to look for:
- Backgrounds bleeding through (need `!important`)
- Stubborn dark-mode colors from Starlight internals
- Cards breaking across pages
- Excessive whitespace from hidden elements

**Step 7: Commit refinements**

```bash
git add src/assets/stylesheets/print.css
git commit -m "fix(ui): refine print stylesheet from cross-license testing"
```

---

### Task 4: Add print-specific content enhancements

**Files:**
- Modify: `src/assets/stylesheets/print.css`
- Possibly modify: `src/pages/licenses/[...slug].astro` (add print-only attribution footer)

**Step 1: Add a print-only attribution footer**

Add CSS-generated content at the end of the license container that only appears in print:

```css
@media print {
  .license-container::after {
    content: "Printed from plainlicense.org — Plain language versions of popular licenses.";
    display: block;
    margin-top: 2rem;
    padding-top: 0.75rem;
    border-top: 0.5pt solid #ccc;
    font-size: 8pt;
    color: #999;
    text-align: center;
  }
}
```

**Step 2: Add the "Compare with" section note**

Since we hide `.compare-with` (links don't work on paper), optionally add a note:

Actually, simply hiding it is cleaner. Links don't work on paper. Skip this.

**Step 3: Ensure the original-version column prints correctly**

When comparison mode is NOT active, `.original-version` is `display: none`. For print, we should keep it hidden unless the user had comparison active. Since we can't detect JS state in CSS alone, the safest approach is: print only the plain version by default. The full license text in panel-fulltext already shows the plain version.

**Step 4: Commit**

```bash
git add src/assets/stylesheets/print.css
git commit -m "chore(ui): add print-only attribution footer and polish"
```

---

### Task 5: Write tests (visual verification)

**Files:**
- No automated tests for print CSS (Playwright can't reliably test print media)

**Step 1: Manual verification checklist**

Print-to-PDF each of the 4 current licenses and verify:
1. MIT — permissive, attribution required, credit zone
2. MPL-2.0 — copyleft, footnotes, definition lists, conditions
3. Elastic-2.0 — source-available, commercial restrictions warning
4. Unlicense — public-domain, dedication badge, simplest

For each, confirm:
- White background throughout
- No dark-mode artifacts
- All zones visible
- Interactive elements hidden
- Page breaks sensible
- Text readable at 100% and 75% scale
- Grayscale remains beautiful

**Step 2: Optional — add a Playwright print-to-PDF smoke test**

If desired, a simple test that generates a PDF and checks it's non-empty:

```typescript
test("license page prints to PDF", async ({ page }) => {
  await page.goto("/licenses/permissive/mit");
  const pdf = await page.pdf({ format: "A4" });
  expect(pdf.length).toBeGreaterThan(1000);
});
```

This is optional and low-priority — print CSS is best verified visually.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore(ui): finalize print stylesheet for license pages"
```

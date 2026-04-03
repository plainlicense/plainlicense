# Design Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify the site's visual identity, fix broken elements (logo, theme consistency), improve typography, add visual hierarchy with category color-coding, and fill content gaps on the homepage.

**Architecture:** The site has two layout paths: `BaseLayout.astro` (homepage, licenses index, FAQ, about) and Starlight's layout (blog, license detail pages via `[...slug].astro`, helping pages). The overhaul aligns both paths to a shared design system by: (1) updating fonts site-wide, (2) establishing a shared color token system with category colors, (3) fixing the logo across both layouts, (4) theming the blog to match the dark main site, and (5) enriching the homepage with missing content sections.

**Tech Stack:** Astro 5 fonts API, Starlight CSS custom properties, CSS custom properties, Astro components

---

## Phase 1: Foundation — Fonts & Color Tokens

### Task 1: Update Font Configuration

**Files:**
- Modify: `astro.config.mts:222-277` (fonts array)
- Modify: `src/assets/stylesheets/custom.css:1-8` (CSS variable references)
- Modify: `src/layouts/BaseLayout.astro:188` (hardcoded font-family)

**Step 1: Update astro.config.mts fonts array**

Replace the entire `fonts` array (lines 222-277) with:

```typescript
fonts: [
  {
    cssVariable: "--sl-font",
    fallbacks: [
      "Noto Sans",
      "Helvetica Neue",
      "Helvetica",
      "system-ui",
      "sans-serif",
    ],
    formats: ["woff2", "woff"],
    name: "Lexend",
    provider: fontProviders.google(),
    styles: ["normal"],
    subsets: ["latin", "latin-ext"],
    weights: [300, 400, 500, 600, 700],
  },
  {
    cssVariable: "--sl-font-mono",
    fallbacks: [
      "Fira Code",
      "Inconsolata",
      "Monaco",
      "Consolas",
      "Courier New",
      "monospace",
    ],
    formats: ["woff2", "woff"],
    name: "JetBrains Mono",
    provider: fontProviders.google(),
    styles: ["normal", "italic"],
    subsets: ["latin", "latin-ext"],
    weights: [400, 500, 700],
  },
  {
    cssVariable: "--font-heading",
    fallbacks: [
      "Noto Sans",
      "Helvetica Neue",
      "Helvetica",
      "system-ui",
      "sans-serif",
    ],
    formats: ["woff2", "woff"],
    name: "Plus Jakarta Sans",
    provider: fontProviders.google(),
    styles: ["normal", "italic"],
    subsets: ["latin", "latin-ext"],
    weights: [500, 600, 700, 800],
  },
],
```

**Step 2: Update custom.css font references**

Replace `--font-raleway` with `--font-heading` in `src/assets/stylesheets/custom.css`:

```css
/* Line 13: site-title */
.site-title {
  font-family: var(--font-heading), sans-serif;
  font-weight: 700;
  letter-spacing: -0.05em;
}

/* Lines 29: heading font-family */
.sl-markdown-content h1,
.sl-markdown-content h2,
.sl-markdown-content h3,
.sl-markdown-content h4,
.sl-markdown-content h5,
.sl-markdown-content h6 {
  font-family: var(--font-heading);
  color: var(--zaffre);
}
```

**Step 3: Update BaseLayout.astro to use CSS variables instead of hardcoded fonts**

In `src/layouts/BaseLayout.astro`, change line 188 from:
```css
font-family: "Inter", "Noto Sans", system-ui, sans-serif;
```
to:
```css
font-family: var(--sl-font, "Lexend", "Noto Sans", system-ui, sans-serif);
```

Also update all heading styles in BaseLayout to use `--font-heading`:

In the `.page-header h1`, `.hero h1`, `.section-title`, `.category-header h2` selectors (both in index.astro and licenses/index.astro), add:
```css
font-family: var(--font-heading, "Plus Jakarta Sans", sans-serif);
```

And update `code` font-family (line 242):
```css
font-family: var(--sl-font-mono, "JetBrains Mono", "Fira Code", monospace);
```

**Step 4: Verify the dev server builds without errors**

Run: `cd /home/knitli/plainlicense && mise run dev`
Expected: Dev server starts, no font-related errors

**Step 5: Commit**

```bash
git add astro.config.mts src/assets/stylesheets/custom.css src/layouts/BaseLayout.astro src/pages/index.astro src/pages/licenses/index.astro
git commit -m "refactor(ui): replace Inter/Raleway/Source Code Pro with Lexend/Plus Jakarta Sans/JetBrains Mono"
```

---

### Task 2: Add Category Color Tokens

**Files:**
- Modify: `src/assets/stylesheets/colors.css` (add category color tokens)
- Modify: `src/assets/stylesheets/custom.css` (add category utility classes)

**Step 1: Add category color tokens to colors.css**

Append to `src/assets/stylesheets/colors.css`:

```css
/* Category Colors */
--cat-permissive: var(--emerald);
--cat-permissive-rgb: var(--emerald-rgb);
--cat-copyleft: var(--vivid-sky-blue);
--cat-copyleft-rgb: 58, 198, 240;
--cat-source-available: var(--saffron);
--cat-source-available-rgb: var(--saffron-rgb);
--cat-public-domain: var(--mauve);
--cat-public-domain-rgb: 212, 153, 255;
```

**Step 2: Add category utility classes to custom.css**

Append to `src/assets/stylesheets/custom.css`:

```css
/* Category Color System */
.cat-permissive { --cat-color: var(--cat-permissive); --cat-color-rgb: var(--cat-permissive-rgb); }
.cat-copyleft { --cat-color: var(--cat-copyleft); --cat-color-rgb: var(--cat-copyleft-rgb); }
.cat-source-available { --cat-color: var(--cat-source-available); --cat-color-rgb: var(--cat-source-available-rgb); }
.cat-public-domain { --cat-color: var(--cat-public-domain); --cat-color-rgb: var(--cat-public-domain-rgb); }
```

**Step 3: Commit**

```bash
git add src/assets/stylesheets/colors.css src/assets/stylesheets/custom.css
git commit -m "new(ui): add category color token system for license type visual coding"
```

---

## Phase 2: Logo & Header Fix

### Task 3: Fix Logo Rendering Across Both Layouts

The main site (BaseLayout) shows a CSS "PL" pill instead of the SVG logo. The blog (Starlight) renders the SVG but text overlaps. Both need to display the same logo consistently.

**Files:**
- Modify: `src/layouts/BaseLayout.astro:26-29` (replace text logo with SVG)
- Modify: `src/components/overrides/Header.astro` (fix BETA badge positioning)

**Step 1: Update BaseLayout header to use the SVG logo**

In `src/layouts/BaseLayout.astro`, replace the `.site-brand` link content (lines 26-29):

```astro
<a href="/" class="site-brand" aria-label="Plain License home">
  <img
    src="/favicon.svg"
    alt=""
    class="brand-logo"
    width="32"
    height="32"
    aria-hidden="true"
  />
  <span class="brand-name">Plain <strong>License</strong></span>
</a>
```

Note: We use `favicon.svg` (the standalone logo mark generated by the favicons integration) since `logo_named.svg` includes the text. If favicon.svg doesn't exist at the public root, we'll need to import the `logo_only_color_transp.svg` directly.

Replace `.brand-mark` CSS with `.brand-logo`:

```css
.brand-logo {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
}
```

Remove the old `.brand-mark` styles.

**Step 2: Fix Starlight Header BETA badge**

In `src/components/overrides/Header.astro`, the BETA badge uses `position: absolute; left: 11.5rem` which collides with the logo. Update:

```css
.beta-badge {
  position: relative;
  top: auto;
  left: auto;
  margin-left: 0.25rem;
  background-color: var(--sl-color-accent);
  color: var(--sl-color-gray-6);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  pointer-events: none;
  vertical-align: super;
}
```

And update the HTML structure to place the badge inline:

```astro
<div class="header-container">
  <Default {...Astro.props}><slot /></Default>
</div>
```

(Remove the separate `<span class="beta-badge">` — if the BETA badge is still desired, it should be added inside the Starlight title slot or handled via a CSS `::after` pseudo-element on the site title.)

**Step 3: Verify logo renders on both homepage and blog**

Run: `mise run dev`
Navigate to `http://localhost:4321/` — logo mark should appear
Navigate to `http://localhost:4321/blog/` — logo should appear consistently

**Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/overrides/Header.astro
git commit -m "fix(ui): render SVG logo consistently across BaseLayout and Starlight pages"
```

---

## Phase 3: Theme Unification — Dark Blog

### Task 4: Force Blog to Use Dark Theme

The blog uses Starlight's default light theme. The entire main site is dark. The blog must match.

**Files:**
- Modify: `src/components/overrides/Sidebar.astro` (ensure dark theme is applied)
- Modify: `src/assets/stylesheets/custom.css` (add dark-mode overrides for Starlight)
- Potentially modify: `astro.config.mts` Starlight config (if there's a theme default setting)

**Step 1: Check if Starlight has a default theme config**

Starlight doesn't have a `defaultTheme` config option out of the box, but it respects `data-theme` on `<html>`. The theme toggle in the blog header ("Auto") allows users to switch. We need to either:

a) Remove the theme toggle and force dark mode, OR
b) Ensure both light and dark themes look intentional

Option (a) is simplest and matches the main site (which has no toggle). To remove the toggle, override the `ThemeSelect` component:

Create `src/components/overrides/ThemeSelect.astro`:
```astro
---
// Empty override — removes the light/dark theme toggle
// The site is dark-only to match BaseLayout pages
---
<script>
  // Force dark theme on all Starlight pages
  document.documentElement.dataset.theme = 'dark';
  localStorage.setItem('starlight-theme', 'dark');
</script>
```

**Step 2: Register the ThemeSelect override in astro.config.mts**

Add to the `components` object in the starlight config (around line 317-320):
```typescript
components: {
  Header: "./src/components/overrides/Header.astro",
  Footer: "./src/components/overrides/Footer.astro",
  Sidebar: "./src/components/overrides/Sidebar.astro",
  ThemeSelect: "./src/components/overrides/ThemeSelect.astro",
},
```

**Step 3: Verify blog now renders dark**

Run: `mise run dev`
Navigate to `http://localhost:4321/blog/` — should now render with dark background matching the main site.

**Step 4: Commit**

```bash
git add src/components/overrides/ThemeSelect.astro astro.config.mts
git commit -m "fix(ui): force dark theme on Starlight pages to match main site"
```

---

### Task 5: Polish Starlight Dark Theme Colors

With dark mode forced, ensure the Starlight pages (blog, license detail, helping) use the same dark color palette as BaseLayout pages.

**Files:**
- Modify: `src/assets/stylesheets/custom.css` (override Starlight dark theme variables)

**Step 1: Add Starlight dark theme overrides**

Add to `src/assets/stylesheets/custom.css`:

```css
/* Starlight Dark Theme — match BaseLayout palette */
:root[data-theme="dark"] {
  --sl-color-bg: #0d0f15;
  --sl-color-bg-nav: rgba(13, 15, 21, 0.92);
  --sl-color-bg-sidebar: #0d0f15;
  --sl-color-hairline-light: #242836;
  --sl-color-hairline: #242836;
  --sl-color-text: #e8eaf0;
  --sl-color-text-accent: var(--emerald);
  --sl-color-white: #e8eaf0;
  --sl-color-gray-1: #e8eaf0;
  --sl-color-gray-2: #c0c4d0;
  --sl-color-gray-3: #8b90a0;
  --sl-color-gray-4: #5a5f70;
  --sl-color-gray-5: #242836;
  --sl-color-gray-6: #161923;
  --sl-color-gray-7: #0d0f15;
  --sl-color-black: #0d0f15;
}
```

**Step 2: Verify visual consistency**

Compare `http://localhost:4321/about/` (BaseLayout) with `http://localhost:4321/blog/` (Starlight) — background colors, text colors, and borders should now match.

**Step 3: Commit**

```bash
git add src/assets/stylesheets/custom.css
git commit -m "refactor(ui): align Starlight dark theme palette with BaseLayout colors"
```

---

## Phase 4: Homepage Enrichment

### Task 6: Add "How It Works" and "Why Plain License" Sections

The homepage currently has a hero, a single featured license card, an "All Licenses" list, and then a massive void. Add two new content sections.

**Files:**
- Modify: `src/pages/index.astro` (add new sections + styles)

**Step 1: Add "How It Works" section after the featured licenses**

Insert after the "All Licenses" section `</section>` (around line 73) and before the closing `</div>` of `.home-content`:

```astro
<section class="section how-it-works">
  <h2 class="section-title">How it works</h2>
  <div class="steps-grid">
    <div class="step">
      <span class="step-number">1</span>
      <h3>Pick a license</h3>
      <p>Browse our library of popular licenses, organized by type — permissive, copyleft, source-available, or public domain.</p>
    </div>
    <div class="step">
      <span class="step-number">2</span>
      <h3>Read the plain version</h3>
      <p>Each license is rewritten at an 8th-grade reading level. No legal jargon, no confusion — just clear rights and responsibilities.</p>
    </div>
    <div class="step">
      <span class="step-number">3</span>
      <h3>Use it in your project</h3>
      <p>Download in any format, copy the attribution template, and you're done. The original license still applies — we just make it understandable.</p>
    </div>
  </div>
</section>

<section class="section why-plain">
  <h2 class="section-title">Why plain language?</h2>
  <div class="value-grid">
    <div class="value-card">
      <span class="value-icon" aria-hidden="true">&#x1F4D6;</span>
      <h3>8th-grade reading level</h3>
      <p>The average American reads at an 8th-grade level. Most licenses require a college education. We bridge that gap.</p>
    </div>
    <div class="value-card">
      <span class="value-icon" aria-hidden="true">&#x2696;&#xFE0F;</span>
      <h3>Legally grounded</h3>
      <p>Every plain license falls back to its original. You get clarity without sacrificing legal standing.</p>
    </div>
    <div class="value-card">
      <span class="value-icon" aria-hidden="true">&#x1F310;</span>
      <h3>Free and open</h3>
      <p>All our work is public domain. Use it, share it, build on it — no strings attached.</p>
    </div>
    <div class="value-card">
      <span class="value-icon" aria-hidden="true">&#x1F91D;</span>
      <h3>Community driven</h3>
      <p>Writers, lawyers, and developers collaborate to make every license clear, accurate, and accessible.</p>
    </div>
  </div>
</section>
```

**Step 2: Add styles for the new sections**

Add to the `<style>` block in `src/pages/index.astro`:

```css
/* How It Works */
.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 2rem;
}

.step {
  position: relative;
  padding: 1.5rem;
  background: var(--bg-surface, #161923);
  border: 1px solid var(--bg-border, #242836);
  border-radius: 10px;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: rgb(21, 219, 149);
  color: #0d0f15;
  font-weight: 800;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.step h3 {
  font-family: var(--font-heading, "Plus Jakarta Sans", sans-serif);
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: var(--text, #e8eaf0);
}

.step p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted, #8b90a0);
  line-height: 1.55;
}

/* Why Plain Language */
.value-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.value-card {
  padding: 1.25rem;
  border-radius: 10px;
  background: var(--bg-surface, #161923);
  border: 1px solid var(--bg-border, #242836);
}

.value-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.value-card h3 {
  font-family: var(--font-heading, "Plus Jakarta Sans", sans-serif);
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
  color: var(--text, #e8eaf0);
}

.value-card p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted, #8b90a0);
  line-height: 1.5;
}
```

**Step 3: Verify homepage renders the new sections**

Run: `mise run dev`
Navigate to `http://localhost:4321/` — should see "How it works" (3 steps) and "Why plain language?" (4 value cards) filling the previously empty space.

**Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "new(content): add How It Works and Why Plain Language sections to homepage"
```

---

## Phase 5: Visual Hierarchy Improvements

### Task 7: Apply Category Colors to License Cards

**Files:**
- Modify: `src/pages/index.astro` (add category class to featured cards and list items)
- Modify: `src/pages/licenses/index.astro` (add category-colored left border to cards)

**Step 1: Update licenses/index.astro cards with category color borders**

In `src/pages/licenses/index.astro`, add the category as a class on the `<section>` element (line 52):

```astro
<section class={`category-section cat-${cat}`} id={cat} key={cat}>
```

Update the `.license-card` styles to use the category color for the left border:

```css
.license-card {
  display: block;
  padding: 1.5rem;
  padding-left: 1.75rem;
  background: var(--bg-surface, #161923);
  border: 1px solid var(--bg-border, #242836);
  border-left: 3px solid var(--cat-color, rgb(21, 219, 149));
  border-radius: 10px;
  text-decoration: none;
  color: var(--text, #e8eaf0);
  transition:
    border-color 0.15s,
    transform 0.15s,
    box-shadow 0.15s;
}

.license-card:hover {
  border-color: var(--bg-border, #242836);
  border-left-color: var(--cat-color, rgb(21, 219, 149));
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(var(--cat-color-rgb, 21, 219, 149), 0.1);
  color: var(--text, #e8eaf0);
}

.license-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--cat-color, rgb(21, 219, 149));
}
```

Also update the `.spdx-badge` to use category color:

```css
.category-section .spdx-badge {
  background: rgba(var(--cat-color-rgb, 21, 219, 149), 0.12);
  color: var(--cat-color, rgb(21, 219, 149));
  border: 1px solid rgba(var(--cat-color-rgb, 21, 219, 149), 0.3);
}
```

**Step 2: Add a category color dot to the category headers**

Update `.category-header h2` styles:

```css
.category-header h2 {
  font-family: var(--font-heading, "Plus Jakarta Sans", sans-serif);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
  color: var(--text, #e8eaf0);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-header h2::before {
  content: "";
  display: inline-block;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--cat-color, var(--emerald));
  flex-shrink: 0;
}
```

**Step 3: Verify the colored category sections**

Navigate to `http://localhost:4321/licenses/` — each category section should have its own accent color (green for permissive, blue for copyleft, gold/yellow for source-available, purple for public domain).

**Step 4: Commit**

```bash
git add src/pages/licenses/index.astro
git commit -m "new(ui): add category color coding to license cards and section headers"
```

---

### Task 8: Improve Homepage License List with Category Colors

**Files:**
- Modify: `src/pages/index.astro` (add category colors to featured cards and list)

**Step 1: Update featured card to use category class**

In the featured licenses `.map()` (around line 44), add the category class to the card:

```astro
<a href={`/licenses/${getLicenseSlug(license)}/`} class={`card cat-${license.data.license_family}`}>
```

Update `.card h3` color and `.spdx-badge` to use `--cat-color`:

```css
.card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--cat-color, rgb(21, 219, 149));
}

.card:hover {
  border-color: var(--cat-color, rgb(21, 219, 149));
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(var(--cat-color-rgb, 21, 219, 149), 0.1);
  color: var(--text, #e8eaf0);
}

.spdx-badge {
  font-family: var(--sl-font-mono, "JetBrains Mono", monospace);
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(var(--cat-color-rgb, 21, 219, 149), 0.12);
  color: var(--cat-color, rgb(21, 219, 149));
  border: 1px solid rgba(var(--cat-color-rgb, 21, 219, 149), 0.3);
  border-radius: 4px;
  padding: 0.15em 0.5em;
}
```

**Step 2: Update the "All Licenses" list to include category class**

In the license list `.map()` (around line 64), add category:

```astro
<li class={`cat-${license.data.license_family}`}>
  <a href={`/licenses/${getLicenseSlug(license)}/`}>
    <span class="list-name">{license.data.plain_name}</span>
    <span class="list-spdx">{license.data.spdx_id}</span>
  </a>
</li>
```

Add a left-border accent to list items:

```css
.license-list li a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  padding-left: 1rem;
  border-radius: 6px;
  background: var(--bg-surface, #161923);
  border: 1px solid var(--bg-border, #242836);
  border-left: 3px solid var(--cat-color, rgb(21, 219, 149));
  text-decoration: none;
  transition: border-color 0.15s;
}

.license-list li a:hover {
  border-color: var(--bg-border, #242836);
  border-left-color: var(--cat-color, rgb(21, 219, 149));
  color: var(--text, #e8eaf0);
}
```

**Step 3: Verify homepage cards and list use category colors**

Navigate to `http://localhost:4321/` — MIT (permissive) should be green, MPL (copyleft) should be blue, Elastic (source-available) should be amber/gold, Unlicense (public-domain) should be purple.

**Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "new(ui): apply category color coding to homepage license cards and list"
```

---

## Phase 6: Cleanup & Consistency

### Task 9: Clean Up Stale CSS and Color Conflicts

**Files:**
- Modify: `src/assets/stylesheets/main.css` (fix accent variables — still has purple Astro defaults)
- Modify: `src/assets/stylesheets/custom.css` (ensure highlight colors match the brand)

**Step 1: Fix main.css accent variables**

`main.css` line 2-3 still has purple Astro defaults:
```css
--accent: 136, 58, 234;
--accent-light: 224, 204, 250;
```

Replace with the brand emerald:
```css
--accent: var(--emerald-rgb);
--accent-light: var(--aquamarine-rgb);
--accent-dark: var(--castleton-grn-rgb);
--accent-gradient: linear-gradient(
  45deg,
  rgb(var(--emerald-rgb)),
  rgb(var(--aquamarine-rgb)) 30%,
  rgb(var(--dutch-white-rgb)) 60%
);
```

**Step 2: Update highlight-match colors in main.css**

Lines 19-28 use the purple accent for highlights. Replace with emerald:
```css
.highlight-match {
  background-color: rgba(var(--emerald-rgb), 0.2);
  transition: background-color 0.2s;
  border-radius: 4px;
}

.highlight-active {
  background-color: rgba(var(--emerald-rgb), 0.4);
  transition: background-color 0.2s;
  border-radius: 4px;
}
```

(Note: `custom.css` already has identical selectors with the correct emerald color. Check for conflicts — one file should own these styles. If `custom.css` loads after `main.css`, the custom.css version wins, but we should remove the duplicate from whichever file is less authoritative. Recommend removing from `main.css` and keeping in `custom.css`.)

**Step 3: Commit**

```bash
git add src/assets/stylesheets/main.css src/assets/stylesheets/custom.css
git commit -m "fix(ui): replace stale purple accent defaults with emerald brand colors"
```

---

### Task 10: Add Missing Nav Links and Footer Enhancement

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (add Contributing link to nav, enhance footer)

**Step 1: Add Contributing to the footer nav**

In `src/layouts/BaseLayout.astro`, in both the desktop footer nav (line 134) and the footer-nav section, add a Contributing link:

```astro
<nav class="footer-nav" aria-label="Footer navigation">
  <a href="/licenses/">Licenses</a>
  <a href="/faq/">FAQ</a>
  <a href="/about/">About</a>
  <a href="/helping/">Contributing</a>
  <a href="/blog/">Blog</a>
  <a
    href="https://github.com/plainlicense/plainlicense"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="GitHub (opens in new tab)"
    >GitHub</a
  >
</nav>
```

**Step 2: Add a tagline to the footer**

Above the `<p class="footer-copy">` in the footer, add:

```astro
<div class="footer-brand">
  <img src="/favicon.svg" alt="" class="footer-logo" width="24" height="24" aria-hidden="true" />
  <span class="footer-tagline">Licenses you can actually understand.</span>
</div>
```

Add styles:

```css
.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin-bottom: 0.75rem;
}

.footer-logo {
  width: 1.5rem;
  height: 1.5rem;
}

.footer-tagline {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
}
```

**Step 3: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "refactor(ui): add Contributing link and brand tagline to footer"
```

---

## Phase 7: Verification

### Task 11: Full Visual Verification

**Step 1: Run the build to ensure no compilation errors**

Run: `cd /home/knitli/plainlicense && mise run build`
Expected: Clean build, no errors

**Step 2: Run linters**

Run: `mise run lint`
Expected: No new lint errors introduced

**Step 3: Visual verification with Playwright**

Use Playwright to take screenshots of each page and compare:
- Homepage: hero, featured, all licenses, how it works, why plain language, footer
- Licenses index: category sections with color-coded cards
- MIT license detail page: consistent dark theme
- Blog: dark theme matching main site
- FAQ: consistent dark theme
- About: consistent dark theme

**Step 4: Final commit if any adjustments were needed**

---

## Summary of Changes by File

| File | Changes |
|------|---------|
| `astro.config.mts` | Font config (Lexend, Plus Jakarta Sans, JetBrains Mono), ThemeSelect override |
| `src/assets/stylesheets/colors.css` | Category color tokens |
| `src/assets/stylesheets/custom.css` | Font refs, category classes, Starlight dark theme overrides |
| `src/assets/stylesheets/main.css` | Fix stale purple accents |
| `src/layouts/BaseLayout.astro` | SVG logo, CSS variable fonts, footer enhancement |
| `src/pages/index.astro` | Font refs, category colors, How It Works + Why sections |
| `src/pages/licenses/index.astro` | Font refs, category color borders |
| `src/components/overrides/Header.astro` | BETA badge fix |
| `src/components/overrides/ThemeSelect.astro` | New file — force dark theme |

## Out of Scope (Future Work)

These items from the design review are intentionally deferred:
- FAQ accordion/collapsible redesign (separate task — involves Preact component work)
- Decision Tree / License Chooser page (component doesn't exist yet)
- License Comparison page (needs design)
- Search on main site (significant feature)
- Light mode support (requires designing a full light palette)
- Individual license page visual hierarchy improvements (separate task)

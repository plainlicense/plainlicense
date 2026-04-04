# Hardcoded Values Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all hardcoded colors, URLs, routes, and schema values by introducing shared constants and CSS tokens.

**Architecture:** Three new definition files provide a single source of truth: (1) CSS tokens in `colors.css` for missing design colors, (2) `src/utils/constants.ts` for URLs, routes, and site metadata, (3) extended `src/data/license-families/index.ts` for family order and descriptions. All consuming files import from these instead of using literals.

**Tech Stack:** Astro 5, CSS custom properties, TypeScript

---

## Task 1: Add Missing CSS Design Tokens

**Files:**
- Modify: `src/assets/stylesheets/colors.css`

**Step 1: Add new color tokens to colors.css**

Add these new tokens after the existing `--cool-gray-rgb` line (around line 82) in the `/* Adjustable colors */` section:

```css
  --restriction-red: rgb(234, 100, 80);
  --restriction-red-rgb: 234, 100, 80;
  --restriction-red-light: rgb(234, 140, 100);
  --accent-purple: #883aea;
  --success-green: #28a745;
  --success-green-rgb: 40, 167, 69;
  --callout-orange: rgb(234, 140, 58);
  --callout-orange-rgb: 234, 140, 58;
```

**Step 2: Add semantic aliases in custom.css**

In `src/assets/stylesheets/custom.css`, add inside `:root[data-theme="dark"]` block (after the existing gray scale, around line 27):

```css
  --sl-color-green: var(--emerald);
  --sl-color-yellow: var(--saffron);
  --sl-color-red: var(--restriction-red);
```

**Step 3: Run lint to verify**

Run: `mise run lint`
Expected: No CSS errors.

**Step 4: Commit**

```
chore(ui): add missing CSS design tokens for restriction, success, accent, and callout colors
```

---

## Task 2: Create Centralized Constants File

**Files:**
- Create: `src/utils/constants.ts`

**Step 1: Create the file**

```typescript
/** Single source of truth for site-wide constants. */

export const SITE_URL = "https://plainlicense.org";
export const SITE_TITLE = "Plain License";
export const SITE_TAGLINE = "Licenses you can actually understand.";
export const SITE_DESCRIPTION =
  "Plain language rewrites of popular licenses — clear, accurate, and free to use.";

export const GITHUB_REPO = "https://github.com/plainlicense/plainlicense";
export const GITHUB_ISSUES = `${GITHUB_REPO}/issues`;
export const GITHUB_DISCUSSIONS = `${GITHUB_REPO}/discussions`;

export const ROUTES = {
  HOME: "/",
  LICENSES: "/licenses/",
  BLOG: "/blog/",
  FAQ: "/faq/",
  ABOUT: "/about/",
  HELPING: "/helping/",
  BLOG_RSS: "/blog/rss.xml",
} as const;

export const FAVICON_PATH = "/favicon.svg";

/** Build a canonical license URL from a slug. */
export function licenseUrl(slug: string): string {
  return `${SITE_URL}/licenses/${slug}`;
}

/** Timeout (ms) for copy-to-clipboard success feedback. */
export const COPY_FEEDBACK_MS = 2000;
```

**Step 2: Run typecheck**

Run: `bunx astro check`
Expected: No errors from the new file.

**Step 3: Commit**

```
refactor(infra): add centralized constants for URLs, routes, and site metadata
```

---

## Task 3: Extend License Families Data

**Files:**
- Modify: `src/data/license-families/index.ts`
- Modify: `src/pages/licenses/index.astro`
- Modify: `src/pages/index.astro`

**Step 1: Add FAMILY_ORDER and FAMILY_DESCRIPTIONS to license-families/index.ts**

After the existing `FAMILY_LABELS` export (line 112), add:

```typescript
export const FAMILY_ORDER = [
  "public-domain",
  "permissive",
  "copyleft",
  "source-available",
  "proprietary",
] as const;

export const FAMILY_DESCRIPTIONS: Record<string, string> = {
  "public-domain": "No rights reserved — use any way you want.",
  permissive: "Few restrictions — use freely in almost any project.",
  copyleft: "Share-alike — changes must stay under the same license.",
  "source-available": "Source visible but with usage restrictions.",
  proprietary: "All rights reserved — usage governed by specific terms.",
};
```

**Step 2: Update licenses/index.astro to use the imports**

Replace the local `familyOrder`, `familyLabels`, and `familyDescriptions` declarations (lines 19-39) with imports:

```typescript
import { FAMILY_LABELS, FAMILY_ORDER, FAMILY_DESCRIPTIONS } from "../../data/license-families/index";
```

Update references in the template: `familyOrder` → `FAMILY_ORDER`, `familyLabels` → `FAMILY_LABELS`, `familyDescriptions` ��� `FAMILY_DESCRIPTIONS`.

**Step 3: Update index.astro to use the import**

Replace the local `FAMILY_ORDER` (lines 7-13) with:

```typescript
import { FAMILY_ORDER } from "../data/license-families/index";
```

**Step 4: Run build to verify**

Run: `mise run build`
Expected: No errors.

**Step 5: Commit**

```
refactor(content): centralize license family order and descriptions
```

---

## Task 4: Replace Hardcoded Colors in Footnotes CSS

**Files:**
- Modify: `src/assets/stylesheets/footnotes.css`

**Step 1: Replace all hardcoded colors**

| Line | Old | New |
|------|-----|-----|
| 27 | `color: rgb(106, 241, 194);` | `color: var(--aquamarine);` |
| 57 | `color: rgb(21, 219, 149);` | `color: var(--emerald);` |
| 62 | `color: rgb(106, 241, 194);` | `color: var(--aquamarine);` |

**Step 2: Commit**

```
refactor(ui): replace hardcoded colors in footnotes with CSS tokens
```

---

## Task 5: Replace Hardcoded Colors in ComparisonToggle

**Files:**
- Modify: `src/components/ComparisonToggle.astro`

**Step 1: Replace all hardcoded values**

| Line | Old | New |
|------|-----|-----|
| 105 | `color: var(--sl-color-white, var(--text, #e8eaf0));` | `color: var(--sl-color-white);` |
| 115 | `border-color: var(--sl-color-accent, rgb(21, 219, 149));` | `border-color: var(--sl-color-accent);` |
| 116 | `color: var(--sl-color-accent, rgb(21, 219, 149));` | `color: var(--sl-color-accent);` |
| 120 | `background: rgba(21, 219, 149, 0.1);` | `background: rgba(var(--emerald-rgb), 0.1);` |
| 121 | `border-color: var(--sl-color-accent, rgb(21, 219, 149));` | `border-color: var(--sl-color-accent);` |
| 122 | `color: var(--sl-color-accent, rgb(21, 219, 149));` | `color: var(--sl-color-accent);` |
| 125 | `border-color: var(--sl-color-gray-4, #5a5f70);` | `border-color: var(--sl-color-gray-4);` |
| 126 | `color: var(--sl-color-gray-3, #8b90a0);` | `color: var(--sl-color-gray-3);` |
| 132 | `color: var(--sl-color-gray-3, #8b90a0);` | `color: var(--sl-color-gray-3);` |
| 133 | `border-color: var(--sl-color-gray-4, #5a5f70);` | `border-color: var(--sl-color-gray-4);` |

**Step 2: Commit**

```
refactor(ui): replace hardcoded colors in ComparisonToggle with CSS tokens
```

---

## Task 6: Replace Hardcoded Colors in ReadabilityTable

**Files:**
- Modify: `src/components/ReadabilityTable.astro`

**Step 1: Replace fallback-only values**

Now that `--sl-color-green`, `--sl-color-yellow`, `--sl-color-red` are defined in custom.css (Task 1), remove the fallbacks:

| Line | Old | New |
|------|-----|-----|
| 157 | `color: var(--sl-color-green, #4caf50);` | `color: var(--sl-color-green);` |
| 161 | `color: var(--sl-color-yellow, #f9a825);` | `color: var(--sl-color-yellow);` |
| 165 | `color: var(--sl-color-red, #e53935);` | `color: var(--sl-color-red);` |
| 169 | `color: var(--sl-color-green, #4caf50);` | `color: var(--sl-color-green);` |

**Step 2: Commit**

```
refactor(ui): use defined Starlight color aliases in ReadabilityTable
```

---

## Task 7: Replace Hardcoded Colors in FAQ.astro

**Files:**
- Modify: `src/components/reactive/FAQ.astro`

**Step 1: Replace all hardcoded hex/named colors**

| Line | Old | New |
|------|-----|-----|
| 46 | `border: 1px solid #333;` | `border: 1px solid var(--sl-color-gray-5);` |
| 51 | `border-bottom: 1px solid #333;` | `border-bottom: 1px solid var(--sl-color-gray-5);` |
| 58 | `background: #1a1c23;` | `background: var(--sl-color-gray-6);` |
| 72 | `color: #883aea;` | `color: var(--accent-purple);` |
| 79 | `background: #0d0f14;` | `background: var(--sl-color-black);` |
| 81 | `color: #ccc;` | `color: var(--sl-color-gray-2);` |

**Step 2: Commit**

```
refactor(ui): replace hardcoded dark theme colors in FAQ with CSS tokens
```

---

## Task 8: Replace Hardcoded Colors in ComparisonTable.astro

**Files:**
- Modify: `src/components/reactive/ComparisonTable.astro`

**Step 1: Replace all hardcoded colors**

| Line | Old | New |
|------|-----|-----|
| 97 | `border: 1px solid #333;` | `border: 1px solid var(--sl-color-gray-5);` |
| 103 | `background: #1a1c23;` | `background: var(--sl-color-gray-6);` |
| 107 | `background: #252833;` | `background: var(--sl-color-gray-5);` |
| 110 | `border-bottom: 2px solid #333;` | `border-bottom: 2px solid var(--sl-color-gray-5);` |
| 111 | `color: #883aea;` | `color: var(--accent-purple);` |
| 115 | `border-bottom: 1px solid #333;` | `border-bottom: 1px solid var(--sl-color-gray-5);` |
| 122 | `background: #1e2129;` | `background: var(--sl-color-gray-6);` |
| 129 | `background: #252833;` | `background: var(--sl-color-gray-5);` |

**Step 2: Commit**

```
refactor(ui): replace hardcoded dark theme colors in ComparisonTable with CSS tokens
```

---

## Task 9: Replace Hardcoded Colors in Zone Components

**Files:**
- Modify: `src/components/license/zones/ZoneIdentity.astro`
- Modify: `src/components/license/zones/ZoneConditions.astro`
- Modify: `src/components/license/zones/ZoneRestrictions.astro`
- Modify: `src/components/license/zones/ZonePermissions.astro`

### ZoneIdentity.astro

| Line | Old | New |
|------|-----|-----|
| 130 | `background: rgba(228, 197, 129, 0.1);` | `background: rgba(var(--ecru-rgb), 0.1);` |
| 131 | `color: rgb(228, 197, 129);` | `color: var(--ecru);` |
| 132 | `border: 1px solid rgba(228, 197, 129, 0.2);` | `border: 1px solid rgba(var(--ecru-rgb), 0.2);` |
| 163 | `background: rgba(234, 140, 58, 0.1);` | `background: rgba(var(--callout-orange-rgb), 0.1);` |
| 164 | `border: 1px solid rgba(234, 140, 58, 0.3);` | `border: 1px solid rgba(var(--callout-orange-rgb), 0.3);` |
| 173 | `color: rgb(234, 140, 58);` | `color: var(--callout-orange);` |

### ZoneConditions.astro

| Line | Old | New |
|------|-----|-----|
| 76 | `background: rgba(228, 197, 129, 0.04);` | `background: rgba(var(--ecru-rgb), 0.04);` |
| 92 | `color: rgb(228, 197, 129);` | `color: var(--ecru);` |
| 110 | `border-left: 4px solid rgba(228, 197, 129, 0.5);` | `border-left: 4px solid rgba(var(--ecru-rgb), 0.5);` |
| 117 | `border-left-color: rgb(228, 197, 129);` | `border-left-color: var(--ecru);` |
| 131 | `color: rgb(228, 197, 129);` | `color: var(--ecru);` |
| 160 | `color: rgb(228, 197, 129);` | `color: var(--ecru);` |

### ZoneRestrictions.astro

| Line | Old | New |
|------|-----|-----|
| 105 | `background: rgba(234, 100, 80, 0.04);` | `background: rgba(var(--restriction-red-rgb), 0.04);` |
| 121 | `color: rgb(234, 100, 80);` | `color: var(--restriction-red);` |
| 163 | `color: rgb(234, 100, 80);` | `color: var(--restriction-red);` |
| 201 | `border-left: 4px solid rgba(234, 100, 80, 0.5);` | `border-left: 4px solid rgba(var(--restriction-red-rgb), 0.5);` |
| 212 | `border-left-color: rgb(234, 100, 80);` | `border-left-color: var(--restriction-red);` |
| 226 | `color: rgb(234, 100, 80);` | `color: var(--restriction-red);` |
| 249 | `background: rgba(234, 100, 80, 0.08);` | `background: rgba(var(--restriction-red-rgb), 0.08);` |
| 255 | `color: rgb(234, 140, 100);` | `color: var(--restriction-red-light);` |

### ZonePermissions.astro

These use `var(--cat-color, rgb(21, 219, 149))` fallbacks. Since `--cat-color` is always set by the parent, the fallbacks are unnecessary but harmless. Replace with the token reference:

| Line | Old | New |
|------|-----|-----|
| 84 | `color: var(--cat-color, rgb(21, 219, 149));` | `color: var(--cat-color, var(--emerald));` |
| 111 | `border-top-color: var(--cat-color, rgb(21, 219, 149));` | `border-top-color: var(--cat-color, var(--emerald));` |
| 126 | `color: var(--cat-color, rgb(21, 219, 149));` | `color: var(--cat-color, var(--emerald));` |

**Step 2: Commit**

```
refactor(ui): replace hardcoded zone colors with CSS tokens
```

---

## Task 10: Replace Hardcoded Colors in DownloadOptions.astro

**Files:**
- Modify: `src/components/DownloadOptions.astro`

**Step 1: Replace success-state colors**

| Line | Old | New |
|------|-----|-----|
| 538 | `border-color: #28a745;` | `border-color: var(--success-green);` |
| 539 | `color: #28a745;` | `color: var(--success-green);` |
| 631 | `background: rgba(40, 167, 69, 0.15);` | `background: rgba(var(--success-green-rgb), 0.15);` |
| 632 | `border-color: #28a745;` | `border-color: var(--success-green);` |
| 633 | `color: #28a745;` | `color: var(--success-green);` |

**Step 2: Commit**

```
refactor(ui): replace hardcoded success colors in DownloadOptions with CSS tokens
```

---

## Task 11: Replace Hardcoded URLs in BaseLayout.astro

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

**Step 1: Add imports at the top of the frontmatter**

```typescript
import { GITHUB_REPO, ROUTES, FAVICON_PATH, SITE_TAGLINE } from "../utils/constants";
```

**Step 2: Replace all hardcoded values**

| Line | Old | New |
|------|-----|-----|
| 7 | `"Plain language versions of popular licenses"` | `SITE_DESCRIPTION` (import it) |
| 17 | `href="/favicon.svg"` | `href={FAVICON_PATH}` |
| 27 | `src="/favicon.svg"` | `src={FAVICON_PATH}` |
| 35 | `href="/licenses/"` | `href={ROUTES.LICENSES}` |
| 36 | `currentPath.startsWith("/licenses/")` | `currentPath.startsWith(ROUTES.LICENSES)` |
| 40 | `href="/faq/"` | `href={ROUTES.FAQ}` |
| 41 | `currentPath.startsWith("/faq/")` | `currentPath.startsWith(ROUTES.FAQ)` |
| 45 | `href="/about/"` | `href={ROUTES.ABOUT}` |
| 46 | `currentPath.startsWith("/about/")` | `currentPath.startsWith(ROUTES.ABOUT)` |
| 50 | `href="/blog/"` | `href={ROUTES.BLOG}` |
| 51 | `currentPath.startsWith("/blog/")` | `currentPath.startsWith(ROUTES.BLOG)` |
| 55 | `href="https://github.com/..."` | `href={GITHUB_REPO}` |
| 94, 99, 103, 109 | Same pattern for mobile nav | Same replacements |
| 114 | `href="https://github.com/..."` | `href={GITHUB_REPO}` |
| 128 | `src="/favicon.svg"` | `src={FAVICON_PATH}` |
| 129 | `"Licenses you can actually understand."` | `{SITE_TAGLINE}` |
| 137 | `href="/licenses/"` | `href={ROUTES.LICENSES}` |
| 138 | `href="/faq/"` | `href={ROUTES.FAQ}` |
| 139 | `href="/about/"` | `href={ROUTES.ABOUT}` |
| 140 | `href="/helping/"` | `href={ROUTES.HELPING}` |
| 141 | `href="/blog/"` | `href={ROUTES.BLOG}` |
| 143 | `href="https://github.com/..."` | `href={GITHUB_REPO}` |

**Step 3: Commit**

```
refactor(ui): replace hardcoded URLs and routes in BaseLayout with constants
```

---

## Task 12: Replace Hardcoded URLs in Footer Override

**Files:**
- Modify: `src/components/overrides/Footer.astro`

**Step 1: Add imports**

```typescript
import { GITHUB_REPO, ROUTES } from "../../utils/constants";
```

**Step 2: Replace values**

| Line | Old | New |
|------|-----|-----|
| 13 | `href="/licenses/"` | `href={ROUTES.LICENSES}` |
| 14 | `href="/faq/"` | `href={ROUTES.FAQ}` |
| 15 | `href="/about/"` | `href={ROUTES.ABOUT}` |
| 16 | `href="/helping/"` | `href={ROUTES.HELPING}` |
| 17 | `href="/blog/"` | `href={ROUTES.BLOG}` |
| 19 | `href="https://github.com/..."` | `href={GITHUB_REPO}` |

**Step 3: Commit**

```
refactor(ui): replace hardcoded URLs in Footer override with constants
```

---

## Task 13: Replace Hardcoded URLs in Content Components

**Files:**
- Modify: `src/components/NotLegalAdvice.astro`
- Modify: `src/components/license/zones/ZoneInterpretation.astro`
- Modify: `src/components/DownloadOptions.astro`

### NotLegalAdvice.astro

Add import and replace:

| Line | Old | New |
|------|-----|-----|
| 15 | `href="https://github.com/plainlicense/plainlicense/issues"` | `href={GITHUB_ISSUES}` |

### ZoneInterpretation.astro

Add import and replace:

| Line | Old | New |
|------|-----|-----|
| 53 | `href="https://github.com/plainlicense/plainlicense"` | `href={GITHUB_REPO}` |

### DownloadOptions.astro

Add imports and replace:

| Line | Old | New |
|------|-----|-----|
| 58 | `` `https://plainlicense.org/licenses/${...}` `` | Use `licenseUrl()` from constants |
| 231 | `href="https://github.com/plainlicense/plainlicense/discussions"` | `href={GITHUB_DISCUSSIONS}` |

**Step 2: Commit**

```
refactor(ui): replace hardcoded URLs in content components with constants
```

---

## Task 14: Replace Hardcoded URLs in Build Scripts

**Files:**
- Modify: `src/build/exports/plaintext.ts`
- Modify: `src/build/exports/markdown.ts`
- Modify: `src/build/exports/pdf.ts`
- Modify: `src/build/exports/index.ts`
- Modify: `src/build/generate-og-images.ts`

**Step 1: In each file, import `licenseUrl` or `SITE_URL` from constants and replace**

### plaintext.ts (line 27)
Old: `` `Attribution: https://plainlicense.org/licenses/${slug}\n\n` ``
New: `` `Attribution: ${licenseUrl(slug)}\n\n` ``

### markdown.ts (line 21)
Old: `` `<!-- Attribution: https://plainlicense.org/licenses/${slug} -->\n\n` ``
New: `` `<!-- Attribution: ${licenseUrl(slug)} -->\n\n` ``

### pdf.ts (line 186)
Old: `` `*Canonical URL:* https://plainlicense.org/licenses/${metadata.slug}` ``
New: `` `*Canonical URL:* ${licenseUrl(metadata.slug)}` ``

### index.ts (line 185)
Old: `` `<a href="https://plainlicense.org/licenses/${metadata.slug}">` ``
New: `` `<a href="${licenseUrl(metadata.slug)}">` ``

### generate-og-images.ts (line 192)
Old: `` `plainlicense.org/licenses/${slug}` ``
New: `` `plainlicense.org/licenses/${slug}` `` (keep as display text — no protocol needed for visual label)

**Step 2: Commit**

```
refactor(infra): replace hardcoded URLs in build scripts with constants
```

---

## Task 15: Replace Hardcoded Values in RSS Feed

**Files:**
- Modify: `src/pages/blog/rss.xml.ts`

**Step 1: Add imports and replace**

```typescript
import { SITE_URL, SITE_TITLE } from "../../utils/constants";
```

| Line | Old | New |
|------|-----|-----|
| 18 | `title: "Plain License Blog"` | `title: \`${SITE_TITLE} Blog\`` |
| 19-20 | `description: "News, guides, and updates..."` | Keep as-is (RSS-specific description is fine) |
| 21 | `site: context.site ?? "https://plainlicense.org"` | `site: context.site ?? SITE_URL` |

**Step 2: Commit**

```
refactor(content): use constants for RSS feed site URL and title
```

---

## Task 16: Fix Schema Duplication in LicenseLayout and VersionHistory

**Files:**
- Modify: `src/components/license/LicenseLayout.astro`
- Modify: `src/components/VersionHistory.astro`

### LicenseLayout.astro

The `PROTECTION_TAGS` set (line 42) is fine as a local constant — it's component-specific filtering logic, not a shared definition. No change needed.

### VersionHistory.astro (line 14)

Replace hardcoded default:

Old: `const category = license_family || "permissive";`
New: `const category = license_family || FAMILY_ORDER[1];`

Add import:
```typescript
import { FAMILY_ORDER } from "../../data/license-families/index";
```

**Step 2: Commit**

```
refactor(content): use FAMILY_ORDER constant for default family fallback
```

---

## Task 17: Final Verification

**Step 1: Run full build**

Run: `mise run build`
Expected: Clean build, no errors.

**Step 2: Run lint**

Run: `mise run lint`
Expected: No lint errors.

**Step 3: Run typecheck**

Run: `bunx astro check`
Expected: No type errors.

**Step 4: Spot-check for remaining hardcoded values**

Run grep searches to verify no remaining instances:
- `grep -r "plainlicense.org" src/ --include="*.ts" --include="*.astro"` — should only show OG image display text
- `grep -r "#28a745\|#883aea\|#333\|#1a1c23\|#0d0f14" src/` — should return nothing
- `grep -r "rgb(228, 197, 129)\|rgb(234, 100, 80)\|rgb(21, 219, 149)\|rgb(106, 241, 194)" src/` — should only show colors.css definitions

**Step 5: Commit any fixups**

```
chore(infra): final cleanup of hardcoded values audit
```

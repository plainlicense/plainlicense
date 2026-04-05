# Comparison Feature Redesign — Bug Fix + Desktop UX Overhaul

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix comparison mode leaking into the Quick Reference tab, and replace the weak SVG line-drawing interaction with a dimming + parallel alignment + cat-color highlighting model.

**Architecture:** Remove the SVG overlay system entirely. On hover/focus, dim all original-column text except the matching clause(s), highlight both sides with `--cat-color` underlines, and smooth-scroll the original column to align the match. The original column becomes a sticky, independently-scrollable panel in comparison mode so it stays alongside the plain text as you scroll. One-to-many mappings get "cut-out" block styling with shadows to visually separate multiple original clauses.

**Tech Stack:** Astro 5, TypeScript (client-side), CSS custom properties (`--cat-color`, `--cat-color-rgb`)

---

## Context

### Files involved
- `src/components/MappingViewer.ts` — core interactive logic (full rewrite of activation/deactivation, SVG removal)
- `src/components/ComparisonToggle.astro` — toggle script needs tab-awareness
- `src/pages/licenses/[...slug].astro` — tab switching must coordinate with comparison state; CSS changes for new highlight/dim/sticky model
- `src/assets/stylesheets/custom.css` — update `.highlight-match` / `.highlight-active` classes

### Mapping data format (for reference)
Each mapping in `content/mappings/*-mapping.json` has:
- `plain_clause`: single `{id, content}` or array of them (or null)
- `original_clause`: single `{id, content}` or array of them (or null)
- `type`: `one-to-one`, `one-to-one-expanded`, `one-to-many`, `many-to-one`, `many-to-many`, `unmapped-plain`, `unmapped-original`

Element IDs in the rendered HTML match `plain_clause.id` / `original_clause.id` (e.g., `id="plain-permissions"`, `id="original-permissions"`).

### Category color system
Each license page has a class like `cat-permissive` on `.license-container` which sets `--cat-color` and `--cat-color-rgb`. All highlight colors must use these variables, not hardcoded emerald.

---

## Task 1: Fix comparison-active leaking into Quick Reference tab

**Problem:** `ComparisonToggle.astro`'s script reads `localStorage("pl-comparison-mode")` on page load and applies `comparison-active` to `.license-container` regardless of which tab is active. This causes layout/style bleed into the Quick Reference tab.

**Files:**
- Modify: `src/components/ComparisonToggle.astro` (script block, lines 48-88)
- Modify: `src/pages/licenses/[...slug].astro` (tab switching script, lines 333-376)

### Step 1: Update ComparisonToggle script — gate on fulltext tab

In `src/components/ComparisonToggle.astro`, change the script to only apply the saved preference when the fulltext panel is visible:

```typescript
// In the script block, replace line 79-80:
// OLD:
// const savedPreference = localStorage.getItem(STORAGE_KEY) === "true";
// updateUI(savedPreference);

// NEW:
const savedPreference = localStorage.getItem(STORAGE_KEY) === "true";
const fulltextPanel = document.getElementById("panel-fulltext");
const isFulltextActive = fulltextPanel && !fulltextPanel.hidden;
// Only apply saved preference if fulltext tab is currently visible
updateUI(savedPreference && isFulltextActive);
```

### Step 2: Coordinate tab switching with comparison state

In `src/pages/licenses/[...slug].astro`, in the tab click handler (around line 338-362), add logic to deactivate comparison when leaving fulltext and restore when returning:

```typescript
// Inside the tab click handler, after setting fulltext-active class (line 361):
// Add:
const compToggle = document.getElementById("comparison-toggle") as HTMLButtonElement | null;
if (panelId === 'panel-fulltext') {
  // Restore comparison if toggle is active
  if (compToggle?.getAttribute('aria-pressed') === 'true') {
    container?.classList.add('comparison-active');
  }
} else {
  // Always remove comparison-active when leaving fulltext tab
  container?.classList.remove('comparison-active');
}
```

### Step 3: Verify the fix

- Load a license with mapping (MIT or Unlicense)
- Enable comparison mode on Full License Text tab
- Switch to Quick Reference tab — `comparison-active` class must NOT be on `.license-container`
- Switch back to Full License Text — `comparison-active` class must be restored
- Reload page on Quick Reference tab — `comparison-active` must NOT be applied even if localStorage is "true"

### Step 4: Commit

```bash
git add src/components/ComparisonToggle.astro src/pages/licenses/[...slug].astro
git commit -m "fix(ui): prevent comparison mode from leaking into Quick Reference tab"
```

---

## Task 2: Remove SVG overlay system from MappingViewer

**Files:**
- Modify: `src/components/MappingViewer.ts` (remove `createSVGOverlay`, `drawConnections`, `clearConnections`, all SVG references)

### Step 1: Remove SVG functions and references

Delete these functions entirely:
- `createSVGOverlay` (lines 303-315)
- `drawConnections` (lines 317-354)
- `clearConnections` (lines 356-360)

In `initMappingViewer`, remove:
- The SVG creation/lookup block (lines 27-30: `let svg = ...` through `svg = createSVGOverlay(container)`)
- All `drawConnections(svg, ...)` calls (lines 98-102, 119-123)
- All `clearConnections(svg)` calls (lines 79, 136)
- The `handleUpdate` function and its event listeners (lines 258-267)
- The `svg` parameter from all internal function signatures

### Step 2: Verify no SVG references remain

```bash
cd /home/knitli/plainlicense && grep -n "svg\|SVG\|drawConnection\|clearConnection\|createSVG" src/components/MappingViewer.ts
```

Expected: no matches.

### Step 3: Commit

```bash
git add src/components/MappingViewer.ts
git commit -m "refactor(ui): remove SVG overlay system from MappingViewer"
```

---

## Task 3: Implement new dimming + highlight interaction in MappingViewer

**Files:**
- Modify: `src/components/MappingViewer.ts` (rewrite activation/deactivation logic)

### Step 1: Add new class-based interaction model

Replace the `activateFromPlain`, `activateFromOriginal`, and `deactivate` functions. The new model uses these CSS classes:

- `.mapping-dim` — on `.original-version` column: dims all children
- `.mapping-source` — on the hovered/focused plain element(s): cat-color underline
- `.mapping-target` — on the matching original element(s): cat-color underline, exempted from dim
- `.mapping-cutout` — on original elements when there are multiple targets (one-to-many): cut-out block style

New `activateFromPlain`:
```typescript
const activateFromPlain = () => {
  clearPreviousActiveMapping();
  const origColumn = container.querySelector('.original-version') as HTMLElement | null;
  if (origColumn) origColumn.classList.add('mapping-dim');

  plainEls.forEach((p) => p.classList.add('mapping-source'));
  originalEls.forEach((o) => {
    o.classList.add('mapping-target');
    if (originalEls.length > 1) o.classList.add('mapping-cutout');
  });

  activeMapping = {
    sources: plainEls,
    targets: originalEls,
    token: plainEls,
  };

  // Smooth-scroll first matching original into view within its scrollable column
  if (originalEls.length > 0 && window.innerWidth >= 1024) {
    originalEls[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};
```

New `activateFromOriginal`:
```typescript
const activateFromOriginal = () => {
  clearPreviousActiveMapping();
  const origColumn = container.querySelector('.original-version') as HTMLElement | null;
  if (origColumn) origColumn.classList.add('mapping-dim');

  originalEls.forEach((o) => {
    o.classList.add('mapping-target');
    if (originalEls.length > 1) o.classList.add('mapping-cutout');
  });
  plainEls.forEach((p) => p.classList.add('mapping-source'));

  activeMapping = {
    sources: plainEls,
    targets: originalEls,
    token: plainEls,
  };

  // Scroll the plain source into view for context
  if (plainEls.length > 0 && window.innerWidth >= 1024) {
    plainEls[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};
```

Updated `clearPreviousActiveMapping`:
```typescript
const clearPreviousActiveMapping = () => {
  if (!activeMapping) return;
  const origColumn = container.querySelector('.original-version') as HTMLElement | null;
  if (origColumn) origColumn.classList.remove('mapping-dim');
  activeMapping.sources.forEach((el) => {
    el.classList.remove('mapping-source');
  });
  activeMapping.targets.forEach((el) => {
    el.classList.remove('mapping-target', 'mapping-cutout');
  });
  activeMapping = null;
};
```

Updated `deactivate`:
```typescript
const deactivate = () => {
  if (activeMapping?.token !== plainEls) return;
  const origColumn = container.querySelector('.original-version') as HTMLElement | null;
  if (origColumn) origColumn.classList.remove('mapping-dim');
  allMappedEls.forEach((el) => {
    el.classList.remove('mapping-source', 'mapping-target', 'mapping-cutout');
  });
  activeMapping = null;
};
```

### Step 2: Remove old highlight class references

Replace all remaining references to `highlight-match` and `highlight-active` in MappingViewer.ts with the new class names. Search for any remaining instances.

### Step 3: Commit

```bash
git add src/components/MappingViewer.ts
git commit -m "refactor(ui): implement dim + highlight interaction model in MappingViewer"
```

---

## Task 4: CSS — sticky scrollable original column + new highlight styles

**Files:**
- Modify: `src/pages/licenses/[...slug].astro` (scoped styles)
- Modify: `src/assets/stylesheets/custom.css` (global highlight classes)

### Step 1: Make original column sticky and independently scrollable

In `src/pages/licenses/[...slug].astro` styles, update the `comparison-active` desktop styles:

```css
@media (min-width: 1024px) {
  .comparison-active .original-version {
    display: block;
    position: sticky;
    top: 4rem; /* below site header */
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
    align-self: start;
    /* Subtle scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: var(--sl-color-gray-4) transparent;
  }
}
```

### Step 2: Add dimming styles for original column

```css
/* When mapping-dim is on the original column, fade all direct children */
.comparison-active .original-version.mapping-dim > * {
  opacity: 0.15;
  transition: opacity 0.25s ease;
}

/* Exempt: mapping targets stay fully visible */
.comparison-active .original-version.mapping-dim > .mapping-target {
  opacity: 1;
}
```

### Step 3: Add source/target highlight styles

Replace the old `.highlight-active` / `.highlight-match` global styles with new ones:

```css
/* Source: the plain-language section being hovered/focused */
:global(.mapping-source) {
  border-bottom: 3px solid var(--cat-color, var(--sl-color-accent));
  background: rgba(var(--cat-color-rgb, var(--emerald-rgb)), 0.06);
  border-radius: 4px;
  padding-bottom: 2px;
  transition: all 0.2s ease;
}

/* Target: the matching original-language section */
:global(.mapping-target) {
  border-bottom: 3px solid var(--cat-color, var(--sl-color-accent));
  background: rgba(var(--cat-color-rgb, var(--emerald-rgb)), 0.08);
  border-radius: 4px;
  padding-bottom: 2px;
  transition: all 0.2s ease;
}
```

### Step 4: Add cut-out block style for one-to-many mappings

```css
/* Cut-out: for one-to-many, each original block looks like a distinct "paper" piece */
:global(.mapping-cutout) {
  background: var(--sl-color-gray-6);
  border: 1px solid rgba(var(--cat-color-rgb, var(--emerald-rgb)), 0.3);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 0.5rem 0;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.25),
    0 1px 3px rgba(0, 0, 0, 0.15);
  border-bottom: 3px solid var(--cat-color, var(--sl-color-accent));
}
```

### Step 5: Remove old highlight classes from custom.css

In `src/assets/stylesheets/custom.css`, remove or update the old `.highlight-match` and `.highlight-active` rules (lines 86-96) since they used hardcoded emerald values and are being replaced.

### Step 6: Remove old highlight styles from page scoped CSS

In `src/pages/licenses/[...slug].astro` scoped styles, remove:
- The `:global(.highlight-active)` block (lines 573-578)
- The `:global(.highlight-match)` block (lines 580-585)
- The `.comparison-active .license-content [id]:hover` rule (lines 569-571) — cursor pointer can stay but the hover background is replaced by the new model

### Step 7: Verify visually

```bash
cd /home/knitli/plainlicense && mise run dev
```

Open MIT license page → Full License Text → Enable comparison:
- Original column should be sticky and scroll independently
- Hover a plain section: original column dims, matching section highlighted with cat-color underline
- Both hovered plain and matching original have the same underline color
- If you had a one-to-many mapping, the multiple original blocks would appear as distinct cut-out cards
- Tab to sections with keyboard: same behavior via focus

### Step 8: Commit

```bash
git add src/pages/licenses/[...slug].astro src/assets/stylesheets/custom.css
git commit -m "refactor(ui): add dim + highlight + sticky scroll CSS for comparison redesign"
```

---

## Task 5: Clean up old cursor/hover styles and verify mobile behavior

**Files:**
- Modify: `src/pages/licenses/[...slug].astro` (scoped styles)
- Verify: mobile modal still works unchanged

### Step 1: Update cursor styles for mapped elements

Keep `cursor: pointer` on mapped elements but update the selector to be clearer:

```css
.comparison-active .license-content [id],
.comparison-active .full-license-text [id] {
  cursor: pointer;
  position: relative;
  border-radius: 4px;
  transition: background-color 0.2s, border-color 0.2s, opacity 0.25s;
}
```

### Step 2: Verify mobile modal unchanged

The mobile path (< 1024px) in MappingViewer.ts should be unaffected — it uses `showMobileModal` which clones original elements into the modal. The new classes (mapping-source, etc.) are only applied on desktop (the event handlers already gate on `window.innerWidth >= 1024`). Confirm:

- Open on mobile viewport (< 1024px)
- Enable comparison
- Tap a plain section → modal should open showing original text
- No dimming, no sticky column behavior

### Step 3: Run lint and type check

```bash
cd /home/knitli/plainlicense && mise run lint
```

### Step 4: Commit

```bash
git add src/pages/licenses/[...slug].astro
git commit -m "chore(ui): clean up comparison cursor styles and verify mobile path"
```

---

## Task 6: Update original column base opacity

**Files:**
- Modify: `src/pages/licenses/[...slug].astro` (scoped styles)

### Step 1: Adjust original column default opacity

Currently the original column has `opacity: 0.6` by default and `1` on hover (lines 496-503). With the new dimming model, the column should be fully opaque by default — the dimming happens per-element on hover. Update:

```css
/* Remove the old opacity rules: */
/* OLD:
.original-version {
  display: none;
  opacity: 0.6;
  transition: opacity 0.3s;
}
.original-version:hover {
  opacity: 1;
}
*/

/* NEW: */
.original-version {
  display: none;
  transition: opacity 0.3s;
}
```

The column starts fully opaque when visible. Individual element dimming is handled by `.mapping-dim > *`.

### Step 2: Commit

```bash
git add src/pages/licenses/[...slug].astro
git commit -m "fix(ui): remove base opacity from original column, dimming now per-element"
```

---

## Summary of interaction model

| User action | Plain column | Original column |
|---|---|---|
| No hover | Normal | Normal (full opacity) |
| Hover plain section | Hovered section gets cat-color underline | All text dims to 15% opacity EXCEPT matching section(s), which get cat-color underline. Column scrolls to show match. |
| Hover original section | Matching plain section(s) get cat-color underline | Hovered section highlighted, rest dims |
| One-to-many hover | Source underlined | Multiple target blocks get cut-out card styling with shadow |
| Leave hover | Returns to normal | Returns to normal |
| Mobile tap | N/A | Modal opens with original text (unchanged) |

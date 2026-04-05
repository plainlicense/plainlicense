# License Mapping Validation Pipeline

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the license comparison/mapping feature reliable: validate mappings at build time, hide stale ones, produce a correct MIT mapping, and set up CI to detect staleness and trigger LLM-based regeneration.

**Architecture:** The comparison feature lives in the **Full License Text** tab, where the markdown body renders with `<div id>` wrappers that MappingViewer can attach to directly. Build-time validation reads license markdown + mapping JSON, resolves template blocks, extracts `<div id>` content, hashes it, and compares to stored hashes. Stale mappings are not copied to `public/` (hiding the feature). A CI workflow detects staleness on content changes and opens an issue assigned to `@claude` for regeneration via Claude Code Action.

**Tech Stack:** TypeScript (Bun runtime), Vitest, GitHub Actions, `anthropics/claude-code-action@beta`

## Important Context

### Content Architecture (read this first)

The license page has two tabs (added in `b44f1f467`):

1. **Quick Reference** (`panel-reference`) — zone components render structured cards from frontmatter data. Not used for comparison.
2. **Full License Text** (`panel-fulltext`) — renders the markdown body via `renderMarkdownWithDivs(fullTextBody)` where `fullTextBody` has template blocks resolved and vars replaced. This tab has visible `<div id>` elements from the markdown body.

The **original** text column is in the Quick Reference panel and only shows when `comparison-active` class is on the container. We need to move it to the Full Text tab.

### What Renders Where

- **Quick Reference tab**: Zone components (ZonePermissions, ZoneConditions, etc.) from frontmatter + family data
- **Full Text tab**: `renderedPlainHtml` = resolved markdown body with `<div id>` wrappers preserved by `renderMarkdownWithDivs()`
- **Original text column**: Currently in Quick Reference panel. Needs to move to Full Text panel.

### Key Simplification

Since comparison lives in the Full Text tab:
- **No changes needed to zone components** — they don't participate in comparison
- **Mapping-anchors div can be removed** — the Full Text tab already renders visible elements with the right IDs
- **MappingViewer `isInHiddenContainer` check can be removed** — all elements are visible
- **Hash validation checks markdown body content** — which IS what renders in the Full Text tab

### Source of Truth

`content/mappings/` is canonical. `public/mappings/` should be gitignored and copied during build.

---

### Task 1: Add Missing `<div id>` Wrappers to MIT Markdown

The MIT markdown only has one `<div id>` pair. We need wrappers for all mapped sections.

**Files:**
- Modify: `content/licenses/permissive/mit.md`

**Step 1: Rename existing plain-side ID**

Change `plain-perm-use` to `plain-permissions` (consistent naming):
```html
<div id="plain-permissions">
```

**Step 2: Add plain-side div wrappers**

Wrap the conditions section:
```html
<div id="plain-conditions">
## **If** You Give Us Credit and Keep This Notice
...entire conditions section...
</div>
```

Wrap the warranty template block:
```html
<div id="plain-protections">
{{block:warranty}}
</div>
```

**Step 3: Add original-side div wrappers**

Rename existing `original-grant-use` to `original-permissions` (consistent naming):
```html
<div id="original-permissions">
Permission is hereby granted...
</div>
```

Wrap the conditions paragraph:
```html
<div id="original-conditions">
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
</div>
```

Wrap the warranty/liability paragraph:
```html
<div id="original-protections">
THE SOFTWARE IS PROVIDED "AS IS"...
</div>
```

**Step 4: Verify rendering**

Run: `mise run dev`
Navigate to MIT license page, switch to Full License Text tab. Inspect DOM — all `<div id="plain-*">` and `<div id="original-*">` elements should be present and visible.

**Step 5: Commit**

```
refactor(mit): add div id wrappers for all mapped sections in plain and original text
```

---

### Task 2: Build-Time Mapping Validation Script

Create a script that validates mapping JSON hashes against actual license content.

**Files:**
- Create: `src/build/validate-mappings.ts`
- Test: `tests/unit/validate-mappings.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/validate-mappings.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  extractDivContent,
  validateMappingHashes,
} from "../../src/build/validate-mappings";

describe("Mapping Validation", () => {
  describe("extractDivContent", () => {
    it("should extract content from div with id", () => {
      const md = 'Some text\n<div id="test-id">\nHello **world**\n</div>\nMore text';
      const result = extractDivContent(md);
      expect(result).toHaveProperty("test-id");
      expect(result["test-id"]).toContain("Hello **world**");
    });

    it("should extract multiple divs", () => {
      const md = '<div id="a">Content A</div>\n<div id="b">Content B</div>';
      const result = extractDivContent(md);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result.a).toContain("Content A");
      expect(result.b).toContain("Content B");
    });

    it("should return empty object for no divs", () => {
      const result = extractDivContent("Just plain text");
      expect(result).toEqual({});
    });
  });

  describe("validateMappingHashes", () => {
    it("should return valid when hashes match", async () => {
      const { generateClauseHash } = await import("../../src/utils/hash");
      const hash = `sha256:${await generateClauseHash("Hello world")}`;

      const result = await validateMappingHashes(
        {
          license_id: "TEST",
          version: "1.0.0",
          mapping_philosophy: "clause-level with interpretive correspondence",
          mappings: [{
            id: "map-test",
            type: "one-to-one",
            plain_clause: { id: "plain-test", hash, content: "Hello world" },
            original_clause: null,
            confidence: 0.95,
          }],
        },
        { "plain-test": "Hello world" },
        {},
      );
      expect(result.valid).toBe(true);
      expect(result.staleClauseIds).toHaveLength(0);
    });

    it("should detect stale hashes", async () => {
      const result = await validateMappingHashes(
        {
          license_id: "TEST",
          version: "1.0.0",
          mapping_philosophy: "clause-level with interpretive correspondence",
          mappings: [{
            id: "map-test",
            type: "one-to-one",
            plain_clause: {
              id: "plain-test",
              hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
              content: "Old content",
            },
            original_clause: null,
            confidence: 0.95,
          }],
        },
        { "plain-test": "Updated content" },
        {},
      );
      expect(result.valid).toBe(false);
      expect(result.staleClauseIds).toContain("plain-test");
    });

    it("should detect missing div IDs", async () => {
      const result = await validateMappingHashes(
        {
          license_id: "TEST",
          version: "1.0.0",
          mapping_philosophy: "clause-level with interpretive correspondence",
          mappings: [{
            id: "map-test",
            type: "one-to-one",
            plain_clause: { id: "plain-missing", hash: "sha256:abc", content: "x" },
            original_clause: null,
            confidence: 0.95,
          }],
        },
        {},
        {},
      );
      expect(result.valid).toBe(false);
      expect(result.missingIds).toContain("plain-missing");
    });

    it("should skip unmapped entries", async () => {
      const result = await validateMappingHashes(
        {
          license_id: "TEST",
          version: "1.0.0",
          mapping_philosophy: "clause-level with interpretive correspondence",
          mappings: [{
            id: "unmapped-1",
            type: "unmapped-original",
            plain_clause: null,
            original_clause: { id: "original-title", hash: "sha256:x", content: "Title" },
            confidence: null,
          }],
        },
        {},
        {},
      );
      expect(result.valid).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/validate-mappings.test.ts`
Expected: FAIL — module not found

**Step 3: Write the validation module**

Create `src/build/validate-mappings.ts` with these exports:

- `extractDivContent(md: string): Record<string, string>` — regex-extracts `<div id="...">` content
- `validateMappingHashes(mapping, plainDivs, originalDivs): Promise<MappingValidationResult>` — checks each clause ref hash against actual content using `generateClauseHash` from `src/utils/hash.ts`
- `validateAllMappings(): Promise<MappingValidationResult[]>` — orchestrates: reads mapping files from `content/mappings/`, finds license markdown, resolves template blocks via `content/template-blocks/` (read raw files with gray-matter, NOT via Astro collections), splits plain/original bodies on `---[\s\n]+# Original License Text`, extracts divs, validates

CLI entry: validates all mappings, copies valid ones to `public/mappings/`, removes stale ones from `public/mappings/`.

Key implementation details:
- Template block resolution: read `content/template-blocks/{blockId}.md`, parse with `gray-matter`, replace `{{block:blockId}}` with body content (this mirrors what `[...slug].astro` does at lines 77-88 but from raw files, since this runs outside Astro)
- `MappingValidationResult`: `{ licenseId, valid, staleClauseIds, missingIds, errors }`
- Normalize mapping entry access: support both `plain_clause`/`original_clause` (singular) and `plain_clauses`/`original_clauses` (plural array)
- Skip entries with type `unmapped-plain` or `unmapped-original`

**Step 4: Run tests to verify they pass**

Run: `bunx vitest run tests/unit/validate-mappings.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```
new(infra): add build-time mapping validation with hash checking
```

---

### Task 3: Gitignore public/mappings and Wire Into Build

**Files:**
- Modify: `.gitignore` — add `public/mappings/`
- Delete: `public/mappings/MIT-mapping.json`
- Modify: `mise.toml` — add validate-mappings step

**Step 1: Add to gitignore**

Add `public/mappings/` to `.gitignore`.

**Step 2: Remove tracked stale file**

```
git rm public/mappings/MIT-mapping.json
```

**Step 3: Wire validation into build**

Read `mise.toml` to understand the build task. Add `bun run src/build/validate-mappings.ts` as a step that runs **before** `astro build` (since it populates `public/mappings/` which Astro needs to serve).

**Step 4: Verify**

Run: `mise run build`
Expected: Validation runs, warns about MIT being stale (expected until Task 4), build completes.

**Step 5: Commit**

```
chore(infra): gitignore public/mappings, wire validation into build
```

---

### Task 4: Generate Correct MIT Mapping JSON

Replace the placeholder with a complete, correct mapping.

**Files:**
- Modify: `content/mappings/MIT-mapping.json`

**Step 1: Compute real hashes**

Write a one-off script to compute hashes for each `<div id>` block's content in the MIT markdown (after Task 1's changes). Use `generateClauseHash` from `src/utils/hash.ts`.

For `plain-protections`, resolve `{{block:warranty}}` first by reading `content/template-blocks/warranty.md` body (after frontmatter).

```
bun -e "
import { generateClauseHash } from './src/utils/hash';
// ... compute hash for each clause's content
// print: id: sha256:hash
"
```

**Step 2: Write the mapping JSON**

Three mapping entries:

1. **map-permissions** (`one-to-one-expanded`, confidence 0.90, semantic_tag `permissions`)
   - `plain_clause`: id `plain-permissions`, content = permissions section text, hash from step 1
   - `original_clause`: id `original-permissions`, content = original grant text, hash from step 1

2. **map-conditions** (`one-to-one-expanded`, confidence 0.87, semantic_tag `conditions`)
   - `plain_clause`: id `plain-conditions`, content = conditions section text, hash from step 1
   - `original_clause`: id `original-conditions`, content = original conditions text, hash from step 1

3. **map-protections** (`one-to-one-expanded`, confidence 0.90, semantic_tag `warranty`)
   - `plain_clause`: id `plain-protections`, content = resolved warranty block text, hash from step 1
   - `original_clause`: id `original-protections`, content = original WARRANTY paragraph, hash from step 1

Top-level fields:
- `license_id`: `"MIT"`
- `version`: `"0.2.1"` (match package version)
- `mapping_philosophy`: `"clause-level with interpretive correspondence"`
- `generation_method`: `"ai-generated"`
- `human_reviewed`: `false`
- `last_updated`: current ISO timestamp

**Step 3: Validate**

Run: `bun run src/build/validate-mappings.ts`
Expected: `✓ MIT mapping valid`

**Step 4: Commit**

```
new(mit): complete mapping with real hashes covering all clause groups
```

---

### Task 5: Move Comparison Feature to Full Text Tab

The comparison toggle and original text column need to operate within the Full Text tab. Remove mapping-anchors. Simplify MappingViewer.

**Files:**
- Modify: `src/pages/licenses/[...slug].astro`
- Modify: `src/components/MappingViewer.ts`

**Step 1: Move original text column to Full Text panel**

In `src/pages/licenses/[...slug].astro`, restructure. Currently the original text is inside `panel-reference` (Quick Reference tab). Move it into `panel-fulltext`:

Before (current):
```astro
<!-- Quick Reference panel -->
<div id="panel-reference" ...>
  <div class="license-layout">
    <div class="license-column plain-version">
      <LicenseLayout ... />
      {mapping-anchors}
    </div>
    {original text column}
  </div>
</div>

<!-- Full Text panel -->
<div id="panel-fulltext" ...>
  <article class="full-license-text prose" set:html={renderedPlainHtml} />
</div>
```

After:
```astro
<!-- Quick Reference panel -->
<div id="panel-reference" ...>
  <LicenseLayout ... />
</div>

<!-- Full Text panel -->
<div id="panel-fulltext" ...>
  <div class="license-layout">
    <div class="license-column plain-version">
      <article class="full-license-text prose" set:html={renderedPlainHtml} />
    </div>
    {data.show_original_comparison !== false && originalBody && (
      <div class="license-column original-version">
        <h2 class="original-heading">{data.original?.name ?? "Original License"}</h2>
        <div class="license-content prose" set:html={renderMarkdownWithDivs(originalBody)} />
      </div>
    )}
  </div>
</div>
```

**Step 2: Remove mapping-anchors div and related code**

Remove:
- The mapping-anchors div (lines 138-144)
- The `cleanPlainBody` variable (line 107)
- The `.mapping-anchors` CSS rules (lines 423-438)
- The import of `stripTemplatePlaceholders` if no longer used (check with grep first)

**Step 3: Simplify MappingViewer**

In `src/components/MappingViewer.ts`, remove the `isInHiddenContainer` check (line 150-151) and the `if (!isInHiddenContainer)` guard. All mapping elements are now visible in the Full Text tab. The focus/keyboard handlers should always attach.

**Step 4: Move ComparisonToggle into Full Text tab context**

The ComparisonToggle is currently in the reference section below the fold. It should be either:
- Inside or immediately above the Full Text panel
- Or: the Full Text tab button itself could double as the comparison activation

Simplest approach: put the ComparisonToggle inside `panel-fulltext`, above the license-layout div:

```astro
<div id="panel-fulltext" ...>
  <ComparisonToggle hasMapping={!!data.has_mapping} />
  <div class="license-layout">
    ...
  </div>
</div>
```

Remove it from the `reference-section` div.

**Step 5: Verify**

Run: `mise run dev`
1. Navigate to MIT license page
2. Switch to Full License Text tab
3. Enable comparison toggle
4. Verify: original text column appears, hover highlighting works, SVG connectors draw
5. Switch to Quick Reference tab — no comparison elements visible
6. No duplicate IDs in DOM

**Step 6: Commit**

```
refactor(ui): move comparison feature to Full Text tab, remove mapping-anchors
```

---

### Task 6: CI Stale Mapping Detection Workflow

**Files:**
- Create: `.github/workflows/mapping-check.yml`

**Step 1: Write the workflow**

Trigger on pushes to `dev`/`main` when these paths change:
- `content/licenses/**`
- `content/template-blocks/**`
- `content/mappings/**`
- `src/data/license-families/**`

Steps:
1. `actions/checkout@v6`
2. `oven-sh/setup-bun@v2`
3. `bun install --frozen-lockfile`
4. Run `bun run src/build/validate-mappings.ts`, capture output
5. If output contains "STALE", use `actions/github-script@v7` to:
   - Check for existing open issue with same title (dedup)
   - Create issue with label `mapping-stale`, assigned to `claude`
   - Issue body instructs Claude to read the license markdown, schema, and existing mapping, then regenerate and submit a PR

**Step 2: Create the label**

```
gh label create mapping-stale --description "License mapping hashes are stale" --color "E99695"
```

**Step 3: Commit**

```
new(infra): CI workflow for stale mapping detection and auto-issue creation
```

---

### Task 7: Claude Code Action Mapping Prompt Template

**Files:**
- Create: `.github/MAPPING_GENERATION_PROMPT.md`

**Step 1: Write the prompt template**

Reference doc for Claude Code Action covering:
- Input files to read: license markdown, mapping schema (`workers/cms-admin/src/schemas/mapping-schema.json`), template blocks, existing mapping
- Hash generation: normalize (lowercase, collapse whitespace, trim), strip markdown (`**`, `*`, `__`, `[text](url)` to `text`), SHA-256, `sha256:` prefix
- Template block resolution: read `content/template-blocks/{id}.md`, use body after frontmatter
- Confidence rubric: pure translation 0.95-0.99 (`one-to-one`), expansion 0.85-0.94 (`one-to-one-expanded`), interpretive 0.70-0.84 (`one-to-one-expanded`), one-to-many/many-to-one for split mappings
- Required fields per entry: id, type, plain_clause, original_clause, confidence, semantic_tag
- Validation command: `bun run src/build/validate-mappings.ts`
- PR title format: `bot(mappings): regenerate {SPDX-ID} mapping`

**Step 2: Commit**

```
new(infra): add mapping generation prompt template for Claude Code Action
```

---

## Dependency Graph

```
Task 1 (MIT div wrappers) ────┐
                               ├──→ Task 4 (MIT mapping JSON) ──→ Task 5 (move to Full Text tab)
Task 2 (validation script) ───┤
                               │
Task 3 (gitignore + build) ───┘

Task 6 (CI workflow) ── independent
Task 7 (prompt template) ── independent
```

Tasks 1, 2, 3 run in parallel. Task 4 depends on 1+2+3. Task 5 depends on 4. Tasks 6, 7 independent.

## Verification Checklist

- [ ] `bunx vitest run tests/unit/validate-mappings.test.ts` — all pass
- [ ] `bun run src/build/validate-mappings.ts` — MIT shows valid
- [ ] `mise run build` — completes without errors
- [ ] `public/mappings/MIT-mapping.json` exists after build (copied by validation)
- [ ] Full Text tab: comparison toggle works, hover highlighting works, SVG connectors draw
- [ ] Quick Reference tab: no comparison elements, no mapping-anchors
- [ ] No duplicate HTML IDs in rendered page
- [ ] `.gitignore` includes `public/mappings/`
- [ ] `mapping-stale` label exists in GitHub repo

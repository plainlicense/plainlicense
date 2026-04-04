# License Mapping Validation Pipeline

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the license comparison/mapping feature reliable: validate mappings at build time, hide stale ones, produce a correct MIT mapping, and set up CI to detect staleness and trigger LLM-based regeneration.

**Architecture:** Build-time validation script reads license markdown + mapping JSON, resolves template blocks, extracts `<div id>` content, hashes it, and compares to stored hashes. Stale mappings get suppressed (not copied to public/). A CI workflow detects staleness on content changes and opens an issue assigned to `@claude` for automatic regeneration via Claude Code Action.

**Tech Stack:** TypeScript (Bun runtime), Vitest, GitHub Actions, `anthropics/claude-code-action@beta`

## Important Context

### Content Architecture (read this first)

The plain license is rendered visually by **zone components** (`src/components/license/zones/`), NOT by the markdown body. The markdown body is used for:
- Exports/clipboard (resolved with template blocks + vars)
- Hidden mapping-anchors div (preserves `<div id>` elements for MappingViewer)

Zone components already have some IDs:
- `ZonePermissions` → `id="plain-permissions"`
- `ZoneConditions` → `id="plain-conditions"`
- `ZoneProtections` → no ID (uses `<details>`)
- `ZoneInterpretation` → no ID (uses `<details>`)

The **original** text is rendered from the markdown body (after `---` separator) and IS visible when comparison mode is active. Original-side `<div id>` elements are interactive.

### ID Mismatch Problem

The MIT markdown body has `id="plain-perm-use"` but the zone component has `id="plain-permissions"`. MappingViewer looks up elements by the ID in the mapping JSON. These must match.

### What Renders the Warranty/Protections

- **Zones** (visible to user): `src/data/license-families/index.ts` — family-level shared text
- **Template blocks** (exports/clipboard): `content/template-blocks/warranty.md`
- **Original text** (in markdown body): The actual original MIT warranty paragraph
- These are THREE different texts. The mapping connects the **zone text** (what user sees) to the **original text** (in markdown body).

### Source of Truth

`content/mappings/` is canonical. `public/mappings/` should be gitignored and copied during build.

### Duplicate ID Resolution

Zone components will have the mapping IDs (e.g., `id="plain-permissions"`). The hidden mapping-anchors div also renders the markdown body which contains `<div id="plain-permissions">`. Duplicate IDs are invalid HTML. **Resolution**: Remove the mapping-anchors div entirely. Zone components provide the interactive elements MappingViewer needs. The markdown body `<div id>` blocks serve ONLY for build-time hash validation (read from file, not from DOM).

---

### Task 1: Align Mapping IDs Between Zones and Markdown

The zone components and the markdown body need consistent IDs so MappingViewer can find interactive elements and hash validation can verify content.

**Files:**
- Modify: `content/licenses/permissive/mit.md:66` — update `plain-perm-use` to `plain-permissions`
- Modify: `content/licenses/permissive/mit.md` — add div wrappers to original text sections
- Modify: `content/licenses/permissive/mit.md` — add div wrappers around conditions and warranty block
- Modify: `src/components/license/zones/ZoneProtections.astro:16` — add `id="plain-protections"`
- Modify: `src/components/license/zones/ZoneInterpretation.astro:34` — add `id="plain-interpretation"`

**Step 1: Update MIT markdown body div IDs to match zone IDs**

In `content/licenses/permissive/mit.md`, change:
```html
<div id="plain-perm-use">
```
to:
```html
<div id="plain-permissions">
```

**Step 2: Add plain-side div wrappers for conditions and warranty**

In the MIT markdown body, wrap the conditions section:
```html
<div id="plain-conditions">
## **If** You Give Us Credit and Keep This Notice

You can do any of these things with the work, **if you follow these two rules**:

1.  **You must keep our copyright notice**. This tells people who created the work and when.
2.  **You must *also* keep this notice with all versions of the work**. You can give this notice a few ways:
   1. Include this complete notice in the work (the Plain MIT License).
   2. Include this notice in materials that come with the work.
   3. [Link to this notice](https://plainlicense.org/licenses/permissive/mit/) from the work.
   4. Use an accepted standard for linking to licenses, like the [SPDX Identifier](https://spdx.dev/learn/handling-license-info/): `SPDX-LICENSE-IDENTIFIER: MIT`.
</div>
```

And wrap the warranty template block:
```html
<div id="plain-protections">
{{block:warranty}}
</div>
```

**Step 3: Add div wrappers to MIT original text**

In the original text section (after `---`), wrap the conditions and warranty paragraphs:

```html
<div id="original-conditions">
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
</div>

<div id="original-warranty">
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
</div>
```

**Step 4: Add IDs to ZoneProtections and ZoneInterpretation**

In `src/components/license/zones/ZoneProtections.astro`, change:
```html
<details class="zone zone-protections">
```
to:
```html
<details id="plain-protections" class="zone zone-protections">
```

In `src/components/license/zones/ZoneInterpretation.astro`, change:
```html
<details class="zone zone-interpretation">
```
to:
```html
<details id="plain-interpretation" class="zone zone-interpretation">
```

**Step 5: Verify all IDs are present**

Run: `mise run dev` and inspect the MIT license page. Confirm these elements exist:
- `document.getElementById("plain-permissions")` — ZonePermissions section
- `document.getElementById("plain-conditions")` — ZoneConditions section
- `document.getElementById("plain-protections")` — ZoneProtections details
- `document.getElementById("plain-interpretation")` — ZoneInterpretation details
- `document.getElementById("original-grant-use")` — original permission paragraph
- `document.getElementById("original-conditions")` — original conditions paragraph
- `document.getElementById("original-warranty")` — original warranty paragraph

**Step 6: Commit**

```
refactor(ui): align mapping IDs between zone components and markdown body
```

---

### Task 2: Build-Time Mapping Validation Script

Create a script that validates mapping JSON hashes against actual license content. If hashes don't match, the mapping is stale and won't be served.

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

      const divContent = { "plain-test": "Hello world" };
      const mapping = {
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
      };

      const result = await validateMappingHashes(mapping, divContent, {});
      expect(result.valid).toBe(true);
      expect(result.staleClauseIds).toHaveLength(0);
    });

    it("should detect stale hashes", async () => {
      const divContent = { "plain-test": "Updated content" };
      const mapping = {
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
      };

      const result = await validateMappingHashes(mapping, divContent, {});
      expect(result.valid).toBe(false);
      expect(result.staleClauseIds).toContain("plain-test");
    });

    it("should detect missing div IDs", async () => {
      const mapping = {
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
      };

      const result = await validateMappingHashes(mapping, {}, {});
      expect(result.valid).toBe(false);
      expect(result.missingIds).toContain("plain-missing");
    });

    it("should skip unmapped entries", async () => {
      const mapping = {
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
      };

      const result = await validateMappingHashes(mapping, {}, {});
      expect(result.valid).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/validate-mappings.test.ts`
Expected: FAIL — module not found

**Step 3: Write the validation module**

Create `src/build/validate-mappings.ts`. Key exports:

- `extractDivContent(md: string): Record<string, string>` — regex-extracts `<div id="...">` content
- `validateMappingHashes(mapping, plainDivs, originalDivs): Promise<MappingValidationResult>` — checks each clause ref hash against actual content
- `validateAllMappings(): Promise<MappingValidationResult[]>` — orchestrates: reads mapping files from `content/mappings/`, finds license markdown, resolves template blocks via `content/template-blocks/`, splits plain/original bodies, extracts divs, validates hashes
- CLI entry: validates all mappings, copies valid ones to `public/mappings/`, removes stale ones from `public/mappings/`

Template block resolution: read `content/template-blocks/{blockId}.md`, parse with `gray-matter`, replace `{{block:blockId}}` with body content.

Split plain/original: `fullBody.split(/---[\s\n]+# Original License Text/i)`

Use `generateClauseHash` from `src/utils/hash.ts` for hashing.

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
- Delete: `public/mappings/MIT-mapping.json` (tracked stale file)
- Modify: `mise.toml` — add validate-mappings step

**Step 1: Add to gitignore**

Add `public/mappings/` to `.gitignore`.

**Step 2: Remove tracked stale file**

```
git rm public/mappings/MIT-mapping.json
```

**Step 3: Wire validation into build**

Read `mise.toml` to understand current build task structure. Add `bun run src/build/validate-mappings.ts` as a step that runs before `astro build` (since it populates `public/mappings/`).

**Step 4: Verify**

Run: `mise run build`
Expected: Validation runs, warns about MIT being stale (expected until Task 4), build completes.

**Step 5: Commit**

```
chore(infra): gitignore public/mappings, wire validation into build
```

---

### Task 4: Generate Correct MIT Mapping JSON

Replace the placeholder MIT mapping with a complete, correct one.

**Files:**
- Modify: `content/mappings/MIT-mapping.json`

**Step 1: Compute real hashes**

Write a one-off script to compute hashes for each `<div id>` block's content in the MIT markdown (after Task 1's changes). Use `generateClauseHash` from `src/utils/hash.ts`.

For the `plain-protections` div, resolve `{{block:warranty}}` first by reading `content/template-blocks/warranty.md` body.

**Step 2: Write the mapping JSON**

The mapping should have these entries:

1. **map-permissions** (`one-to-one-expanded`, confidence 0.90, semantic_tag `permissions`)
   - `plain-permissions` — the "You Can Do Anything" section
   - `original-grant-use` — "Permission is hereby granted..."

2. **map-conditions** (`one-to-one-expanded`, confidence 0.87, semantic_tag `conditions`)
   - `plain-conditions` — the "If You Give Us Credit" section
   - `original-conditions` — "The above copyright notice..."

3. **map-protections** (`one-to-one-expanded`, confidence 0.90, semantic_tag `warranty`)
   - `plain-protections` — resolved warranty block content
   - `original-warranty` — "THE SOFTWARE IS PROVIDED AS IS..."

Set top-level fields:
- `generation_method: "ai-generated"`
- `human_reviewed: false`
- `last_updated`: current ISO timestamp

**Step 3: Validate**

Run: `bun run src/build/validate-mappings.ts`
Expected: `✓ MIT mapping valid`

**Step 4: Commit**

```
new(mit): complete mapping with real hashes covering all clause groups
```

---

### Task 5: Remove Mapping-Anchors and Update MappingViewer

With zone components now providing the mapping IDs, remove the hidden mapping-anchors div and simplify MappingViewer.

**Files:**
- Modify: `src/pages/licenses/[...slug].astro:117-128` — remove mapping-anchors div
- Modify: `src/pages/licenses/[...slug].astro:106` — remove `cleanPlainBody` variable
- Modify: `src/pages/licenses/[...slug].astro` — remove `.mapping-anchors` CSS
- Modify: `src/components/MappingViewer.ts:150-151` — remove `isInHiddenContainer` check
- Modify: `src/utils/templates.ts` — `stripTemplatePlaceholders` may become unused; verify and remove if so

**Step 1: Remove mapping-anchors from slug page**

In `src/pages/licenses/[...slug].astro`, remove:
```astro
{data.has_mapping && (
  <div
    class="mapping-anchors"
    aria-hidden="true"
    set:html={renderMarkdownWithDivs(cleanPlainBody)}
  />
)}
```

Remove the `cleanPlainBody` variable (line 106):
```typescript
const cleanPlainBody = stripTemplatePlaceholders(plainBody);
```

Remove `.mapping-anchors` CSS rules (lines 217-233).

**Step 2: Simplify MappingViewer**

In `src/components/MappingViewer.ts`, remove the `isInHiddenContainer` check and the `if (!isInHiddenContainer)` guard. All mapping elements are now in visible containers, so focus/keyboard handlers should always attach.

**Step 3: Check for dead code**

If `stripTemplatePlaceholders` in `src/utils/templates.ts` is no longer imported anywhere, remove it. Check with grep first.

**Step 4: Manual verification**

Run: `mise run dev`
Navigate to MIT license page. Enable comparison mode:
- Hover permissions zone — original grant text highlights, SVG connectors draw
- Hover original warranty — protections zone highlights
- Mobile: tap a section — modal opens with original text
- No duplicate IDs in DOM (check with `document.querySelectorAll('[id]')`)

**Step 5: Commit**

```
refactor(ui): remove mapping-anchors, simplify MappingViewer for zone architecture
```

---

### Task 6: CI Stale Mapping Detection Workflow

**Files:**
- Create: `.github/workflows/mapping-check.yml`

**Step 1: Write the workflow**

Trigger on pushes to `dev`/`main` when `content/licenses/**`, `content/template-blocks/**`, `content/mappings/**`, or `src/data/license-families/**` change.

Steps:
1. Checkout, setup Bun, install deps
2. Run `bun run src/build/validate-mappings.ts`, capture output
3. If any mapping is stale, use `actions/github-script@v7` to open an issue with label `mapping-stale`, assigned to `claude`, with body instructing Claude to regenerate the mapping and submit a PR

Include dedup logic: check for existing open issue with same title before creating.

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

Document for Claude Code Action reference covering:
- Which files to read (license markdown, mapping schema, template blocks, existing mapping)
- Hash generation algorithm (normalize, strip markdown, SHA-256, `sha256:` prefix)
- Template block resolution procedure
- Confidence scoring rubric (pure translation 0.95-0.99, expansion 0.85-0.94, interpretive 0.70-0.84)
- Required fields per mapping entry
- Validation command: `bun run src/build/validate-mappings.ts`
- PR title format: `bot(mappings): regenerate {SPDX-ID} mapping`

**Step 2: Commit**

```
new(infra): add mapping generation prompt template for Claude Code Action
```

---

## Dependency Graph

```
Task 1 (align IDs) ──────┐
                          ├──→ Task 4 (MIT mapping JSON) ──→ Task 5 (remove anchors + viewer)
Task 2 (validation) ─────┤
                          │
Task 3 (gitignore+build) ┘

Task 6 (CI workflow) ── independent of 1-5
Task 7 (prompt template) ── independent of 1-5
```

Tasks 1, 2, 3 can run in parallel. Task 4 depends on 1+2+3. Task 5 depends on 4. Tasks 6 and 7 are independent.

## Verification Checklist

After all tasks complete:
- [ ] `bunx vitest run tests/unit/validate-mappings.test.ts` — all pass
- [ ] `bun run src/build/validate-mappings.ts` — MIT shows valid
- [ ] `mise run build` — completes without errors
- [ ] `public/mappings/MIT-mapping.json` exists after build (copied by validation)
- [ ] Dev server: MIT comparison toggle works, hover highlighting works on both sides
- [ ] No duplicate HTML IDs in rendered page (mapping-anchors removed)
- [ ] `.gitignore` includes `public/mappings/`
- [ ] `mapping-stale` label exists in GitHub repo

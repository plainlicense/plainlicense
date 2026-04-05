# Concept Mapping Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the section-level mapping system with concept-level, original-anchored mappings and a dedicated Compare tab.

**Architecture:** Flat concept JSON files anchored on original license text. Build step resolves text positions sequentially (Aho-Corasick-style), derives parent/child hierarchy via containment, validates plain-side matches, and emits a resolved JSON with character offsets. New Compare tab renders original text with inline `<span>` highlighting; a sticky teleprompter sidebar shows plain equivalents on hover/focus.

**Tech Stack:** TypeScript, Astro 5 (static pages), Preact (if needed for reactivity), Vitest, Playwright, marked.js for markdown rendering.

**Design Spec:** `plans/concept-mapping-redesign.md`

---

## Task 1: New Concept Mapping Types and Schema

**Files:**
- Create: `src/types/concept-mapping.ts`
- Test: `tests/unit/concept-mapping-types.test.ts`

This task defines the TypeScript types for the new concept mapping data model. These types are used by the build pipeline, the client-side viewer, and the mapping JSON files.

**Step 1: Write the failing test**

```typescript
// tests/unit/concept-mapping-types.test.ts
import { describe, expect, it } from "vitest";
import type {
  ConceptMapping,
  ConceptMappingFile,
  ResolvedConcept,
  ResolvedMappingFile,
} from "../../src/types/concept-mapping";

describe("ConceptMapping types", () => {
  it("should accept a valid concept mapping file structure", () => {
    const file: ConceptMappingFile = {
      license_id: "MIT",
      version: "1.0.0",
      last_updated: "2026-04-05T00:00:00Z",
      generation_method: "ai-generated",
      human_reviewed: false,
      concepts: [
        {
          id: "grant-free",
          original: "Permission is hereby granted, free of charge",
          plain: ["We give you permission to", "for free"],
        },
        {
          id: "filler-hereby",
          original: "hereby",
          type: "filler",
        },
      ],
    };
    expect(file.concepts).toHaveLength(2);
    expect(file.concepts[0].plain).toBeDefined();
    expect(file.concepts[1].type).toBe("filler");
    expect(file.concepts[1]).not.toHaveProperty("plain");
  });

  it("should accept a valid resolved mapping file structure", () => {
    const resolved: ResolvedMappingFile = {
      license_id: "MIT",
      version: "1.0.0",
      concepts: [
        {
          id: "grant-free",
          start: 0,
          end: 45,
          original: "Permission is hereby granted, free of charge",
          parent: null,
          type: "leaf",
          plain_matches: [
            { text: "We give you permission to", start: 0, end: 25 },
          ],
        },
      ],
      filler: [{ id: "filler-hereby", start: 14, end: 20, original: "hereby" }],
      warnings: [],
    };
    expect(resolved.concepts).toHaveLength(1);
    expect(resolved.concepts[0].type).toBe("leaf");
    expect(resolved.filler).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/concept-mapping-types.test.ts`
Expected: FAIL with module not found

**Step 3: Write the implementation**

```typescript
// src/types/concept-mapping.ts

/** A single concept in the source mapping JSON (authored by LLM/human). */
export type ConceptMapping = {
  id: string;
  original: string;
  plain?: string[];
  type?: "filler";
};

/** The source mapping JSON file structure (content/mappings/{SPDX}-mapping.json). */
export type ConceptMappingFile = {
  license_id: string;
  version: string;
  last_updated: string;
  generation_method: "ai-generated" | "manual";
  human_reviewed: boolean;
  concepts: ConceptMapping[];
};

/** A plain-side text match with character offsets in the rendered plain HTML. */
export type PlainMatch = {
  text: string;
  start: number;
  end: number;
};

/** A resolved concept with character offsets in the rendered original text. */
export type ResolvedConcept = {
  id: string;
  start: number;
  end: number;
  original: string;
  parent: string | null;
  type: "leaf" | "parent";
  plain_matches: PlainMatch[];
};

/** A resolved filler entry with character offsets. */
export type ResolvedFiller = {
  id: string;
  start: number;
  end: number;
  original: string;
};

/** The resolved mapping file served to the client (public/mappings/{SPDX}-mapping.resolved.json). */
export type ResolvedMappingFile = {
  license_id: string;
  version: string;
  concepts: ResolvedConcept[];
  filler: ResolvedFiller[];
  warnings: string[];
};
```

**Step 4: Run test to verify it passes**

Run: `bunx vitest run tests/unit/concept-mapping-types.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/types/concept-mapping.ts tests/unit/concept-mapping-types.test.ts
git commit -m "new(ui): add concept mapping type definitions"
```

---

## Task 2: Concept Position Resolver (Build Step)

**Files:**
- Create: `src/build/concept-resolver.ts`
- Test: `tests/unit/concept-resolver.test.ts`

The resolver takes raw original license text and a `ConceptMappingFile`, finds each concept's text position sequentially, derives parent/child hierarchy, and validates plain-side matches.

**Step 1: Write the failing test for position resolution**

```typescript
// tests/unit/concept-resolver.test.ts
import { describe, expect, it } from "vitest";
import {
  resolvePositions,
  deriveHierarchy,
  validatePlainMatches,
  resolveConceptMapping,
} from "../../src/build/concept-resolver";
import type { ConceptMappingFile } from "../../src/types/concept-mapping";

const ORIGINAL_TEXT =
  "Permission is hereby granted, free of charge, to any person " +
  "obtaining a copy of this software and associated documentation " +
  "files (the \"Software\"), to deal in the Software without " +
  "restriction, including without limitation the rights to use, " +
  "copy, modify, merge, publish, distribute, sublicense, and/or sell " +
  "copies of the Software, and to permit persons to whom the " +
  "Software is furnished to do so, subject to the following conditions:";

const PLAIN_TEXT =
  "We give you permission to:\n\n" +
  "- Use it\n" +
  "- Copy it\n" +
  "- Change it\n" +
  "- Share it\n" +
  "- Sell it\n" +
  "- Mix or put it together with other works\n\n" +
  "You can do all of these things for free.";

describe("resolvePositions", () => {
  it("should find concept positions sequentially in original text", () => {
    const concepts = [
      { id: "grant-free", original: "Permission is hereby granted, free of charge", plain: ["We give you permission to"] },
      { id: "right-use", original: "use", plain: ["Use it"] },
      { id: "right-copy", original: "copy", plain: ["Copy it"] },
    ];

    const result = resolvePositions(concepts, ORIGINAL_TEXT);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("grant-free");
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(44);
    // "use" should match the one after "rights to", not some earlier occurrence
    expect(result[1].id).toBe("right-use");
    expect(ORIGINAL_TEXT.slice(result[1].start, result[1].end)).toBe("use");
    // "copy" should come after "use"
    expect(result[2].start).toBeGreaterThan(result[1].end);
  });

  it("should warn and skip concepts whose text is not found", () => {
    const concepts = [
      { id: "missing", original: "this text does not exist", plain: ["something"] },
    ];

    const result = resolvePositions(concepts, ORIGINAL_TEXT);
    expect(result).toHaveLength(0);
  });

  it("should handle filler concepts (no plain field)", () => {
    const concepts = [
      { id: "filler-hereby", original: "hereby", type: "filler" as const },
    ];

    const result = resolvePositions(concepts, ORIGINAL_TEXT);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("filler-hereby");
    expect(ORIGINAL_TEXT.slice(result[0].start, result[0].end)).toBe("hereby");
  });
});

describe("deriveHierarchy", () => {
  it("should detect parent-child from positional containment", () => {
    const containment = [
      { id: "outer", start: 0, end: 100, original: "outer text" },
      { id: "inner", start: 10, end: 50, original: "inner text" },
    ];

    const result = deriveHierarchy(containment);
    expect(result.find(c => c.id === "inner")?.parent).toBe("outer");
    expect(result.find(c => c.id === "outer")?.parent).toBeNull();
  });

  it("should set type to parent when concept contains children", () => {
    const positions = [
      { id: "outer", start: 0, end: 100, original: "outer" },
      { id: "inner", start: 10, end: 50, original: "inner" },
    ];
    const result = deriveHierarchy(positions);
    expect(result.find(c => c.id === "outer")?.type).toBe("parent");
    expect(result.find(c => c.id === "inner")?.type).toBe("leaf");
  });

  it("should assign tightest parent when multiple containers exist", () => {
    const positions = [
      { id: "grandparent", start: 0, end: 200, original: "gp" },
      { id: "parent", start: 5, end: 100, original: "p" },
      { id: "child", start: 10, end: 50, original: "c" },
    ];
    const result = deriveHierarchy(positions);
    expect(result.find(c => c.id === "child")?.parent).toBe("parent");
    expect(result.find(c => c.id === "parent")?.parent).toBe("grandparent");
  });
});

describe("validatePlainMatches", () => {
  it("should find plain text matches with offsets", () => {
    const concepts = [
      { id: "grant-free", plain: ["We give you permission to", "for free"] },
    ];

    const result = validatePlainMatches(concepts, PLAIN_TEXT);
    expect(result[0].plain_matches).toHaveLength(2);
    expect(result[0].plain_matches[0].text).toBe("We give you permission to");
    expect(result[0].plain_matches[0].start).toBe(0);
  });

  it("should return empty matches and a warning for missing plain text", () => {
    const concepts = [
      { id: "missing", plain: ["this text is not in the plain version"] },
    ];

    const result = validatePlainMatches(concepts, PLAIN_TEXT);
    expect(result[0].plain_matches).toHaveLength(0);
    expect(result[0].warnings).toContain(
      'Concept "missing": plain text "this text is not in the plain version" not found'
    );
  });
});

describe("resolveConceptMapping (integration)", () => {
  it("should produce a complete resolved mapping", () => {
    const mappingFile: ConceptMappingFile = {
      license_id: "MIT",
      version: "1.0.0",
      last_updated: "2026-04-05T00:00:00Z",
      generation_method: "ai-generated",
      human_reviewed: false,
      concepts: [
        { id: "grant-free", original: "Permission is hereby granted, free of charge", plain: ["We give you permission to"] },
        { id: "right-use", original: "use", plain: ["Use it"] },
        { id: "filler-hereby", original: "hereby", type: "filler" },
      ],
    };

    const result = resolveConceptMapping(mappingFile, ORIGINAL_TEXT, PLAIN_TEXT);
    expect(result.license_id).toBe("MIT");
    expect(result.concepts).toHaveLength(2);
    expect(result.filler).toHaveLength(1);
    expect(result.concepts[0].id).toBe("grant-free");
    expect(result.concepts[0].original).toBe("Permission is hereby granted, free of charge");
    expect(result.concepts[0].plain_matches.length).toBeGreaterThan(0);
    expect(result.filler[0].id).toBe("filler-hereby");
    expect(result.filler[0].original).toBe("hereby");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/concept-resolver.test.ts`
Expected: FAIL with module not found

**Step 3: Write the implementation**

```typescript
// src/build/concept-resolver.ts
import type {
  ConceptMapping,
  ConceptMappingFile,
  PlainMatch,
  ResolvedConcept,
  ResolvedFiller,
  ResolvedMappingFile,
} from "../types/concept-mapping";

type PositionedConcept = {
  id: string;
  start: number;
  end: number;
  original: string;
  plain?: string[];
  type?: "filler";
};

/**
 * Find each concept's original text position using sequential document-order matching.
 * Scans left-to-right, advancing past each match start to resolve ambiguity.
 */
export function resolvePositions(
  concepts: ConceptMapping[],
  originalText: string,
): PositionedConcept[] {
  const results: PositionedConcept[] = [];
  let scanPos = 0;

  for (const concept of concepts) {
    const idx = originalText.indexOf(concept.original, scanPos);
    if (idx === -1) {
      console.warn(
        `Concept "${concept.id}": original text "${concept.original.slice(0, 40)}..." not found after position ${scanPos}`,
      );
      continue;
    }

    results.push({
      id: concept.id,
      start: idx,
      end: idx + concept.original.length,
      original: concept.original,
      plain: concept.plain,
      type: concept.type,
    });

    scanPos = idx + 1;
  }

  return results;
}

type HierarchyEntry = {
  id: string;
  start: number;
  end: number;
  original: string;
  parent: string | null;
  type: "leaf" | "parent";
};

/**
 * Derive parent-child hierarchy from positional containment.
 * If concept A's range fully contains concept B's range, B is a child of A.
 * Uses the tightest (smallest) container as the parent.
 */
export function deriveHierarchy(
  positions: Array<{ id: string; start: number; end: number; original: string }>,
): HierarchyEntry[] {
  const entries: HierarchyEntry[] = positions.map((p) => ({
    id: p.id,
    start: p.start,
    end: p.end,
    original: p.original,
    parent: null,
    type: "leaf" as const,
  }));

  for (const child of entries) {
    let tightestParent: HierarchyEntry | null = null;
    let tightestSize = Infinity;

    for (const candidate of entries) {
      if (candidate.id === child.id) continue;
      const contains =
        candidate.start <= child.start && candidate.end >= child.end;
      if (!contains) continue;

      const size = candidate.end - candidate.start;
      if (size < tightestSize) {
        tightestSize = size;
        tightestParent = candidate;
      }
    }

    if (tightestParent) {
      child.parent = tightestParent.id;
      tightestParent.type = "parent";
    }
  }

  return entries;
}

/**
 * Validate plain-side text matches. For each concept with `plain` references,
 * find the text in the plain license and record offsets.
 */
export function validatePlainMatches(
  concepts: Array<{ id: string; plain?: string[] }>,
  plainText: string,
): Array<{ id: string; plain_matches: PlainMatch[]; warnings: string[] }> {
  return concepts.map((concept) => {
    const matches: PlainMatch[] = [];
    const warnings: string[] = [];

    if (!concept.plain) return { id: concept.id, plain_matches: matches, warnings };

    for (const text of concept.plain) {
      const idx = plainText.indexOf(text);
      if (idx === -1) {
        warnings.push(`Concept "${concept.id}": plain text "${text}" not found`);
        continue;
      }
      matches.push({ text, start: idx, end: idx + text.length });
    }

    return { id: concept.id, plain_matches: matches, warnings };
  });
}

/**
 * Full resolution pipeline: positions -> hierarchy -> plain matches -> output.
 */
export function resolveConceptMapping(
  mappingFile: ConceptMappingFile,
  originalText: string,
  plainText: string,
): ResolvedMappingFile {
  const allPositions = resolvePositions(mappingFile.concepts, originalText);

  const fillerPositions = allPositions.filter((p) => p.type === "filler");
  const conceptPositions = allPositions.filter((p) => p.type !== "filler");

  const hierarchy = deriveHierarchy(conceptPositions);
  const plainResults = validatePlainMatches(conceptPositions, plainText);

  const allWarnings: string[] = [];
  const resolvedConcepts: ResolvedConcept[] = hierarchy.map((h) => {
    const plainResult = plainResults.find((p) => p.id === h.id);
    if (plainResult) allWarnings.push(...plainResult.warnings);

    return {
      id: h.id,
      start: h.start,
      end: h.end,
      original: h.original,
      parent: h.parent,
      type: h.type,
      plain_matches: plainResult?.plain_matches ?? [],
    };
  });

  const filler: ResolvedFiller[] = fillerPositions.map((f) => ({
    id: f.id,
    start: f.start,
    end: f.end,
    original: f.original,
  }));

  return {
    license_id: mappingFile.license_id,
    version: mappingFile.version,
    concepts: resolvedConcepts,
    filler,
    warnings: allWarnings,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bunx vitest run tests/unit/concept-resolver.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/build/concept-resolver.ts tests/unit/concept-resolver.test.ts
git commit -m "new(ui): add concept position resolver for mapping build step"
```

---

## Task 3: Build Pipeline Integration

**Files:**
- Modify: `src/build/validate-mappings.ts` (rewrite to use concept resolver)
- Modify: `tests/unit/validate-mappings.test.ts` (update tests for new pipeline)

Replace the hash-based validation with the concept resolver. The build step reads concept mapping JSON, resolves positions against license content, and writes resolved JSON to `public/mappings/`.

**Step 1: Write the failing test for stripMarkdown**

```typescript
// tests/unit/validate-mappings.test.ts — REPLACE existing content
import { describe, expect, it } from "vitest";
import { stripMarkdown } from "../../src/build/validate-mappings";

describe("stripMarkdown", () => {
  it("should strip header markers", () => {
    expect(stripMarkdown("## You Can Do Anything")).toBe("You Can Do Anything");
  });

  it("should strip bold markers", () => {
    expect(stripMarkdown("**Use** it")).toBe("Use it");
  });

  it("should strip link syntax", () => {
    expect(stripMarkdown("[Link text](https://example.com)")).toBe("Link text");
  });

  it("should strip HTML div tags", () => {
    expect(stripMarkdown('<div id="test">content</div>')).toBe("content");
  });

  it("should strip list markers", () => {
    expect(stripMarkdown("- Item one\n- Item two")).toBe("Item one\nItem two");
  });

  it("should collapse excessive newlines", () => {
    expect(stripMarkdown("a\n\n\n\nb")).toBe("a\n\nb");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/validate-mappings.test.ts`
Expected: FAIL because `stripMarkdown` doesn't exist yet

**Step 3: Rewrite validate-mappings.ts**

Replace the entire file with the new version that uses the concept resolver. Key changes:
- Remove `ClauseRef`, `MappingEntry`, `MappingFile`, `MappingValidationResult` types
- Remove `extractDivContent`, `collectClauseRefs`, `validateMappingHashes` functions
- Add `stripMarkdown` utility
- Add `resolveAndExportMappings` function that calls `resolveConceptMapping`
- Keep `resolveTemplateBlocks`, `findLicenseFile`, `splitPlainOriginal` (reusable)
- Output is `{SPDX}-mapping.resolved.json` (not the source file)

The new `validate-mappings.ts`:
- Reads `content/mappings/*.json` as `ConceptMappingFile`
- Reads corresponding license markdown
- Resolves template blocks and strips markdown
- Calls `resolveConceptMapping()` from `concept-resolver.ts`
- Writes resolved JSON to `public/mappings/`
- Reports warnings but does NOT fail the build (warnings = degraded UI, not broken build)

See the design spec (`plans/concept-mapping-redesign.md`) for full details on the build pipeline.

**Step 4: Run tests**

Run: `bunx vitest run tests/unit/validate-mappings.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/build/validate-mappings.ts tests/unit/validate-mappings.test.ts
git commit -m "refactor(ui): replace hash-based mapping validation with concept resolver"
```

---

## Task 4: Create MIT Concept Mapping Data

**Files:**
- Modify: `content/mappings/MIT-mapping.json` (rewrite in new format)

**Step 1: Rewrite the mapping file**

Replace the entire file with the concept-level format. Use the complete MIT mapping from `plans/concept-mapping-redesign.md` as the starting point. Key structure:

```json
{
  "$schema": "../../workers/cms-admin/src/schemas/concept-mapping-schema.json",
  "license_id": "MIT",
  "version": "1.0.0",
  "last_updated": "2026-04-05T00:00:00Z",
  "generation_method": "manual",
  "human_reviewed": true,
  "concepts": [
    { "id": "grant-free", "original": "Permission is hereby granted, free of charge", "plain": ["We give you permission to", "for free"] },
    ...all concepts from the spec...
    { "id": "filler-hereby", "original": "hereby", "type": "filler" },
    ...all filler entries...
  ]
}
```

Concepts must be listed in document order (left-to-right in the original text).

**Step 2: Run the build step to validate**

Run: `bun run src/build/validate-mappings.ts`
Expected: Output showing concept count and filler count for MIT

**Step 3: Inspect the resolved output**

Run: `command cat public/mappings/MIT-mapping.resolved.json | head -50`
Expected: JSON with character offsets, parent/child hierarchy, and plain matches

**Step 4: Fix any warnings from the resolver**

If plain text matches fail, adjust the `plain` arrays to match the actual stripped markdown text. The `stripMarkdown()` output is what the resolver matches against, so plain references must match that output, not the raw markdown.

Run the build step again until clean.

**Step 5: Commit**

```
git add content/mappings/MIT-mapping.json
git commit -m "refactor(ui): convert MIT mapping to concept-level format"
```

---

## Task 5: Remove Old Mapping Infrastructure from Markdown

**Files:**
- Modify: `content/licenses/permissive/mit.md` lines 66-82, 84-97, 99-103, 117-127, 129-134, 136-147
- Modify: `content/licenses/public-domain/unlicense.md` (same pattern)
- Modify: `src/pages/licenses/[...slug].astro` lines 86-114 (renderMarkdownWithDivs)
- Modify: `cmsconfig/licenses.ts` lines 151-166 (has_mapping, mapping_version)

**Step 1: Strip div wrappers from MIT license**

In `content/licenses/permissive/mit.md`, remove all `<div id="plain-*">` and `<div id="original-*">` wrapper tags and their closing `</div>` tags. Keep all content inside them. The markdown should have zero HTML div tags when done.

Before:
```markdown
<div id="plain-permissions">

## You Can Do Anything with The Work
...
</div>
```

After:
```markdown
## You Can Do Anything with The Work
...
```

Do the same for the original section divs. Also remove `has_mapping: true`, `mapping_version: 1.0.0` from the frontmatter.

Do the same cleanup for `content/licenses/public-domain/unlicense.md` if it has divs.

**Step 2: Simplify renderMarkdownWithDivs**

In `src/pages/licenses/[...slug].astro`, the `renderMarkdownWithDivs()` function (lines 86-114) exists solely to preserve `<div id>` wrappers during markdown rendering. Replace it with:

```typescript
function renderLicenseMarkdown(md: string): string {
  const processed = convertCaretInsert(convertDefinitionLists(md));
  return marked.parse(processed) as string;
}
```

Replace all calls to `renderMarkdownWithDivs` with `renderLicenseMarkdown` (lines 171 and 283).

Also remove the JSDoc comment about div preservation (lines 22-31).

**Step 3: Remove has_mapping and mapping_version from CMS config**

In `cmsconfig/licenses.ts`, remove the `has_mapping` and `mapping_version` field definitions (around lines 151-166).

**Step 4: Verify build still works**

Run: `bunx astro check`
Run: `mise run build`
Expected: Clean build. No errors related to missing divs.

**Step 5: Commit**

```
git add content/licenses/ cmsconfig/licenses.ts src/pages/licenses/[...slug].astro
git commit -m "refactor(ui): remove div wrappers and old mapping fields from license content"
```

---

## Task 6: Remove Old Components

**Files:**
- Delete: `src/components/ComparisonToggle.astro`
- Delete: `src/components/ComparisonModal.astro`
- Delete: `src/components/MappingViewer.ts`
- Modify: `src/pages/licenses/[...slug].astro` — remove imports and usage
- Modify: `src/assets/stylesheets/custom.css` lines 19-24
- Modify: `src/assets/stylesheets/print.css` lines 485-492

**Step 1: Delete component files**

```
rm src/components/ComparisonToggle.astro
rm src/components/ComparisonModal.astro
rm src/components/MappingViewer.ts
```

**Step 2: Clean up the license page**

In `src/pages/licenses/[...slug].astro`:

Remove imports (lines 7-8):
```typescript
import ComparisonModal from "../../components/ComparisonModal.astro";
import ComparisonToggle from "../../components/ComparisonToggle.astro";
```

Remove comparison toggle wrapper (lines 217-221):
```astro
{data.has_mapping && (
  <div id="comparison-toggle-wrapper" hidden>
    <ComparisonToggle hasMapping={true} />
  </div>
)}
```

Remove `<ComparisonModal />` (line 306).

Remove the mapping fetch script block (lines 311-331 — the import of `initMappingViewer` and the fetch logic).

Remove comparison-active coordination in tab switching (lines 364-371).

Remove CSS classes from the `<style>` block:
- `.comparison-active .license-layout` grid (lines 515-517)
- `.comparison-active .original-version` sticky (lines 519-528)
- `.comparison-active.license-container` max-width (lines 530-532)
- `.comparison-active .original-version.mapping-dim` (lines 536-544)
- `.comparison-active .license-content [id]` (lines 579-585)
- `.mapping-source` (lines 588-594)
- `.mapping-target` (lines 597-603)
- `.mapping-cutout` (lines 606-616)
- `.comparison-active .readability-bar` grid (lines 739-760)

**Step 3: Clean up stylesheets**

In `src/assets/stylesheets/custom.css`, remove the `[id^="plain-"]` / `[id^="original-"]` hover styles (lines 19-24).

In `src/assets/stylesheets/print.css`, remove the `.mapping-source`, `.mapping-target`, `.mapping-cutout` rules (lines 485-492).

**Step 4: Verify no remaining references**

Run a search to confirm all old references are gone. Expect no matches in `src/`, `content/`, or `cmsconfig/` (matches in `plans/`, `docs/`, and `specs/` are fine).

**Step 5: Verify build**

Run: `bunx astro check && mise run build`
Expected: Clean build

**Step 6: Commit**

```
git add -A
git commit -m "refactor(ui): remove old mapping components and comparison toggle system"
```

---

## Task 7: Compare Tab — Astro Component

**Files:**
- Create: `src/components/CompareTab.astro`
- Modify: `src/pages/licenses/[...slug].astro` — add Compare tab button and panel

**Step 1: Create the CompareTab component**

The component receives rendered original HTML and the SPDX ID. It renders:
- A two-column grid: original text (left) + teleprompter (right)
- Column badges matching the existing style
- A mobile concept modal (hidden by default)
- The teleprompter starts with an instruction message

See `src/components/CompareTab.astro` in the plan's Task 7 section above for the full component code.

**Step 2: Add the Compare tab to the license page**

In `src/pages/licenses/[...slug].astro`:

Add import:
```typescript
import CompareTab from "../../components/CompareTab.astro";
```

Add a third tab button in the nav (after the Full License Text button):
```astro
<button role="tab" id="tab-compare" aria-controls="panel-compare" aria-selected="false" class="tab-button" tabindex="-1" style="display: none;">
  Compare
</button>
```

The tab is hidden by default (`display: none`). The client script (Task 9) shows it when a resolved mapping loads successfully.

Add the Compare panel after the fulltext panel:
```astro
<div id="panel-compare" role="tabpanel" aria-labelledby="tab-compare" class="tab-panel" hidden>
  <CompareTab
    originalHtml={renderLicenseMarkdown(originalBody)}
    spdxId={data.spdx_id}
  />
</div>
```

The existing tab switching logic (`querySelectorAll('[role="tab"]')`) already handles N tabs — no changes needed.

**Step 3: Verify the tab renders**

Run: `mise run dev`
Navigate to `/licenses/permissive/mit`. You won't see the tab yet (it's hidden). Temporarily remove `style="display: none;"` to verify the layout renders correctly. Then restore the hidden state.

**Step 4: Commit**

```
git add src/components/CompareTab.astro src/pages/licenses/[...slug].astro
git commit -m "new(ui): add Compare tab component with teleprompter layout"
```

---

## Task 8: Compare Tab — CSS

**Files:**
- Create: `src/assets/stylesheets/compare-tab.css`
- Modify: `src/pages/licenses/[...slug].astro` — import the stylesheet

**Step 1: Write the styles**

Create `src/assets/stylesheets/compare-tab.css` with styles for:
- `.compare-layout` — two-column grid (1fr 1fr on desktop, single column on mobile)
- `.concept-span` — persistent underline in `--cat-color`, hover/focus brightens
- `.concept-span.concept-active` — active state with stronger background
- `.concept-span.concept-child-active` — child highlight
- `.compare-original-text.concept-dimmed` — fades unmapped text to 0.15 opacity
- `.concept-filler` — dimmed text, dashed red underline, CSS tooltip via `::after`
- `.compare-teleprompter` — sticky sidebar with max-height and scroll
- `.teleprompter-content` — card-style container with border and border-radius
- `.concept-modal` — mobile bottom-sheet modal (same pattern as old ComparisonModal)
- Print rules: hide teleprompter and modal, remove underlines

Key design decisions:
- Filler styling wins over concept styling (filler gets `color: var(--sl-color-gray-4)` and dashed red border)
- Concept underlines stay visible even when dimmed (they use border-bottom, not opacity)
- Teleprompter content uses `animation: teleprompterFadeIn 0.2s ease` for smooth transitions

See the full CSS in the plan's Task 8 section above.

**Step 2: Import the stylesheet**

In `src/pages/licenses/[...slug].astro`, add near the top imports:
```typescript
import "../../assets/stylesheets/compare-tab.css";
```

**Step 3: Visual check**

Run: `mise run dev`
Temporarily show the Compare tab. Verify layout at multiple viewport widths.

**Step 4: Commit**

```
git add src/assets/stylesheets/compare-tab.css src/pages/licenses/[...slug].astro
git commit -m "new(ui): add Compare tab CSS with concept underlines and teleprompter"
```

---

## Task 9: ConceptViewer — Client-Side Interaction

**Files:**
- Create: `src/components/ConceptViewer.ts`
- Modify: `src/pages/licenses/[...slug].astro` — add client script

This is the core client-side logic. Key responsibilities:

1. Fetch the resolved mapping JSON (`/mappings/{SPDX}-mapping.resolved.json`)
2. Walk the DOM text nodes in the original text container using `TreeWalker`
3. Find each concept's text sequentially and wrap in `<span>` elements
4. Handle hover/focus to activate concepts (add `.concept-active` class)
5. On parent hover, also add `.concept-child-active` to children
6. Update the teleprompter with plain text equivalents
7. On mobile, open the concept modal instead
8. Show/hide the Compare tab based on mapping availability

**Critical implementation detail — DOM text wrapping:**

The resolved JSON has character offsets against stripped markdown. But the DOM has rendered HTML. The ConceptViewer must match by **text content**, not offsets. Approach:

1. Use `TreeWalker(NodeFilter.SHOW_TEXT)` to collect all text nodes in the container
2. Build a concatenated text string with node boundary tracking
3. For each concept (sorted by document order), find its `original` text in the concatenated string using `indexOf` with a scan position (same sequential matching)
4. Map the text position to the specific text node(s) using the boundary map
5. Use `document.createRange()` + `range.surroundContents()` to wrap in a `<span>`
6. Handle the case where a concept spans across element boundaries (e.g., across `<strong>`) by wrapping each text node segment separately with the same `data-concept-id`

See the full implementation in the plan's Task 9 and Task 10 sections above.

**Step 1: Create ConceptViewer.ts**

Write the full file with:
- `initConceptViewer(data: ResolvedMappingFile)` — main entry point
- `wrapConceptsInDom(container, concepts)` — DOM-based text wrapping
- `updateTeleprompter(el, concept, hideInstruction)` — teleprompter updates
- `showConceptModal(modal, body, concept)` — mobile modal
- Event handlers for hover, focus, blur, click, keyboard

**Step 2: Add client script to the license page**

In `src/pages/licenses/[...slug].astro`, in the `<script>` block, add:

```typescript
import { initConceptViewer } from "../../components/ConceptViewer";
import type { ResolvedMappingFile } from "../../types/concept-mapping";

const comparePanel = document.getElementById("panel-compare");
if (comparePanel && spdxId) {
  fetch(`/mappings/${spdxId}-mapping.resolved.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<ResolvedMappingFile>;
    })
    .then((data) => {
      initConceptViewer(data);
      const compareTab = document.getElementById("tab-compare");
      if (compareTab) compareTab.style.display = "";
    })
    .catch(() => {
      const compareTab = document.getElementById("tab-compare");
      if (compareTab) compareTab.style.display = "none";
    });
}
```

**Step 3: Build and test manually**

Run: `mise run build && mise run dev`
Navigate to MIT license. Verify:
- Compare tab appears
- Original text has concept underlines
- Filler words have dashed red underlines with tooltips
- Hover activates concepts and updates teleprompter
- Parent hover highlights children
- Mobile viewport: tap opens modal

**Step 4: Commit**

```
git add src/components/ConceptViewer.ts src/pages/licenses/[...slug].astro
git commit -m "new(ui): add ConceptViewer client-side interaction for Compare tab"
```

---

## Task 10: E2E Tests

**Files:**
- Create: `tests/e2e/compare-tab.spec.ts`

**Step 1: Write E2E tests**

Test the full user journey:
- Compare tab visible for MIT (has mapping), hidden for MPL-2.0 (no mapping)
- Original text has concept spans with underlines
- Filler spans have tooltips
- Hover activates concepts and updates teleprompter
- Dimming works (non-active text fades)
- Keyboard navigation (tab through concepts, focus triggers activation)
- Mobile: tap opens modal (test at mobile viewport)

See the full test file in the plan's Task 11 section above.

**Step 2: Build the site**

Run: `mise run build`

**Step 3: Run E2E tests**

Run: `bunx playwright test tests/e2e/compare-tab.spec.ts`
Expected: PASS (fix issues iteratively)

**Step 4: Commit**

```
git add tests/e2e/compare-tab.spec.ts
git commit -m "new(ui): add E2E tests for Compare tab concept mapping"
```

---

## Task 11: Update Unlicense Mapping

**Files:**
- Modify: `content/mappings/Unlicense-mapping.json`

**Step 1: Decide on approach**

Read the Unlicense content. If it's worth mapping (it's very short — good second test case), convert to concept format. If not a priority, delete the mapping file.

**Step 2: Convert or delete**

If converting: write concepts in document order, mark filler, run build step to validate.
If deleting: `rm content/mappings/Unlicense-mapping.json`

**Step 3: Commit**

```
git add content/mappings/
git commit -m "chore(content): update Unlicense mapping for new concept format"
```

---

## Task 12: Clean Up Schema and Docs

**Files:**
- Delete or replace: `workers/cms-admin/src/schemas/mapping-schema.json`
- Create: `workers/cms-admin/src/schemas/concept-mapping-schema.json`
- Delete: `docs/plans/2026-04-04-mapping-validation-pipeline.md` (superseded)

**Step 1: Create new JSON schema**

Write a JSON Schema that validates the `ConceptMappingFile` structure. Keep it simple:
- `license_id`: string, required
- `version`: string, semver pattern
- `concepts`: array of objects with `id`, `original`, optional `plain` (string array), optional `type` ("filler")

**Step 2: Update MIT mapping $schema reference**

**Step 3: Delete old schema**

**Step 4: Run all tests**

Run: `bunx vitest run && bunx playwright test && mise run lint`
Expected: All pass

**Step 5: Commit**

```
git add -A
git commit -m "chore(infra): replace mapping schema with concept-level format, clean up old docs"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Type definitions | `src/types/concept-mapping.ts` |
| 2 | Concept resolver (build step) | `src/build/concept-resolver.ts` |
| 3 | Build pipeline integration | `src/build/validate-mappings.ts` |
| 4 | MIT concept mapping data | `content/mappings/MIT-mapping.json` |
| 5 | Remove div wrappers from markdown | `content/licenses/*.md`, `cmsconfig/licenses.ts` |
| 6 | Remove old components | `ComparisonToggle`, `ComparisonModal`, `MappingViewer` |
| 7 | Compare tab Astro component | `src/components/CompareTab.astro` |
| 8 | Compare tab CSS | `src/assets/stylesheets/compare-tab.css` |
| 9 | ConceptViewer client logic | `src/components/ConceptViewer.ts` |
| 10 | E2E tests | `tests/e2e/compare-tab.spec.ts` |
| 11 | Unlicense mapping update | `content/mappings/Unlicense-mapping.json` |
| 12 | Schema and docs cleanup | Schema, old docs |

**Critical path:** Tasks 1-4 (data layer) -> 5-6 (remove old) -> 7-9 (new UI) -> 10-12 (tests & cleanup)

**Parallelizable pairs:** Tasks 1+2, Tasks 5+6, Tasks 7+8

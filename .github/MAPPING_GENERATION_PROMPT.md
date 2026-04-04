# Mapping Generation Prompt

Reference document for the Claude Code Action when regenerating license clause mappings. Follow every step precisely.

## Overview

You are regenerating a mapping file that pairs plain-language license clauses with their corresponding original legal text. The mapping tracks content hashes so the build pipeline can detect when content drifts out of sync.

## 1. Input Files

Read these files before generating anything:

| File | Purpose |
|------|---------|
| `content/licenses/{category}/{spdx-id}.md` | License markdown with plain and original sections |
| `workers/cms-admin/src/schemas/mapping-schema.json` | JSON Schema defining the mapping format |
| `content/template-blocks/{id}.md` | Template blocks referenced by `{{block:...}}` placeholders |
| `content/mappings/{SPDX-ID}-mapping.json` | Existing mapping (if any) to use as a starting point |
| `packages/{spdx-id}/package.json` | Current version number for the `version` field |
| `src/utils/hash.ts` | Hash functions (`normalizeContent`, `generateClauseHash`) |
| `src/build/validate-mappings.ts` | Validation script and `extractDivContent` regex |

## 2. Identify Sections

### Plain-language sections

Located in the license markdown **above** the `---` / `# Original License Text` separator. Each mappable section is wrapped in:

```html
<div id="plain-{descriptive-id}">
...clause content...
</div>
```

### Original-language sections

Located **below** the `---` / `# Original License Text` separator. Each section is wrapped in:

```html
<div id="original-{descriptive-id}">
...clause content...
</div>
```

### Completeness requirement

Every `<div id="plain-...">` and `<div id="original-...">` block in the markdown MUST have a corresponding entry in the mapping. If a block exists only on one side, use `unmapped-plain` or `unmapped-original` type.

## 3. Hash Generation

Hashes MUST be generated using the exact algorithm in `src/utils/hash.ts`. The steps are:

1. **Extract content**: Use the regex from `extractDivContent` in `validate-mappings.ts` to get inner text. The content is what falls between `<div id="...">` and `</div>`, trimmed.
2. **Resolve template blocks**: If content contains `{{block:some-id}}`, read `content/template-blocks/some-id.md`, parse with gray-matter, and substitute the body (after frontmatter) in place of the placeholder. Hash the **resolved** content, not the raw placeholder.
3. **Normalize**: Apply `normalizeContent()` from `src/utils/hash.ts`:
   - Convert to lowercase
   - Collapse all whitespace (spaces, newlines, tabs) to a single space
   - Trim leading/trailing whitespace
   - Strip markdown: remove `**`, `*`, `__`, and convert `[text](url)` to just the inner text
4. **Hash**: SHA-256 the normalized string.
5. **Format**: Prefix with `sha256:` to produce `sha256:{64-char-hex}`.

**Do not hand-write hashes.** Use `generateClauseHash()` programmatically or run the function in a script to produce correct values.

## 4. Confidence Scoring

Assign a confidence score and mapping type based on how the plain clause relates to the original:

| Confidence Range | Type | Description |
|-----------------|------|-------------|
| 0.95 - 0.99 | `one-to-one` | Near-direct translation, minimal rewording |
| 0.85 - 0.94 | `one-to-one-expanded` | Translation with clarification or added context |
| 0.70 - 0.84 | `one-to-one-expanded` | Interpretive expansion (adds examples, options, explanation) |
| varies | `one-to-many` | One plain section covers multiple original sections |
| varies | `many-to-one` | Multiple plain sections explain one original section |
| varies | `many-to-many` | Multiple-to-multiple relationship |
| null | `unmapped-plain` | Content only in the plain version (no original counterpart) |
| null | `unmapped-original` | Content only in the original (no plain counterpart) |

**Schema constraints**: `one-to-one` requires confidence >= 0.95. `one-to-one-expanded` requires confidence >= 0.85. Unmapped types require `confidence: null`.

## 5. Required Fields Per Mapping Entry

```jsonc
{
  "id": "map-{descriptive-kebab-case}",   // e.g. "map-permissions", "map-warranty"
  "type": "<type from schema enum>",
  "plain_clause": {                        // or "plain_clauses" array for many-to-*
    "id": "plain-{id}",                    // matches the div id in markdown
    "hash": "sha256:{64-char-hex}",
    "content": "<raw text from inside the div>"
  },
  "original_clause": {                     // or "original_clauses" array for *-to-many
    "id": "original-{id}",                 // matches the div id in markdown
    "hash": "sha256:{64-char-hex}",
    "content": "<raw text from inside the div>"
  },
  "confidence": 0.92,                      // float 0.0-1.0, or null for unmapped
  "semantic_tag": "permissions"             // see list below
}
```

### Semantic tags

Use one of: `permissions`, `warranty`, `conditions`, `liability`, `termination`, `interpretation`, `definitions`, `scope`, `metadata`, `attribution`, `patents`, `copyleft`, `notices`.

## 6. Top-Level Mapping File Structure

```jsonc
{
  "$schema": "../../workers/cms-admin/src/schemas/mapping-schema.json",
  "license_id": "{SPDX-ID}",              // e.g. "MIT", "MPL-2.0"
  "version": "{version from package.json}",
  "mapping_philosophy": "clause-level with interpretive correspondence",
  "generation_method": "ai-generated",
  "ai_model": "claude-opus-4-6",
  "human_reviewed": false,
  "last_updated": "{ISO 8601 timestamp}",
  "mappings": [ ... ],
  "metadata": {
    "total_mappings": 0,
    "mapping_types": {},
    "average_confidence": 0.0,
    "completeness": {
      "plain_clauses_mapped": 1.0,
      "original_clauses_mapped": 1.0
    }
  }
}
```

Compute `metadata` fields from the actual mappings array after generation.

## 7. Generation Procedure

1. Read the license markdown file.
2. Split into plain and original sections at the `---` / `# Original License Text` boundary.
3. Extract all `<div id>` blocks from each section using the regex from `extractDivContent`.
4. Resolve any `{{block:...}}` template placeholders.
5. For each plain div, identify the best-matching original div(s) by reading and comparing content.
6. For each original div not yet matched, check if it maps to a plain div or mark as `unmapped-original`.
7. For each plain div not matched, mark as `unmapped-plain`.
8. Generate hashes programmatically (run `generateClauseHash` from `src/utils/hash.ts`).
9. Assign confidence scores and types per the rubric above.
10. Assemble the full JSON structure.
11. Write to `content/mappings/{SPDX-ID}-mapping.json`.

## 8. Validation

After writing the mapping file, run:

```bash
bun run src/build/validate-mappings.ts
```

Expected output for a valid mapping:

```
  {SPDX-ID}: all hashes valid
```

If validation fails, the output shows which clause IDs are stale or missing. Debug by:

1. Checking that `content` fields contain exactly the text between `<div id>` and `</div>` (trimmed).
2. Verifying template blocks were resolved before hashing.
3. Confirming the normalization matches `normalizeContent()` exactly.
4. Re-running `generateClauseHash()` on the extracted content to compare hashes.

Do not submit a mapping that fails validation.

## 9. PR Submission

- **Branch**: `bot/mappings/{spdx-id}`
- **Commit message**: `bot(mappings): regenerate {SPDX-ID} mapping`
- **PR title**: `bot(mappings): regenerate {SPDX-ID} mapping`
- **PR body**: Include a brief description of what changed in the license content that triggered regeneration, the number of mapping entries, and validation status.
- **Labels**: `bot`, `mappings`
- **Assignee**: the repository maintainer (not `claude`)

## 10. Edge Cases

- **New license with no existing mapping**: Generate from scratch following all steps above.
- **Template block not found**: Log a warning but leave the `{{block:...}}` placeholder unresolved. The validation script handles this the same way.
- **Empty div blocks**: Skip them. Do not create mapping entries for divs with no content.
- **Nested markdown in divs**: Preserve markdown in the `content` field. Only strip markdown during normalization for hashing.

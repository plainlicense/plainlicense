# Mapping Data Contract

**Feature**: 001-cms-license-platform
**Component**: Mapping JSON ↔ UI Rendering
**Last Updated**: 2026-01-30

## Overview

This contract defines the structure, validation, and usage of license clause mapping data. Mapping files (`{license-id}-mapping.json`) establish correspondence between plain language clauses and original legal text.

**Key Principle**: Mapping data is version-controlled JSON that validates against a JSON Schema, enabling UI to render interactive clause comparisons.

## File Structure

### Location
```
content/mappings/
├── mit-mapping.json
├── mpl-2-0-mapping.json
├── elastic-2-0-mapping.json
└── ...
```

### Naming Convention
- **Pattern**: `{license-id}-mapping.json`
- **Must match**: License `spdx_id` from frontmatter (lowercase with hyphens)
  - License: `spdx_id: "MIT"` → Mapping: `mit-mapping.json`
  - License: `spdx_id: "MPL-2.0"` → Mapping: `mpl-2-0-mapping.json`

## Schema Reference

**Authoritative Schema**: `mapping-schema.json` (root of repository)

All mapping files MUST validate against this schema. See `mapping-schema.json` for:
- Complete field definitions
- Validation rules
- Type constraints
- Conditional requirements

## Core Data Structure

### Top-Level Object

```json
{
  "license_id": "MIT",
  "version": "0.2.1",
  "last_updated": "2026-01-30T12:00:00Z",
  "mapping_philosophy": "clause-level with interpretive correspondence",
  "generation_method": "ai-assisted",
  "ai_model": "claude-3-5-sonnet",
  "human_reviewed": true,
  "semantic_tags": {
    "permissions": ["plain-perm-use", "plain-perm-copy"],
    "warranty": ["plain-warranty-as-is"],
    "conditions": ["plain-cond-copyright"]
  },
  "mappings": [ /* array of mapping objects */ ],
  "validation": { /* validation metadata */ },
  "metadata": { /* statistics */ }
}
```

### Required Top-Level Fields

1. **license_id** (string): SPDX identifier or custom ID
   - Must match license frontmatter `spdx_id`
   - Examples: `"MIT"`, `"MPL-2.0"`, `"Elastic-2.0"`

2. **version** (string): Plain License version (semantic version)
   - Pattern: `^\d+\.\d+\.\d+$`
   - Must match system version from `package.json`
   - Example: `"0.2.1"`

3. **mapping_philosophy** (enum): Mapping approach
   - `"clause-level with interpretive correspondence"`
   - `"section-level with strict translation"`
   - `"custom"`

4. **mappings** (array): Array of mapping objects (see below)

### Optional Top-Level Fields

- **last_updated** (ISO 8601 datetime): Last modification timestamp
- **generation_method** (enum): `"manual"`, `"ai-assisted"`, `"ai-generated"`
- **ai_model** (string): AI model used (if applicable)
- **human_reviewed** (boolean): Whether human reviewed AI output
- **semantic_tags** (object): Groups of clause IDs by category
- **validation** (object): Validation status and change tracking
- **metadata** (object): Statistics about mappings

## Mapping Object Structure

### Mapping Types

Each mapping has a `type` field indicating the relationship:

1. **one-to-one**: Direct 1:1 correspondence (confidence ≥ 0.95)
2. **one-to-one-expanded**: 1:1 with plain language expansion (confidence ≥ 0.85)
3. **one-to-many**: 1 plain clause → multiple original clauses
4. **many-to-one**: Multiple plain clauses → 1 original clause
5. **many-to-many**: Multiple plain ↔ multiple original
6. **unmapped-plain**: Plain clause with no original equivalent
7. **unmapped-original**: Original clause with no plain equivalent

### Mapping Object Schema

```json
{
  "id": "map-perm-use",
  "type": "one-to-one-expanded",
  "plain_clause": {
    "id": "plain-perm-use",
    "semantic_tag": "permissions",
    "hash": "sha256:a1b2c3d4e5f6789...",
    "content": "- **Use** it",
    "context": "We give you permission to:",
    "content_normalized": "Use it",
    "content_preview": "Use it",
    "line_start": 12,
    "line_end": 12,
    "section_heading": "Permissions",
    "is_list_item": true,
    "markdown_preserved": true
  },
  "original_clause": {
    "id": "original-grant-use",
    "semantic_tag": "permissions",
    "hash": "sha256:9f8e7d6c5b4a321...",
    "content": "Permission is hereby granted...",
    "line_start": 5,
    "line_end": 7,
    "section_heading": null,
    "is_list_item": false,
    "markdown_preserved": false
  },
  "confidence": 0.92,
  "expansion_type": "educational-clarification",
  "semantic_tag": "permissions",
  "notes": "Plain language simplifies legal phrasing",
  "created_at": "2026-01-30T10:00:00Z",
  "created_by": "ai-assisted",
  "last_validated": "2026-01-30T12:00:00Z",
  "human_reviewed": true,
  "reviewer_notes": "Confirmed accurate simplification"
}
```

### Required Mapping Fields

1. **id** (string): Unique mapping identifier
   - Pattern: `^map-[a-z0-9-]+$`
   - Example: `"map-perm-use"`, `"map-warranty-1"`

2. **type** (enum): Mapping relationship type (see above)

### Optional Mapping Fields

- **plain_clause** (Clause | Clause[] | null): Plain language clause(s)
- **original_clause** (Clause | Clause[] | null): Original clause(s)
- **confidence** (number 0.0-1.0 | null): Mapping confidence score
- **expansion_type** (enum): Type of expansion if applicable
- **semantic_tag** (string): Primary semantic category
- **notes** (string, max 1000 chars): Human/AI explanation
- **created_at** (ISO 8601 datetime): Creation timestamp
- **created_by** (enum): `"human"`, `"ai-assisted"`, `"ai-generated"`
- **last_validated** (ISO 8601 datetime): Last validation timestamp
- **human_reviewed** (boolean): Whether human reviewed
- **reviewer_notes** (string, max 500 chars): Human reviewer notes

## Clause Object Structure

### Required Clause Fields

```json
{
  "id": "plain-perm-use",
  "hash": "sha256:a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789",
  "content": "- **Use** it"
}
```

1. **id** (string): Semantic identifier
   - Pattern: `^(plain|original)-[a-z0-9-]+$`
   - Examples: `"plain-perm-use"`, `"original-grant-copyright"`

2. **hash** (string): SHA-256 hash of normalized content
   - Pattern: `^sha256:[a-f0-9]{64}$`
   - Full 64-character hash (UI truncates for display)

3. **content** (string): Raw clause text
   - Min 1 char, max 5000 chars
   - Preserves markdown formatting

### Optional Clause Fields

- **semantic_tag** (string): Category tag (e.g., `"permissions"`, `"warranty"`)
- **context** (string, max 500 chars): Surrounding text
- **content_normalized** (string, max 5000 chars): Content with markdown stripped
- **content_preview** (string, max 100 chars): Truncated display version
- **line_start** (integer ≥ 1): Starting line in source file
- **line_end** (integer ≥ 1): Ending line in source file
- **section_heading** (string, max 200 chars): Parent section title
- **is_list_item** (boolean): True if part of a list
- **markdown_preserved** (boolean): Whether content includes markdown
- **annotations** (array): Editorial annotations (not hashed)

### Hash Generation Rules

**Normalization Process** (before hashing):
1. Strip markdown formatting: `**bold**` → `bold`
2. Normalize whitespace: Multiple spaces → single space
3. Trim leading/trailing whitespace
4. Convert to UTF-8 bytes
5. Generate SHA-256 hash
6. Prefix with `sha256:`

**Example**:
```
Original: "- **Use** it  \n"
Normalized: "Use it"
Hash: sha256:a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789
```

**Stability**: Hash remains stable across:
- Markdown formatting changes (bold, italic, links)
- Whitespace changes (extra spaces, newlines)
- Annotation additions (not included in hash)

## Semantic Tag Taxonomy

### Standard Tags (9 Core Categories)

As defined in Design Decision #6 (see `mapping-specification.md`):

1. **permissions**: Rights granted to users
2. **conditions**: Requirements users must follow
3. **warranty**: Warranty disclaimers and "as-is" statements
4. **liability**: Liability limitations and damage exclusions
5. **termination**: License termination conditions
6. **definitions**: Term definitions and interpretations
7. **scope**: What the license covers
8. **interpretation**: How to interpret the license
9. **metadata**: License title, version, URLs

### Hierarchical Tags (Colon Notation)

Use `:` delimiter for subtags (Design Decision #2):

- `permissions:commercial` - Commercial use permission
- `permissions:modification` - Modification permission
- `warranty:as-is` - "As-is" warranty disclaimer
- `conditions:attribution` - Attribution requirement

### Custom Tags

Use `custom:` prefix for license-specific tags:
- `custom:patent-grant` - Patent-related clauses
- `custom:trademark-exclusion` - Trademark-specific terms

## Confidence Scoring Rubric

**Scale**: 0.00 to 1.00 (Design Decision #7)

| Score Range | Meaning | Example |
|-------------|---------|---------|
| 0.95 - 0.99 | Direct translation, word-for-word | Legal → Plain identical meaning |
| 0.85 - 0.94 | Interpretive but accurate | Plain simplifies but preserves meaning |
| 0.70 - 0.84 | Reasonable correspondence | Some interpretation, defensible |
| 0.50 - 0.69 | Loose correspondence | Significant interpretation |
| 0.30 - 0.49 | Uncertain mapping | Questionable relationship |
| < 0.30 | Very uncertain or unmapped | Likely incorrect |

**Null Confidence**: Set `confidence: null` for unmapped-plain and unmapped-original types.

**Override with Justification** (Design Decision #7):
- Allowed: Human reviewer can override AI confidence
- Required: `reviewer_notes` must explain override reasoning

## Validation Object

### Validation Schema

```json
{
  "validation": {
    "tags_with_changes": ["permissions", "warranty"],
    "mappings_needing_review": ["map-perm-use", "map-warranty-1"],
    "last_content_hash_check": "2026-01-30T12:00:00Z",
    "validation_status": "needs_review"
  }
}
```

### Validation Status Enum

- **valid**: All mappings validated, no content changes detected
- **needs_review**: Content changes detected, human review required
- **invalid**: Critical validation failures, mapping unusable

### Change Detection Process

1. **Hash Comparison**: Compare current content hash with stored hash
2. **Tag Collection**: Collect semantic tags of changed clauses
3. **Mapping Identification**: Identify mappings referencing changed clauses
4. **Status Update**: Set `validation_status` based on critical tag involvement

### Critical Tags (Block Publishing)

Per Design Decision #4 (Hybrid Validation):

**Critical** (block publishing if invalid):
- `permissions`
- `conditions`
- `warranty`
- `liability`

**Non-Critical** (warn only):
- `definitions`
- `scope`
- `interpretation`
- `metadata`
- `termination`

## Metadata Object

### Metadata Schema

```json
{
  "metadata": {
    "total_mappings": 12,
    "mapping_types": {
      "one-to-one": 3,
      "one-to-one-expanded": 5,
      "one-to-many": 2,
      "many-to-one": 1,
      "unmapped-plain": 1,
      "unmapped-original": 0
    },
    "average_confidence": 0.89,
    "human_review_time_minutes": 45,
    "ai_processing_time_seconds": 12.5,
    "completeness": {
      "plain_clauses_mapped": 0.92,
      "original_clauses_mapped": 1.0
    }
  }
}
```

**All fields optional**. Used for analytics and quality reporting.

## Loading and Validation

### Build-Time Loading (Astro)

```typescript
// src/utils/mappings.ts
import Ajv from 'ajv';
import mappingSchema from '../../../mapping-schema.json';
import type { MappingData } from '../types/mappings';

const ajv = new Ajv();
const validateMapping = ajv.compile(mappingSchema);

export async function loadMapping(licenseId: string): Promise<MappingData | null> {
  try {
    // Dynamic import
    const mapping = await import(`../../content/mappings/${licenseId}-mapping.json`);
    const data = mapping.default as MappingData;

    // Validate against schema
    if (!validateMapping(data)) {
      console.error(`Invalid mapping for ${licenseId}:`, validateMapping.errors);
      throw new Error(`Mapping validation failed for ${licenseId}`);
    }

    // Validate license_id matches
    if (data.license_id !== licenseId.toUpperCase()) {
      throw new Error(`Mapping license_id mismatch: expected ${licenseId}, got ${data.license_id}`);
    }

    return data;
  } catch (error) {
    console.warn(`Mapping not found or invalid for license: ${licenseId}`);
    return null;
  }
}
```

### Runtime Validation (Client)

```typescript
// src/components/MappingViewer.ts
export function validateMappingData(data: unknown): data is MappingData {
  if (!data || typeof data !== 'object') return false;

  const mapping = data as Partial<MappingData>;

  // Required fields
  if (!mapping.license_id || !mapping.version || !Array.isArray(mapping.mappings)) {
    return false;
  }

  // Validate each mapping
  return mapping.mappings.every(m => {
    return m.id && m.type && typeof m.id === 'string';
  });
}
```

## UI Rendering Contract

### Mapping Viewer Component Interface

```typescript
interface MappingViewerProps {
  mapping: MappingData;
  mode?: 'side-by-side' | 'overlay' | 'toggle';
  highlightEnabled?: boolean;
  showConfidence?: boolean;
  showMetadata?: boolean;
}

export function initMappingViewer(
  container: HTMLElement,
  props: MappingViewerProps
): MappingViewerInstance;
```

### Side-by-Side Layout (Design Decision #5)

```html
<div class="mapping-viewer">
  <!-- Plain Language Column -->
  <div class="plain-column">
    <h3>Plain Language</h3>
    <div class="clause-group" data-mapping-id="map-perm-use">
      <div class="clause" data-clause-id="plain-perm-use">
        <span class="content">Use it</span>
        <span class="confidence">92%</span>
      </div>
    </div>
  </div>

  <!-- Connector (Visual Lines) -->
  <svg class="connectors">
    <line x1="..." y1="..." x2="..." y2="..." />
  </svg>

  <!-- Original License Column -->
  <div class="original-column">
    <h3>Original License</h3>
    <div class="clause-group" data-mapping-id="map-perm-use">
      <div class="clause" data-clause-id="original-grant-use">
        <span class="content">Permission is hereby granted...</span>
      </div>
    </div>
  </div>
</div>
```

### Many-to-Many Rendering

For mappings with type `many-to-many`, `one-to-many`, or `many-to-one`:

1. **Group related clauses**: Display clauses in visual groups
2. **Connector lines**: Draw lines connecting all related clauses
3. **Highlight on hover**: Highlight entire group when user hovers over any clause
4. **Expand/collapse**: Allow collapsing of complex many-to-many mappings

### CSS Custom Highlight API (Future Enhancement)

Per Design Decision (mapping-specification.md), use CSS Custom Highlight API for:
- Non-destructive clause highlighting
- Preserve original HTML structure
- Support overlapping highlights (multiple semantic tags)

```javascript
// Future implementation
const plainRange = new Range();
plainRange.setStart(plainClauseNode, 0);
plainRange.setEnd(plainClauseNode, plainClauseNode.length);

const highlight = new Highlight(plainRange);
CSS.highlights.set('mapping-perm-use', highlight);
```

## Error Handling

### Validation Errors

**Missing Required Field**:
```
Error: Invalid mapping for MIT
  - Missing required field: license_id
  - File: content/mappings/mit-mapping.json
```

**Schema Validation Failure**:
```
Error: Mapping validation failed for MIT
  - mappings[0].confidence: must be <= 1.0
  - mappings[2].type: must be one of allowed values
  - File: content/mappings/mit-mapping.json:45
```

**Hash Mismatch**:
```
Warning: Content hash mismatch detected
  - Clause: plain-perm-use
  - Expected: sha256:a1b2c3...
  - Actual: sha256:9f8e7d...
  - Status: needs_review
```

### Loading Errors

**File Not Found**:
```
Warning: Mapping not found for license: MIT
  - Expected: content/mappings/mit-mapping.json
  - License has_mapping: true but file missing
```

**JSON Parse Error**:
```
Error: Invalid JSON in mapping file
  - File: content/mappings/mit-mapping.json:23
  - Unexpected token '}' in JSON at position 1234
```

## Version Control Strategy (Design Decision #8)

### Schema Versioning

- **Schema Version**: Stored in `$schema` field in mapping-schema.json
- **Breaking Changes**: Major version bump (1.0.0 → 2.0.0)
- **New Optional Fields**: Minor version bump (1.0.0 → 1.1.0)
- **Fixes**: Patch version bump (1.0.0 → 1.0.1)

### Content Versioning

- **Git History**: Full version control via Git commits
- **Blame Support**: Track which human/AI made each change
- **Rollback**: Git revert for problematic mappings
- **Branching**: Draft mappings on feature branches before merge

### Migration Strategy

When schema version changes:
1. **Backward Compatibility**: Old mappings still load (if possible)
2. **Migration Script**: Automated conversion to new schema
3. **Validation**: Ensure all mappings validate against new schema
4. **Human Review**: Review AI-migrated mappings for accuracy

## Success Criteria

### Performance ✅
- **Load Time**: Mapping JSON loads in <100ms (typical 20KB file)
- **Validation**: Schema validation completes in <50ms
- **Rendering**: UI renders mapping viewer in <200ms

### Quality ✅
- **Accuracy**: All mappings validate against schema
- **Completeness**: >90% of clauses mapped (per metadata)
- **Confidence**: Average confidence >0.85 for non-unmapped mappings

### Usability ✅
- **Visual Clarity**: User can visually trace plain → original correspondence
- **Confidence Display**: Users see confidence scores for quality assessment
- **Change Detection**: Users notified when content changes require review

## Related Contracts

- **CMS Content Contract** (`cms-content-contract.md`): How mapping files are authored
- **Astro Content Contract** (`astro-content-contract.md`): How Astro loads mappings
- **Phase 1 AI Prototype** (`phase1-ai-prototype-spec.md`): AI-assisted mapping generation

## References

- Mapping Schema: `mapping-schema.json` (authoritative schema)
- Mapping Specification: `mapping-specification.md` (design decisions)
- JSON Schema: https://json-schema.org/
- SHA-256: https://en.wikipedia.org/wiki/SHA-2
- CSS Custom Highlight API: https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API

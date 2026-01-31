# License Clause Mapping Specification

**Feature**: 001-cms-license-platform
**Version**: 1.0.0
**Date**: 2026-01-30
**Status**: Draft for Review
**Purpose**: Define the canonical specification for mapping plain language licenses to original legal text

---

## Table of Contents

1. [Core Definitions](#core-definitions)
2. [Clause Specification](#clause-specification)
3. [Mapping Specification](#mapping-specification)
4. [Semantic Tag Taxonomy](#semantic-tag-taxonomy)
5. [Confidence Scoring Rubric](#confidence-scoring-rubric)
6. [Hash Generation Specification](#hash-generation-specification)
7. [Validation Rules](#validation-rules)
8. [Data Model (JSON Schema)](#data-model-json-schema)
9. [Edge Cases and Examples](#edge-cases-and-examples)

---

## Core Definitions

### What is a Clause?

**Definition**: A clause is the smallest semantic unit of legal meaning within a license that can be independently understood and mapped.

**Granularity**:
- **Primary**: Sentence-level
- **Refinement**: Can be more granular (sub-sentence) when a sentence contains multiple distinct legal concepts
- **Never**: Less granular than a sentence (no paragraph-level clauses)

**Examples**:

**Valid Clause** (sentence-level):
```markdown
You must keep our copyright notice.
```

**Valid Clause** (sub-sentence, distinct concept):
```markdown
- **Use** it
```
(Part of list: "We give you permission to: - Use it - Copy it - Change it")

**Valid Clause** (sub-sentence, complex sentence):
Original: "Permission is hereby granted, free of charge, to any person obtaining a copy of this software"
Can be split into:
- Clause 1: "Permission is hereby granted"
- Clause 2: "free of charge"
- Clause 3: "to any person obtaining a copy of this software"

**Invalid Clause** (paragraph-level, too broad):
```markdown
## We Give No Promises or Guarantees

We give the work to you as it is, without any promises or guarantees. This means:
- "As is": You get the work exactly how it is, including anything broken.
- "No Guarantees": We are not promising it will work well...
```
(This is a SECTION containing multiple clauses)

---

### What is a Mapping?

**Definition**: A mapping is a documented correspondence between one or more plain language clauses and one or more original license clauses that express the same legal concept.

**Purpose**:
1. **Traceability**: Show which original legal text informed each plain language clause
2. **Transparency**: Help users understand how plain language relates to original
3. **Validation**: Enable detection of unmapped or incorrectly mapped content
4. **Navigation**: Power interactive UI features (click plain → highlight original)

**Mapping is NOT**:
- A guarantee of legal equivalence (plain licenses are interpretive)
- A word-for-word translation
- Required to be one-to-one (can be many-to-many)

---

## Clause Specification

### Clause Identification Rules

#### Rule 1: Sentence Boundaries
- Start with sentence-level parsing using standard sentence boundary detection
- Period (.), question mark (?), exclamation mark (!) indicate boundaries
- EXCEPTION: Abbreviations (e.g., "i.e.", "e.g.") do not create boundaries

#### Rule 2: List Items as Clauses
When content is formatted as a list:
```markdown
We give you permission to:
- **Use** it
- **Copy** it
- **Change** it
```

Each list item is an independent clause:
- Clause 1: "Use it"
- Clause 2: "Copy it"
- Clause 3: "Change it"

**Context preservation**: Store parent text ("We give you permission to:") as `context` field

#### Rule 3: Complex Sentences
Sentences with multiple independent concepts CAN be split:

**Example 1** - Multiple legal requirements:
```
"The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software."
```

Can be split:
- Clause 1: "The above copyright notice... shall be included in all copies"
- Clause 2: "this permission notice shall be included in all copies"

OR kept as single clause - **editor decides based on mapping needs**

**Example 2** - Qualifiers that modify meaning:
```
"Permission is hereby granted, free of charge, to any person..."
```

Keep as single clause if "free of charge" is essential qualifier, OR split if plain license treats "free of charge" as separate concept.

**Guiding principle**: Split when plain language maps concepts independently, keep together when plain language treats as unified concept.

#### Rule 4: Headings are NOT Clauses
```markdown
## We Give No Promises or Guarantees
```

This is a **section heading**, not a clause. It provides context and structure but has no independent legal meaning.

**Storage**: Headings stored as `context` for clauses within that section.

#### Rule 5: Annotations and Notes
```markdown
<div class="annotate" markdown>
1. **You must keep our copyright notice**.(1) This tells people who created the work. { .annotate }
</div>

1. That's the part at the top that says who created the work and when.
```

- Main content: "You must keep our copyright notice" = Clause
- Annotation: "(1) This tells people who created the work" = NOT a clause, stored as metadata
- Note: "That's the part at the top..." = NOT a clause, editorial explanation

---

### Clause Data Structure

Each clause has the following required and optional fields:

```json
{
  "id": "plain-perm-use",
  "semantic_tag": "permissions",
  "hash": "sha256:a1b2c3d4...",
  "content": "- **Use** it",
  "context": "We give you permission to:",
  "content_normalized": "Use it",
  "content_preview": "Use it",
  "line_start": 36,
  "line_end": 36,
  "section_heading": "You Can Do Anything with The Work",
  "is_list_item": true,
  "markdown_preserved": true
}
```

**Field Definitions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Semantic identifier (kebab-case) |
| `semantic_tag` | string | ✅ | Category (see taxonomy below) |
| `hash` | string | ✅ | SHA-256 of normalized content |
| `content` | string | ✅ | Raw clause text (preserves markdown) |
| `context` | string | ⚪ | Surrounding text (heading, list intro) |
| `content_normalized` | string | ⚪ | Content with markdown stripped |
| `content_preview` | string | ⚪ | Truncated for display (max 100 chars) |
| `line_start` | integer | ⚪ | Starting line number in source file |
| `line_end` | integer | ⚪ | Ending line number in source file |
| `section_heading` | string | ⚪ | Parent section title |
| `is_list_item` | boolean | ⚪ | True if part of list |
| `markdown_preserved` | boolean | ⚪ | Whether content includes markdown |

---

## Mapping Specification

### Mapping Types

#### Type 1: `one-to-one`
**Definition**: Single plain clause maps to single original clause with minimal interpretation.

**Characteristics**:
- Direct semantic equivalence
- Only language simplification (legalese → plain)
- No structural reorganization

**Example**:
- Plain: "Use it"
- Original: "to use"
- Notes: "Direct translation with friendly formatting"

---

#### Type 2: `one-to-one-expanded`
**Definition**: Single plain clause maps to single original clause but adds educational context or examples.

**Characteristics**:
- Core meaning preserved
- Plain adds explanatory content not literal in original
- Expansion consistent with legal intent

**Example**:
- Plain: "You can do all of these things **for free**. You can do them for any reason."
- Original: "free of charge"
- Notes: "Plain expands 'free of charge' to clarify both cost and purpose freedom"

---

#### Type 3: `one-to-many`
**Definition**: Single plain clause maps to multiple original clauses.

**Characteristics**:
- Plain consolidates multiple original concepts
- Used when original is verbose or repetitive
- Plain summarizes without losing legal meaning

**Example**:
- Plain: "We are not responsible for any problems or damages"
- Original Clauses:
  - "SHALL NOT BE LIABLE FOR ANY CLAIM"
  - "DAMAGES OR OTHER LIABILITY"
  - "WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE"
- Notes: "Plain consolidates various liability disclaimers into single accessible statement"

---

#### Type 4: `many-to-one`
**Definition**: Multiple plain clauses map to single original clause.

**Characteristics**:
- Original has complex compound sentence
- Plain splits into multiple clear statements
- Used for readability and comprehension

**Example**:
- Plain Clauses:
  - "You must keep our copyright notice"
  - "You must also keep this notice with all versions of the work"
- Original: "The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software"
- Notes: "Original compound requirement split into two explicit rules"

---

#### Type 5: `many-to-many`
**Definition**: Multiple plain clauses map to multiple original clauses.

**Characteristics**:
- Used when plain language completely reorganizes original structure
- Common in complex copyleft licenses
- Original concepts "dismantled" and rebuilt in plain language

**Example**:
- Plain Clauses:
  - "If you change the work, you must share your changes under the same license"
  - "You must make the source materials available"
  - "You must include a copy of this license with your changes"
- Original Clauses:
  - "You must license... under the terms of this License"
  - "The Source Code... must be available under this License"
  - "A copy of this License must be included"
- Notes: "Original scattered requirements reorganized into logical sequence in plain language"

---

#### Type 6: `unmapped-plain`
**Definition**: Plain clause exists with no corresponding original clause.

**Characteristics**:
- Content added by Plain License project
- Examples: Legal disclaimers, interpretation notes, navigation aids

**Example**:
- Plain: "This plain language version is not legal advice. When in doubt, consult the original license or a lawyer."
- Original: (none)
- Notes: "Plain License editorial addition for legal clarity"

---

#### Type 7: `unmapped-original`
**Definition**: Original clause exists with no corresponding plain clause.

**Characteristics**:
- Original content omitted from plain version
- Typically structural (title, metadata) or redundant

**Example**:
- Plain: (none)
- Original: "# The MIT License (MIT)"
- Notes: "Title heading omitted in plain version, covered by frontmatter"

---

### Mapping Data Structure

```json
{
  "id": "map-perm-use",
  "type": "one-to-one-expanded",
  "plain_clause": {
    "id": "plain-perm-use",
    "semantic_tag": "permissions",
    "hash": "sha256:abc123",
    "content": "- **Use** it",
    "context": "We give you permission to:"
  },
  "original_clause": {
    "id": "original-grant-use",
    "semantic_tag": "permissions",
    "hash": "sha256:def456",
    "content": "to use",
    "context": "including without limitation the rights to use, copy, modify..."
  },
  "confidence": 0.95,
  "expansion_type": "educational-clarification",
  "notes": "Direct translation with friendly formatting",
  "created_at": "2026-01-30T10:00:00Z",
  "created_by": "ai-assisted",
  "last_validated": "2026-01-30T10:00:00Z",
  "human_reviewed": true,
  "reviewer_notes": null
}
```

**For many-to-one, one-to-many, many-to-many**:
```json
{
  "id": "map-conditions-split",
  "type": "many-to-one",
  "plain_clauses": [
    {
      "id": "plain-cond-copyright",
      "content": "You must keep our copyright notice"
    },
    {
      "id": "plain-cond-license-notice",
      "content": "You must also keep this notice with all versions"
    }
  ],
  "original_clause": {
    "id": "original-conditions-combined",
    "content": "The above copyright notice and this permission notice shall be included..."
  },
  "confidence": 0.88,
  "expansion_type": "restructuring",
  "notes": "Original compound requirement split for clarity"
}
```

---

## Semantic Tag Taxonomy

### Purpose
Group clauses by legal concept to enable:
1. **Tag-based validation**: Detect changes by semantic area
2. **Organized review**: Review all warranty clauses together
3. **Navigation**: Filter mappings by legal topic
4. **Analytics**: Understand mapping distribution

### Core Tags (Universal)

#### `permissions`
**Definition**: Rights explicitly granted to users of the work

**Examples**:
- "Use it"
- "Copy it"
- "Modify it"
- "Distribute it"
- "Sell copies"

**Subtags** (optional):
- `permissions:commercial` - Commercial use rights
- `permissions:modification` - Right to create derivative works
- `permissions:distribution` - Right to share/distribute

---

#### `conditions`
**Definition**: Requirements users must follow to exercise permissions

**Examples**:
- "You must keep our copyright notice"
- "You must share changes under same license"
- "You must include a copy of this license"

**Subtags** (optional):
- `conditions:attribution` - Credit/copyright requirements
- `conditions:share-alike` - Copyleft requirements
- `conditions:distribution` - Requirements when distributing

---

#### `warranty`
**Definition**: Disclaimers about guarantees, warranties, and quality

**Examples**:
- "We give the work to you as it is"
- "No Guarantees: We are not promising it will work"
- "THE SOFTWARE IS PROVIDED 'AS IS'"

**Subtags** (optional):
- `warranty:as-is` - "As is" disclaimers
- `warranty:quality` - Quality/fitness disclaimers
- `warranty:merchantability` - Merchantability disclaimers

---

#### `liability`
**Definition**: Limitations on liability and damages

**Examples**:
- "We are not responsible for any problems or damages"
- "SHALL NOT BE LIABLE FOR ANY CLAIM"
- "You use it at your own risk"

**Subtags** (optional):
- `liability:damages` - Damage disclaimers
- `liability:claims` - Claim limitations
- `liability:indemnification` - Indemnification clauses

---

#### `termination`
**Definition**: Conditions under which license ends or rights are revoked

**Examples**:
- "If you break these rules, you lose your permissions"
- "This License shall terminate automatically"
- "Upon termination, you must cease all use"

---

#### `definitions`
**Definition**: Terms defined for use throughout license

**Examples**:
- "The 'work' means the software or creative content covered by this license"
- "'Source materials' means the preferred form for making modifications"
- "'You' means the person or entity using the work"

---

#### `scope`
**Definition**: What the license covers or applies to

**Examples**:
- "This license applies to the software and associated documentation"
- "Covers all versions and derivative works"
- "Applies to source code and compiled binaries"

---

#### `interpretation`
**Definition**: How to interpret the license (Plain License additions)

**Examples**:
- "This plain language version is not legal advice"
- "When in doubt, consult the original license"
- "Plain language may not capture all legal nuances"

---

#### `metadata`
**Definition**: License metadata (title, version, URL)

**Examples**:
- "The MIT License (MIT)"
- "Version 2.0"
- "https://opensource.org/licenses/MIT"

---

### Tag Assignment Rules

1. **Primary Tag**: Every clause MUST have exactly one primary semantic tag
2. **Subtags**: Optional, use colon notation (`permissions:commercial`)
3. **Multiple Concepts**: If clause spans multiple tags, choose primary based on dominant concept
4. **Consistency**: Use same tag for equivalent clauses in plain and original

---

## Confidence Scoring Rubric

### Purpose
Confidence scores (0.0 - 1.0) indicate how certain we are that a mapping correctly represents the legal correspondence between plain and original clauses.

### Scoring Criteria

#### 0.95 - 0.99: Direct Translation
**Criteria**:
- Nearly identical legal meaning
- Only language simplification (legalese → plain English)
- No interpretation or expansion
- One-to-one correspondence

**Examples**:
- "use" → "Use it" (0.98)
- "copy" → "Copy it" (0.98)
- "modify" → "Change it" (0.97 - slight semantic shift)

**Use When**:
- Mapping is obvious and unambiguous
- No legal interpretation required
- Any competent reader would agree

---

#### 0.85 - 0.94: Translation with Educational Expansion
**Criteria**:
- Core legal meaning preserved
- Plain adds explanatory context not literal in original
- Expansion consistent with legal intent
- Examples or clarifications added

**Examples**:
- Original: "free of charge"
- Plain: "You can do all of these things **for free**. You can do them for any reason."
- Score: 0.90
- Reason: Adds "for any reason" as clarification of "free of charge" intent

**Use When**:
- Plain explains concepts not explicit in original
- Educational additions don't change legal meaning
- Reasonable lawyers would agree expansion is valid

---

#### 0.70 - 0.84: Legal Interpretation with Examples
**Criteria**:
- Plain interprets how to comply with requirement
- Adds compliance methods not explicit in original
- Interpretation reasonable but not literal
- May introduce minor legal ambiguity

**Examples**:
- Original: "shall be included in all copies"
- Plain: "You can give this notice a few ways: [4 methods including SPDX identifiers, linking]"
- Score: 0.80
- Reason: Interprets "included" to allow multiple compliance methods

**Use When**:
- Plain makes interpretation of original's intent
- Adds practical examples of compliance
- Interpretation defensible but not universally agreed

---

#### 0.50 - 0.69: Conceptual Correspondence
**Criteria**:
- Plain restructures original concept
- Many-to-many mapping common
- Legal meaning preserved but form dramatically different
- Requires careful review

**Examples**:
- Complex copyleft clause "dismantled" into multiple plain clauses
- Original scattered requirements reorganized logically
- Score: 0.65
- Reason: Significant restructuring, meaning preserved but transformed

**Use When**:
- Original and plain have different structures
- Concept mapping rather than text mapping
- Requires legal expertise to verify equivalence

---

#### 0.30 - 0.49: Loose Association
**Criteria**:
- Thematically related but not direct translation
- Plain may combine multiple original concepts loosely
- Or original split into very different plain structure
- Mapping questionable

**Examples**:
- Plain summary that paraphrases multiple original sections
- Original legalese that plain interprets broadly
- Score: 0.40
- Reason: Uncertain correspondence, needs legal review

**Use When**:
- Mapping is uncertain
- Multiple interpretations possible
- Needs expert legal review

---

#### Below 0.30: Unmapped or Questionable
**Criteria**:
- No clear correspondence
- Mapping likely incorrect
- Should be flagged for review

**Examples**:
- Plain content with no original source
- Original content omitted in plain
- Score: 0.20 or use `unmapped-plain` / `unmapped-original` types

**Use When**:
- Mapping is very uncertain
- Better to mark as unmapped

---

### Confidence Adjustment Factors

**Increase confidence (+0.05 to +0.10)**:
- Multiple legal experts agree on mapping
- Mapping validated across multiple license versions
- Clear precedent in legal interpretation

**Decrease confidence (-0.05 to -0.10)**:
- Plain adds substantial new content
- Ambiguity in original legal language
- Multiple valid interpretations possible

---

## Hash Generation Specification

### Purpose
Content hashes enable validation and change detection without storing full text.

### Algorithm: SHA-256

### Input Normalization Rules

#### Rule 1: Whitespace Normalization
```javascript
// Trim leading/trailing whitespace
content = content.trim();

// Collapse multiple spaces to single space
content = content.replace(/\s+/g, ' ');

// Remove line breaks (normalize to spaces)
content = content.replace(/\n/g, ' ');
```

**Example**:
```
Input:  "  You  must   keep\nour   copyright  notice  "
Output: "You must keep our copyright notice"
```

---

#### Rule 2: Markdown Preservation
**KEEP markdown formatting** in hash input.

**Rationale**: Markdown affects meaning and display.

**Example**:
```
Input:  "- **Use** it"
Hash:   sha256("- **Use** it")  // NOT sha256("Use it")
```

**Why**: `**Use**` (bold) vs `Use` has different emphasis

---

#### Rule 3: Template Variables
**PRESERVE template variables** (e.g., `{{ year }}`)

**Example**:
```
Input:  "Copyright (c) {{ year }} <copyright holders>"
Hash:   sha256("Copyright (c) {{ year }} <copyright holders>")
```

**Rationale**: Template variables are semantic placeholders, not dynamic content

---

#### Rule 4: Annotations and HTML
**EXCLUDE** HTML annotations and metadata.

**Example**:
```
Input:  "You must keep our copyright notice.(1) This tells people... { .annotate }"
Clean:  "You must keep our copyright notice."
Hash:   sha256("You must keep our copyright notice.")
```

**Rule**: Strip all HTML/markdown annotations:
- `<div class="annotate">...</div>`
- `{ .annotate }`
- `(1)` reference markers

---

### Hash Output Format

```
sha256:a1b2c3d4e5f6...
```

**Encoding**: Hexadecimal (lowercase)
**Prefix**: `sha256:` for algorithm identification

---

### Hash Collision Handling

**Probability**: Negligible for license clauses (2^-256)

**If collision detected** (same hash, different content):
- Add disambiguation suffix to clause ID: `plain-perm-use-1`, `plain-perm-use-2`
- Recalculate hash with suffix included
- Log warning for manual review

---

### Hash Validation Workflow

```javascript
function validateMapping(mapping, currentLicenseContent) {
  const plainClause = extractClause(currentLicenseContent.plain, mapping.plain_clause.id);
  const plainHash = generateHash(plainClause.content);

  if (plainHash !== mapping.plain_clause.hash) {
    return {
      valid: false,
      reason: 'plain_clause_content_changed',
      semantic_tag: mapping.plain_clause.semantic_tag,
      mapping_id: mapping.id,
      action_required: 'human_review'
    };
  }

  // Repeat for original_clause

  return { valid: true };
}
```

**Tag-based validation**:
```javascript
// When content changes, identify affected tags
function identifyChangedTags(oldMappings, currentContent) {
  const changedTags = new Set();

  for (const mapping of oldMappings) {
    const validation = validateMapping(mapping, currentContent);
    if (!validation.valid) {
      changedTags.add(validation.semantic_tag);
    }
  }

  return Array.from(changedTags);
}

// Result: ["warranty", "conditions"]
// UI: "⚠️ 12 mappings need review (warranty: 7, conditions: 5)"
```

---

## Validation Rules

### Mapping Completeness

#### Rule: All Plain Clauses Should Be Mapped
**Validation**: Check that every identified plain clause appears in at least one mapping (or is marked `unmapped-plain`)

**Tolerance**: <5% unmapped clauses acceptable
**Action if violated**: Flag for review

---

#### Rule: All Original Clauses Should Be Mapped
**Validation**: Check that every identified original clause appears in at least one mapping (or is marked `unmapped-original`)

**Tolerance**: <10% unmapped acceptable (structural content like titles)
**Action if violated**: Flag for review

---

### Mapping Consistency

#### Rule: Confidence Score Matches Mapping Type
**Validation**:
- `one-to-one`: confidence ≥ 0.95
- `one-to-one-expanded`: confidence ≥ 0.85
- `many-to-many`: confidence ≥ 0.50

**Action if violated**: Flag for review, suggest type change

---

#### Rule: Semantic Tags Consistent
**Validation**: If plain and original clauses in same mapping, their semantic tags should match or be related

**Example**:
- ✅ Valid: plain `permissions`, original `permissions`
- ✅ Valid: plain `permissions:commercial`, original `permissions`
- ⚠️ Warning: plain `permissions`, original `warranty` (likely incorrect)

---

### Content Change Detection

#### Rule: Hash Mismatch Triggers Review
**Validation**: When license content changes, compare current hashes to stored hashes

**Action**:
1. Identify all mappings with hash mismatches
2. Group by semantic tag
3. Present tag-level summary: "warranty: 7 mappings need review"
4. Allow editor to review by tag, not individual mappings

---

## Data Model (JSON Schema)

See separate file: `mapping-schema.json`

Key structure:
```json
{
  "license_id": "MIT",
  "version": "0.2.1",
  "mapping_philosophy": "clause-level with interpretive correspondence",
  "semantic_tags": {
    "permissions": ["plain-perm-use", "plain-perm-copy", ...],
    "warranty": ["plain-warranty-as-is", ...],
    "conditions": [...]
  },
  "mappings": [
    {
      "id": "map-perm-use",
      "type": "one-to-one-expanded",
      "plain_clause": { ... },
      "original_clause": { ... },
      "confidence": 0.95,
      "expansion_type": "educational-clarification",
      "semantic_tag": "permissions",
      "notes": "...",
      "created_at": "...",
      "human_reviewed": true
    }
  ],
  "validation": {
    "tags_with_changes": ["warranty"],
    "mappings_needing_review": ["map-warranty-1", ...]
  }
}
```

---

## Edge Cases and Examples

### Edge Case 1: Clause Spans Multiple Sentences

**Original**:
```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
```

**Decision**: Split into logical clauses or keep as one?

**Recommendation**:
- If plain language treats as unified grant: **Keep as one clause**
- If plain language splits concepts: **Create multiple clauses**

**MIT Example**: Plain treats as unified "You Can Do Anything" section
- **Solution**: Single original clause "permission-grant-paragraph"
- Maps to multiple plain clauses (Use it, Copy it, Change it, etc.) as `one-to-many`

---

### Edge Case 2: Repeated Content

**Plain**:
```
## Permissions
- Use it
- Copy it

## Conditions
You must keep the copyright notice when you copy it.
```

**Question**: Does "copy it" appear twice? Same clause ID?

**Answer**: No - different contexts, different clauses
- `plain-perm-copy`: "Copy it" (permissions context)
- `plain-cond-copy-notice`: "when you copy it" (conditions context, reference to copying)

**Different content** = different clauses, even if words overlap

---

### Edge Case 3: Parenthetical Clarifications

**Original**:
```
copies of the Software (in Source or Object form)
```

**Question**: Is parenthetical part of clause?

**Answer**: Yes - keep parenthetical in content, it's part of the legal meaning

```json
{
  "id": "original-grant-copies",
  "content": "copies of the Software (in Source or Object form)"
}
```

---

### Edge Case 4: Cross-References

**Plain**:
```
1. You must keep our copyright notice.(1)

1. That's the part at the top that says who created the work and when.
```

**Question**: Is footnote a clause?

**Answer**: No - footnote is editorial explanation, not legal content

**Storage**:
```json
{
  "id": "plain-cond-copyright",
  "content": "You must keep our copyright notice.",
  "annotations": [
    {
      "marker": "(1)",
      "text": "That's the part at the top that says who created the work and when."
    }
  ]
}
```

Annotations NOT hashed, NOT mapped.

---

### Edge Case 5: License Added Content

**Plain License adds**:
```
## About This Plain Language Version

This plain language version is not legal advice. When in doubt, consult the
original license or a lawyer.
```

**Mapping**: `unmapped-plain` type

```json
{
  "id": "map-unmapped-interpretation-notice",
  "type": "unmapped-plain",
  "plain_clause": {
    "id": "plain-interpretation-notice",
    "semantic_tag": "interpretation",
    "content": "This plain language version is not legal advice..."
  },
  "original_clause": null,
  "confidence": null,
  "notes": "Plain License editorial addition for legal clarity"
}
```

---

## Design Decisions (Resolved)

### 1. Clause ID Generation ✅ DECISION: Manual Semantic IDs

**Decision**: Manual semantic IDs following naming schema conventions

**Schema**: `{source}-{semantic-category}-{descriptor}`
- Source: `plain` or `original`
- Category: `perm`, `cond`, `warranty`, `liability`, etc.
- Descriptor: Specific identifier (e.g., `use`, `copyright`, `as-is`)

**Examples**:
- `plain-perm-use` (plain language, permissions, use)
- `original-grant-copyright` (original, grant/permissions, copyright)
- `plain-cond-copyright` (plain language, conditions, copyright)

**Rationale**: Human-readable, AI can suggest IDs, easier debugging and validation

---

### 2. Subtag Delimiter ✅ DECISION: Colon (`:`)

**Decision**: Use colon delimiter for subtags

**Format**: `{primary-tag}:{subtag}`

**Examples**:
- `permissions:commercial`
- `warranty:as-is`
- `conditions:attribution`

**Rationale**: Industry standard (Docker, Kubernetes), visual distinction from file paths and object properties

---

### 3. Hash Storage ✅ DECISION: Full Hash (64 characters)

**Decision**: Store full SHA-256 hash (64 hexadecimal characters)

**Format**: `sha256:{64-hex-chars}`

**Example**: `sha256:a1b2c3d4e5f6789012345678901234567890123456789012345678901234`

**Display**: Truncate to first 8-16 chars in UI for readability
- Storage: Full 64 chars
- Display: `sha256:a1b2c3d4...`

**Rationale**: Zero collision risk, storage is cheap (~2-3KB per license), integrity is critical

---

### 4. Validation Strictness ✅ DECISION: Hybrid Tag-Based Blocking

**Decision**: Block publishing for critical tags, warn for non-critical tags

**Critical Tags** (hash mismatch blocks publishing):
- `permissions` - Rights granted
- `conditions` - Requirements
- `warranty` - Warranty disclaimers
- `liability` - Liability limitations
- `termination` - License termination
- `scope` - What license covers

**Non-Critical Tags** (hash mismatch warns only):
- `metadata` - Title, version, URL
- `interpretation` - How to interpret license
- `definitions` - Term definitions (maybe promote to critical later)

**Behavior**:
- **Critical tag mismatch**: "❌ Cannot publish: 7 warranty mappings need review"
- **Non-critical tag mismatch**: "⚠️ Warning: 2 metadata mappings outdated (can publish anyway)"

**Rationale**: Legal content accuracy paramount, flexibility for editorial content

---

### 5. Many-to-Many UI ✅ DECISION: Side-by-Side Groups

**Decision**: Display many-to-many as grouped clauses side-by-side

**v1.0 Implementation**: Simple side-by-side groups
```
┌─ Plain Language Group ───────┐  ┌─ Original License Group ──┐
│ • Clause 1                    │  │ • Original Clause A       │
│ • Clause 2                    │←→│ • Original Clause B       │
│ • Clause 3                    │  │ • Original Clause C       │
└───────────────────────────────┘  └───────────────────────────┘

Notes: "Original scattered requirements reorganized into
        logical sequence in plain language"
```

**v2.0 Enhancement**: Add matrix view for detailed relationships (optional)

**Rationale**: Many-to-many mappings are conceptual (group relates to group), notes explain relationship, simpler UI

---

### 6. Tag Taxonomy ✅ DECISION: Versioned Standard + Custom Extensions

**Decision**: Maintain versioned standard taxonomy with custom tag escape hatch

**Standard Taxonomy v1.0** (9 core tags):
1. `permissions` - Rights granted
2. `conditions` - Requirements
3. `warranty` - Warranty disclaimers
4. `liability` - Liability limitations
5. `termination` - License termination
6. `definitions` - Term definitions
7. `scope` - What license covers
8. `interpretation` - How to interpret (Plain License)
9. `metadata` - Title, version, URL

**Extension Mechanism**: `custom:{tag-name}` for edge cases
- Example: `custom:patent-grant`, `custom:trademark-restrictions`

**Governance**: Propose new standard tags when pattern emerges
- If 3+ licenses need same custom tag → propose for standard taxonomy
- Community review and inclusion in v1.1, v2.0, etc.

**Rationale**: Consistency across licenses while accommodating diversity

---

### 7. Confidence Override ✅ DECISION: Override with Justification

**Decision**: Allow confidence override with required justification

**Implementation**:
```json
{
  "confidence": 0.90,
  "confidence_override": true,
  "ai_suggested_confidence": 0.65,
  "reviewer_notes": "AI underestimated. This is direct translation
                     of legal requirement, just reorganized for
                     clarity. Consulted with legal expert."
}
```

**Guidelines**:
- Small adjustments (±0.05): Brief note acceptable
- Large adjustments (>0.10): Detailed justification required
- All overrides logged in mapping history
- `reviewer_notes` field required when `confidence_override: true`

**Rationale**: Human legal expertise valuable, justification ensures accountability and builds institutional knowledge

---

### 8. Version Control ✅ DECISION: Schema Version + Git

**Decision**: Track schema version explicitly, use Git for content versioning

**Implementation**:
```json
{
  "$schema": "https://plainlicense.org/schemas/mapping/v1.0.0",
  "license_id": "MIT",
  "version": "0.2.1",           // License version (from package.json)
  "last_updated": "2026-01-30T10:00:00Z",
  "generation_method": "ai-assisted",
  // ... mappings ...
}
```

**Versioning Strategy**:
- **Schema version** (in `$schema` URL): Enables migrations and backward compatibility
  - v1.0.0 → v1.1.0: Add optional fields (backward compatible)
  - v1.x.x → v2.0.0: Breaking changes (migration tools required)
- **License version** (in `version` field): Indicates which license content mappings apply to
- **Git commits**: Track content changes (who, when, what changed)

**Schema Evolution**:
- Migration tools upgrade old mappings.json to new schema versions
- Validation checks schema version compatibility

**Rationale**: Simple approach, schema version enables migrations, Git handles content history, avoids duplicate version management

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-30 | Initial Draft | Complete specification |

---

## Next Steps

1. **Review this spec** - Validate definitions, rules, and edge cases
2. **Create JSON Schema** - Formal schema file for validation
3. **Build test dataset** - Create MIT mappings following this spec
4. **Validate with complex license** - Test with MPL-2.0 to find gaps
5. **Refine based on learnings** - Update spec before implementation

# Phase 1: AI-Assisted Mapping Prototype Specification

**Feature**: 001-cms-license-platform
**Component**: AI-Assisted Clause Mapping Tool (Prototype)
**Date**: 2026-01-30
**Timeline**: 2-3 weeks
**Purpose**: Validate AI-driven clause-level mapping before building Sveltia CMS widget

---

## Objectives

1. **Validate AI Capability**: Can Claude/GPT-4 accurately identify clause-level correspondences?
2. **Test Sentence Parsing**: Does sentence-level granularity work for complex licenses?
3. **Establish Tagging System**: AI-suggested semantic tags (warranty, permissions, etc.) with human confirmation
4. **Create Real Mappings**: Generate mappings.json for MIT, MPL-2.0, Elastic-2.0
5. **Inform CMS Widget**: Learn UX requirements for eventual Sveltia integration

---

## Architecture

### Simple Browser-Based Tool

```
┌─────────────────────────────────────────────────┐
│  Static HTML + JavaScript (No Backend)         │
│  Hosted on Cloudflare Pages                    │
│  https://mapper.plainlicense.org (or local)    │
└─────────────────────────────────────────────────┘
         │
         ├─ Input: License markdown (paste or upload)
         ├─ Processing: Call Anthropic Claude API (client-side)
         ├─ AI Output: Suggested clause mappings + semantic tags
         ├─ Human Review: Approve/edit/reject interface
         └─ Export: Download mappings.json
```

**Tech Stack**:

- Pure HTML/CSS/JavaScript (or simple React/Vue if needed)
- Anthropic Claude API (Claude 3.5 Sonnet for cost/speed balance)
- No backend server (all API calls from browser)
- Cloudflare Pages hosting (free, fast)

---

## User Workflow

### Step 1: Input License Content

**UI**: Simple form with two text areas

```
┌─────────────────────────────────────────────────┐
│  Plain License Mapper - AI Prototype            │
├─────────────────────────────────────────────────┤
│                                                  │
│  License Name: [MIT________________]            │
│                                                  │
│  Plain License Text:                            │
│  ┌──────────────────────────────────────────┐  │
│  │ ## You Can Do Anything with The Work    │  │
│  │ We give you permission to:              │  │
│  │ - **Use** it                             │  │
│  │ ...                                       │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  Original License Text:                         │
│  ┌──────────────────────────────────────────┐  │
│  │ Permission is hereby granted, free of   │  │
│  │ charge, to any person obtaining a copy  │  │
│  │ ...                                       │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [Upload File] or paste content directly        │
│                                                  │
│  [ Generate Mappings with AI ]                  │
└─────────────────────────────────────────────────┘
```

**Alternative**: Tool fetches from GitHub

- Input: License ID (MIT, MPL-2.0)
- Tool fetches `docs/licenses/permissive/mit/index.md`
- Parses frontmatter to extract plain and original text

---

### Step 2: AI Processing

**Display**: Loading state with progress

```
┌─────────────────────────────────────────────────┐
│  🤖 Analyzing license with AI...                │
│                                                  │
│  ✓ Parsing plain language sections              │
│  ✓ Parsing original license sections            │
│  🔄 Identifying clause correspondences (30s)    │
│  ⏳ Assigning semantic tags                     │
│  ⏳ Calculating confidence scores                │
│                                                  │
│  Estimated time: 45-60 seconds                  │
└─────────────────────────────────────────────────┘
```

**AI Prompt Strategy** (see detailed prompts below)

---

### Step 3: Review Mappings

**UI**: List view with approve/edit/reject controls

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AI Generated 28 Mappings for MIT License                              │
│  Average Confidence: 0.89                                               │
│                                                                         │
│  Filter: [All] [High Confidence] [Needs Review] [By Tag ▾]            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Mapping 1/28                                    Confidence: 0.98      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Plain Clause (permissions):                                       │ │
│  │   "- **Use** it"                                                  │ │
│  │                                                                   │ │
│  │ ↕ Maps to ↕                                                       │ │
│  │                                                                   │ │
│  │ Original Clause (permissions):                                    │ │
│  │   "to use"                                                        │ │
│  │   (from "...including without limitation the rights to use...")   │ │
│  │                                                                   │ │
│  │ Type: one-to-one-expanded                                         │ │
│  │ AI Notes: Direct translation with friendly formatting             │ │
│  │                                                                   │ │
│  │ Semantic Tag: [permissions ▾]  (AI suggested)                    │ │
│  │ Confidence: [0.98____] (editable slider)                          │ │
│  │ Expansion Type: [educational-clarification ▾]                     │ │
│  │                                                                   │ │
│  │ [✓ Approve] [✎ Edit Details] [✗ Reject]                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Mapping 2/28                                    Confidence: 0.85      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Plain Clauses (conditions): [MANY-TO-ONE]                         │ │
│  │   1. "You must keep our copyright notice"                         │ │
│  │   2. "You must also keep this notice with all versions..."        │ │
│  │                                                                   │ │
│  │ ↕ Maps to ↕                                                       │ │
│  │                                                                   │ │
│  │ Original Clause (conditions):                                     │ │
│  │   "The above copyright notice and this permission notice shall    │ │
│  │    be included in all copies or substantial portions of the       │ │
│  │    Software."                                                     │ │
│  │                                                                   │ │
│  │ Type: one-to-many-expanded                                        │ │
│  │ AI Notes: Original single requirement split into two explicit     │ │
│  │           rules with compliance examples added                    │ │
│  │                                                                   │ │
│  │ [✓ Approve] [✎ Edit Details] [✗ Reject]                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ...                                                                    │
│                                                                         │
│  [ ← Previous ] [ Next → ] [ Bulk Actions ▾ ]                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Edit Details Modal**:

```
┌─────────────────────────────────────────────────┐
│  Edit Mapping Details                           │
├─────────────────────────────────────────────────┤
│                                                  │
│  Plain Clause ID: [plain-perm-use_______]       │
│  Original Clause ID: [original-grant-use_]      │
│                                                  │
│  Semantic Tag: [permissions ▾]                  │
│                                                  │
│  Mapping Type: [one-to-one-expanded ▾]          │
│    - one-to-one                                  │
│    - one-to-one-expanded                         │
│    - one-to-many                                 │
│    - many-to-one                                 │
│    - many-to-many                                │
│                                                  │
│  Confidence: [0.98] (0.0 - 1.0)                 │
│                                                  │
│  Expansion Type:                                 │
│  [✓] educational-clarification                   │
│  [ ] legal-interpretation-with-examples          │
│  [ ] restructuring                               │
│  [ ] none                                        │
│                                                  │
│  Notes (optional):                               │
│  ┌──────────────────────────────────────────┐  │
│  │ Direct translation with friendly         │  │
│  │ formatting                                │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [ Save Changes ] [ Cancel ]                    │
└─────────────────────────────────────────────────┘
```

---

### Step 4: Review Semantic Tags

**UI**: Tag management interface

```
┌─────────────────────────────────────────────────┐
│  Semantic Tags Review                            │
│  AI identified 5 tag categories                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Tag: permissions (12 clauses)                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Plain:                                    │  │
│  │   - plain-perm-use                        │  │
│  │   - plain-perm-copy                       │  │
│  │   - plain-perm-modify                     │  │
│  │   ...                                      │  │
│  │                                            │  │
│  │ Original:                                  │  │
│  │   - original-grant-use                    │  │
│  │   - original-grant-copy                   │  │
│  │   ...                                      │  │
│  └──────────────────────────────────────────┘  │
│  [✓ Approve Tag] [Rename Tag] [Merge Tags]     │
│                                                  │
│  Tag: warranty (6 clauses)                      │
│  [✓ Approve Tag] [Rename Tag] [Merge Tags]     │
│                                                  │
│  Tag: conditions (4 clauses)                    │
│  [✓ Approve Tag] [Rename Tag] [Merge Tags]     │
│                                                  │
│  ...                                             │
│                                                  │
│  [ Continue to Export ]                         │
└─────────────────────────────────────────────────┘
```

---

### Step 5: Export mappings.json

**UI**: Preview and download

```
┌─────────────────────────────────────────────────┐
│  Export Mappings                                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  Status: ✓ 25 approved, ✗ 2 rejected, ⏳ 1 pending │
│                                                  │
│  ⚠️ Warning: 1 mapping still pending review     │
│     (Mapping 14: warranty clause)               │
│                                                  │
│  [ Review Pending ] or [ Export Anyway ]        │
│                                                  │
│  Export Options:                                 │
│  [✓] Include metadata                            │
│  [✓] Include AI generation info                  │
│  [✓] Pretty-print JSON                           │
│  [ ] Include rejected mappings (for reference)   │
│                                                  │
│  Preview:                                        │
│  ┌──────────────────────────────────────────┐  │
│  │ {                                         │  │
│  │   "license_id": "MIT",                   │  │
│  │   "version": "0.2.1",                    │  │
│  │   "last_updated": "2026-01-30...",       │  │
│  │   "mapping_philosophy": "clause-level    │  │
│  │      with interpretive correspondence",  │  │
│  │   "generation_method": "ai-assisted",    │  │
│  │   "ai_model": "claude-3-5-sonnet",       │  │
│  │   "human_reviewed": true,                │  │
│  │   ...                                     │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [ Download mappings.json ]                     │
│  [ Copy to Clipboard ]                          │
│  [ Start New Mapping ]                          │
└─────────────────────────────────────────────────┘
```

---

## AI Prompt Engineering

### Prompt 1: Parse and Identify Clauses

**Note**: Uses manual semantic ID naming convention from Design Decision #1 (see `mapping-specification.md`)

```
You are an expert legal analyst specializing in software licenses. Your task is to parse a license document and identify individual clauses at the sentence level.

INPUT:
- License text (plain language or original legal text)
- Source type: "plain" or "original"

OUTPUT:
A JSON array of clauses with:
- id: Semantic identifier following pattern: {source}-{category}-{descriptor}
  - Source: "plain" or "original"
  - Category: "perm", "cond", "warranty", "liability", etc.
  - Descriptor: Specific identifier (e.g., "use", "copyright", "as-is")
- content: The clause text (sentence or logical unit)
- context: Surrounding text for clarity (optional)
- preliminary_tag: Your best guess at semantic category (permissions, warranty, conditions, etc.)

RULES:
- Identify clauses at sentence level, but can be more granular if needed
- Each clause should be a logical, complete thought
- Preserve markdown formatting in content
- For list items, each item is a separate clause
- Headings are NOT clauses but provide context
- Generate human-readable semantic IDs, not sequential numbers

EXAMPLE OUTPUT:
```json
[
  {
    "id": "plain-perm-use",
    "content": "- **Use** it",
    "context": "We give you permission to:",
    "preliminary_tag": "permissions"
  },
  {
    "id": "plain-perm-copy",
    "content": "- **Copy** it",
    "context": "We give you permission to:",
    "preliminary_tag": "permissions"
  }
]
```

Now parse this license:
[LICENSE TEXT HERE]

```

---

### Prompt 2: Create Mappings

**Note**: Uses confidence rubric and semantic taxonomy from Design Decisions #6-7 (see `mapping-specification.md`)

```

You are an expert legal analyst. You have two versions of a license:

1. PLAIN language version (simplified, educational)
2. ORIGINAL legal version (traditional legal language)

Your task: Create clause-level mappings showing how plain clauses correspond to original clauses.

INPUT:

- Plain clauses (from Prompt 1)
- Original clauses (from Prompt 1)

OUTPUT:
A JSON array of mappings with:

- plain_clause: Reference to plain clause (using semantic ID)
- original_clause: Reference to original clause(s) (using semantic ID)
- mapping_type: one-to-one | one-to-one-expanded | one-to-many | many-to-one | many-to-many
- confidence: 0.0-1.0 score (see rubric below)
- expansion_type: educational-clarification | legal-interpretation-with-examples | restructuring | none
- semantic_tag: One of 9 core tags (permissions, conditions, warranty, liability, termination, definitions, scope, interpretation, metadata) or use colon for subtags (e.g., permissions:commercial)
- notes: Brief explanation of the correspondence

CONFIDENCE SCORING (from specification):

- 0.95-0.99: Direct translation (only language simplification)
- 0.85-0.94: Translation with educational expansion
- 0.70-0.84: Legal interpretation with examples
- 0.50-0.69: Conceptual correspondence (restructured)
- 0.30-0.49: Loose association
- Below 0.30: Mark as unmapped

SEMANTIC TAGS (9 core tags):

- permissions: Rights granted
- conditions: Requirements
- warranty: Warranty disclaimers
- liability: Liability limitations
- termination: License termination
- definitions: Term definitions
- scope: What license covers
- interpretation: How to interpret
- metadata: Title, version, URL

RULES:

- Plain clauses often EXPAND original clauses with examples/explanations
- Plain may REORGANIZE complex original sections
- Some clauses may be unmapped (exist in only one version)
- Be conservative with confidence scores
- Explain your reasoning in notes
- Use semantic IDs from Prompt 1 (e.g., plain-perm-use, not plain-clause-1)

EXAMPLE OUTPUT:

```json
[
  {
    "plain_clause_id": "plain-perm-use",
    "original_clause_id": "original-grant-use",
    "mapping_type": "one-to-one-expanded",
    "confidence": 0.92,
    "expansion_type": "educational-clarification",
    "semantic_tag": "permissions",
    "notes": "Plain 'Use it' directly corresponds to original 'to use' with friendly formatting and implicit context added"
  }
]
```

PLAIN CLAUSES:
[PLAIN CLAUSES JSON]

ORIGINAL CLAUSES:
[ORIGINAL CLAUSES JSON]

```

---

### Prompt 3: Validate and Refine Tags

**Note**: Uses standard 9-tag taxonomy from Design Decision #6 with colon-delimited subtags

```

You are reviewing semantic tags assigned to license clauses. Your task is to ensure consistency with the standard taxonomy and suggest appropriate subtags.

INPUT:

- All clauses with preliminary tags
- All mappings with semantic tags

STANDARD TAXONOMY (9 core tags):

1. permissions - Rights granted
2. conditions - Requirements
3. warranty - Warranty disclaimers
4. liability - Liability limitations
5. termination - License termination
6. definitions - Term definitions
7. scope - What license covers
8. interpretation - How to interpret
9. metadata - Title, version, URL

OUTPUT:
A refined tag mapping with:

- Validation that all tags use standard taxonomy
- Suggested subtags using colon notation (e.g., permissions:commercial)
- Tag consolidation recommendations

EXAMPLE OUTPUT:

```json
{
  "tags": {
    "permissions": {
      "definition": "Rights granted to users of the work",
      "clauses": ["plain-perm-use", "plain-perm-copy", ...],
      "subtags": {
        "permissions:commercial": ["plain-perm-sell"],
        "permissions:modify": ["plain-perm-modify"]
      }
    },
    "warranty": {
      "definition": "Disclaimers and limitations of liability",
      "clauses": ["plain-clause-20", ...],
      "subtags": {}
    }
  },
  "suggestions": [
    "Consider merging 'warranty' and 'liability' tags - they cover same concept",
    "Split 'conditions' into 'attribution-requirements' and 'distribution-requirements'"
  ]
}
```

CURRENT TAGS:
[TAGS JSON]

```

---

## Data Model (Phase 1)

**Formal Schema**: See `mapping-schema.json` for the complete production schema with all validation rules and design decisions.

**Prototype Schema**: Simplified version below focuses on AI generation needs. The prototype will generate mappings compatible with the formal schema.

### mappings.json Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["license_id", "version", "mappings"],
  "properties": {
    "license_id": {
      "type": "string",
      "description": "SPDX identifier or custom license ID"
    },
    "version": {
      "type": "string",
      "description": "Plain license version (from package.json)"
    },
    "last_updated": {
      "type": "string",
      "format": "date-time"
    },
    "mapping_philosophy": {
      "type": "string",
      "description": "Approach to mapping (clause-level, interpretive, etc.)"
    },
    "generation_method": {
      "type": "string",
      "enum": ["manual", "ai-assisted", "ai-generated"]
    },
    "ai_model": {
      "type": "string",
      "description": "AI model used if ai-assisted or ai-generated"
    },
    "human_reviewed": {
      "type": "boolean",
      "description": "Whether human reviewed AI suggestions"
    },
    "semantic_tags": {
      "type": "object",
      "description": "Groups of clause IDs by semantic category",
      "additionalProperties": {
        "type": "array",
        "items": {"type": "string"}
      }
    },
    "mappings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type", "plain_clause", "original_clause", "confidence"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique mapping ID"
          },
          "type": {
            "type": "string",
            "enum": [
              "one-to-one",
              "one-to-one-expanded",
              "one-to-many",
              "many-to-one",
              "many-to-many",
              "unmapped-plain",
              "unmapped-original"
            ]
          },
          "plain_clause": {
            "oneOf": [
              {"$ref": "#/definitions/clause"},
              {
                "type": "array",
                "items": {"$ref": "#/definitions/clause"}
              },
              {"type": "null"}
            ]
          },
          "original_clause": {
            "oneOf": [
              {"$ref": "#/definitions/clause"},
              {
                "type": "array",
                "items": {"$ref": "#/definitions/clause"}
              },
              {"type": "null"}
            ]
          },
          "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "expansion_type": {
            "type": "string",
            "enum": [
              "none",
              "educational-clarification",
              "legal-interpretation-with-examples",
              "restructuring"
            ]
          },
          "semantic_tag": {
            "type": "string",
            "description": "Category: permissions, warranty, conditions, etc."
          },
          "notes": {
            "type": "string",
            "description": "Human or AI explanation of mapping"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          },
          "last_validated": {
            "type": "string",
            "format": "date-time"
          },
          "ai_generated": {
            "type": "boolean",
            "description": "Whether this mapping was AI-suggested"
          },
          "human_approved": {
            "type": "boolean",
            "description": "Whether human reviewed and approved"
          }
        }
      }
    },
    "validation": {
      "type": "object",
      "properties": {
        "tags_with_changes": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Semantic tags with content changes since last validation"
        },
        "mappings_needing_review": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Mapping IDs that need human review due to content changes"
        },
        "last_content_hash_check": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "total_mappings": {"type": "integer"},
        "mapping_types": {
          "type": "object",
          "additionalProperties": {"type": "integer"}
        },
        "average_confidence": {"type": "number"},
        "human_review_time": {
          "type": "number",
          "description": "Minutes spent on human review"
        },
        "ai_processing_time": {
          "type": "number",
          "description": "Seconds for AI processing"
        }
      }
    }
  },
  "definitions": {
    "clause": {
      "type": "object",
      "required": ["id", "hash", "content"],
      "properties": {
        "id": {
          "type": "string",
          "description": "Semantic ID like plain-perm-use"
        },
        "hash": {
          "type": "string",
          "description": "SHA-256 hash of normalized content"
        },
        "semantic_tag": {
          "type": "string",
          "description": "Category: permissions, warranty, etc."
        },
        "content": {
          "type": "string",
          "description": "Actual clause text"
        },
        "context": {
          "type": "string",
          "description": "Surrounding text for clarity"
        },
        "content_preview": {
          "type": "string",
          "description": "Truncated content for display (max 100 chars)"
        }
      }
    }
  }
}
```

---

## Success Metrics

### Phase 1 Prototype Success Criteria

1.  **AI Accuracy**:
   - MIT: ≥90% of AI suggestions accepted by human reviewer
   - MPL-2.0: ≥75% of AI suggestions accepted (more complex)
   - Elastic-2.0: ≥70% of AI suggestions accepted

2.  **Time Savings**:
   - Manual mapping (estimated): 2-3 hours for MIT
   - AI-assisted mapping: <30 minutes for MIT
   - Target: 60-75% time reduction

3.  **Mapping Quality**:
   - Average confidence score: ≥0.85
   - Completeness: <5% unmapped clauses
   - Human review time: <30 minutes per license

4.  **Usability**:
   - Editor can complete workflow without technical help
   - Export valid JSON on first try
   - <5% error rate in mapping review process

---

## Development Phases

### Week 1: Core Functionality

- [ ] AI prompt engineering and testing
- [ ] Basic HTML/JS interface for input
- [ ] API integration (Anthropic Claude)
- [ ] Clause parsing and mapping generation
- [ ] Simple review interface (list view)
- [ ] JSON export

### Week 2: Refinement

- [ ] Semantic tag review/edit UI
- [ ] Bulk approve/reject actions
- [ ] Edit mapping details modal
- [ ] Confidence score adjustment
- [ ] Improved parsing for edge cases

### Week 3: Testing & Documentation

- [ ] Create MIT mapping (validate)
- [ ] Create MPL-2.0 mapping (complex test)
- [ ] Create Elastic-2.0 mapping (source-available test)
- [ ] Document learnings for CMS widget
- [ ] Write user guide

---

## Deliverables

1. **Working Prototype**: <https://mapper.plainlicense.org> (or local HTML file)
2. **Real Mappings**: `mappings.json` for MIT, MPL-2.0, Elastic-2.0
3. **Lessons Learned Document**: Findings to inform CMS widget design
4. **Refined Data Model**: Final JSON schema based on real usage
5. **AI Prompt Library**: Proven prompts for future use

---

## Implementation Questions for Week 1

**Design Decisions Resolved**: See `mapping-specification.md` for 8 resolved technical decisions. Implementation questions below focus on AI prototype validation.

1.  **Clause Boundary Detection**: How does AI handle complex sentence structures?
   - Test with MPL-2.0 (has very long sentences with semicolons)
   - Validate AI follows sentence-level parsing rules from specification

2.  **Many-to-Many UI**: ✅ DECIDED - Side-by-side groups (Decision #5)
   - Prototype simple many-to-many (1 plain → 2 original)
   - Implement grouped display as specified in mapping-specification.md

3.  **Semantic Tag Taxonomy**: ✅ DECIDED - 9 core tags + `custom:` extensions (Decision #6)
   - Use standard taxonomy from specification
   - Test AI's ability to suggest correct core tags

4.  **Hash Generation**: ✅ DECIDED - Full SHA-256 with markdown preserved (Decision #3)
   - Implement normalization rules from specification
   - Test hash stability across edits

---

## Risk Mitigation

### Risk: AI Inaccuracy

- **Mitigation**: Start with simple MIT license to validate
- **Backup**: Manual mapping fallback if AI <70% accurate

### Risk: Prompt Token Limits

- **Mitigation**: Split large licenses into sections
- **Strategy**: Process permissions, warranty, conditions separately

### Risk: API Costs

- **Mitigation**: Use Claude 3.5 Sonnet (~$0.50/license vs Opus $2/license)
- **Budget**: $50 for 100 test iterations (generous)

### Risk: Complex Many-to-Many

- **Mitigation**: Defer complex cases to manual review
- **Note**: Flag for human attention, don't force AI mapping

---

## Next Steps After Prototype

1. **Validate with non-technical editor**: Can they use it without help?
2. **Measure time savings**: Actual vs estimated
3. **Analyze AI accuracy**: Where did it succeed/fail?
4. **Refine prompts**: Based on failure modes
5. **Design CMS widget**: Informed by prototype learnings

---

## Notes

- This prototype is intentionally simple (no backend, minimal UI)
- Goal is learning, not production readiness
- Focus on AI accuracy and mapping quality, not polish
- Can be local HTML file or hosted on Cloudflare Pages
- No authentication needed (public domain licenses)

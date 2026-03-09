# Data Model: Content Management & License Platform Redesign

**Feature**: 001-cms-license-platform
**Date**: 2026-01-30
**Status**: Phase 1 - Git-Based Architecture
**Based on**: Research Phase v2 findings (Sveltia CMS + Astro + Cloudflare Pages)

---

## Architecture Overview

**Storage Paradigm**: Git-based (files in repository, not database)
**CMS**: Sveltia CMS (Git-backed, file-based content management)
**Static Site Generator**: Astro with Starlight theme
**Version Control**: Git + Lerna + semantic-release (per-license versioning)
**Authentication**: GitHub OAuth via Cloudflare Workers proxy

---

## Core Principles

1. **Git as Database**: All content stored as files in repository
2. **Frontmatter-Driven**: YAML frontmatter + Markdown content (preserves current model)
3. **Per-License Versioning**: Independent semantic versioning via Lerna packages
4. **Single Source of Truth**: Git repository contains all content, configuration, and mappings
5. **Build-Time Processing**: Astro processes content during build, generates exports

---

## File System Structure

```
plainlicense/
├── content/
│   ├── licenses/
│   │   ├── permissive/
│   │   │   └── mit/
│   │   │       ├── index.md           # Main license content
│   │   │       ├── mappings.json      # Section mappings (plain ↔ original)
│   │   │       └── versions.json      # Version history metadata
│   │   ├── copyleft/
│   │   ├── source-available/
│   │   └── public-domain/
│   ├── blog/
│   │   └── posts/
│   │       └── 2026-01-15-plain-language-matters.md
│   ├── template-blocks/
│   │   ├── warranty-disclaimer.md
│   │   ├── copyright-notice.md
│   │   └── liability-limitation.md
│   └── config/
│       └── categories.json           # License categories configuration
├── packages/                         # Lerna packages (semantic versioning)
│   ├── mit/
│   │   └── package.json             # Semantic-release config
│   ├── mpl-2.0/
│   └── [other licenses]/
├── public/
│   └── admin/                       # Sveltia CMS admin UI
│       ├── index.html
│       └── config.yml               # CMS configuration
└── exports/                         # Generated exports (build artifact)
    └── [license]/
        └── v[version]/
            ├── [license].md         # Markdown exports
            ├── [license].pdf        # PDF export
            ├── [license].txt        # Plaintext export
            ├── [license].xml        # SPDX XML
            └── [license]-embed.html # Embed HTML
```

---

## Entity Definitions

### 1. License

**Storage**: `content/licenses/{category}/{slug}/index.md`
**Format**: Markdown file with YAML frontmatter

**Frontmatter Schema**:

```yaml
---
# Identity
spdx_id: MIT                    # SPDX identifier (unique)
name: MIT License               # Display name
plain_name: Plain MIT License   # Plain language name
slug: mit                       # URL-friendly identifier (unique)
category: permissive            # License category

# Metadata
description: >
  A short, permissive software license. Lets people do almost anything
  they want with your project, like making and distributing closed source
  versions.

permissions:                    # What license permits
  - commercial-use
  - modifications
  - distribution
  - private-use

conditions:                     # License requirements
  - include-copyright

limitations:                    # License limitations
  - liability
  - warranty

# Readability Metrics
original_gunning_fog: 21.94    # Original text complexity
plain_gunning_fog: 9.74        # Plain language complexity
shame_words_count: 15          # Count of complex legal terms

# Versioning (managed by Lerna)
current_version: 1.2.0         # Latest published version
package_path: ../../packages/mit  # Link to Lerna package

# Publishing
status: published              # draft | published | archived
published_at: 2024-03-15T10:30:00Z
updated_at: 2026-01-20T14:22:00Z

# Template References
template_blocks:               # Reusable boilerplate
  - warranty-disclaimer
  - copyright-notice

# Content Sections (for section mapping)
sections:
  plain:
    - id: intro                # Section identifier
      title: You Can Do Anything with The Work
    - id: copyright-req
      title: You Must Include Copyright Notice
    - id: no-warranty
      title: We Offer No Warranties
  original:
    - id: grant
      title: Permission Grant
    - id: conditions
      title: Conditions
    - id: disclaimer
      title: Warranty Disclaimer
---

# Plain Language Version

## You Can Do Anything with The Work {#intro}

[Plain language content...]

## You Must Include Copyright Notice {#copyright-req}

[Plain language content...]

## We Offer No Warranties {#no-warranty}

[Plain language content...]

---

# Original License Text

## Permission Grant {#grant}

[Original license text...]

## Conditions {#conditions}

[Original license text...]

## Warranty Disclaimer {#disclaimer}

[Original license text...]
```

**Validation Rules** (Sveltia CMS config):

- `spdx_id`: Required, unique, matches SPDX format
- `slug`: Required, unique, URL-safe (lowercase, hyphens only)
- `category`: Required, one of: permissive, copyleft, source-available, public-domain, proprietary
- `permissions`: At least one required
- Content sections: Minimum 100 characters

---

### 2. License Clause Mapping

**Status**: ✅ Specification Complete (see `mapping-specification.md` and `mapping-schema.json`)

**Storage**: `content/licenses/{category}/{slug}/mappings.json`
**Format**: JSON file following formal schema (`mapping-schema.json`)

**Complete Specification**: See [`mapping-specification.md`](./mapping-specification.md) for full details

---

#### What is a Clause? (from specification)

**Definition**: The smallest semantic unit of legal meaning within a license that can be independently understood and mapped.

**Granularity**:

- **Primary**: Sentence-level
- **Refinement**: Can be sub-sentence when a sentence contains multiple distinct legal concepts
- **Never**: Paragraph-level (sections contain multiple clauses)

**Examples**:

- Valid: "You must keep our copyright notice." (sentence)
- Valid: "- **Use** it" (list item with distinct concept)
- Invalid: Entire section with multiple concepts

---

#### Mapping Types (7 types defined)

| Type | Definition | Confidence Range | Example |
|------|------------|------------------|---------|
| `one-to-one` | Direct semantic equivalence | 0.95-0.99 | "use" → "Use it" |
| `one-to-one-expanded` | Core meaning + educational context | 0.85-0.94 | "free of charge" → "for free... for any reason" |
| `one-to-many` | Plain consolidates multiple original | 0.70-0.94 | Multiple liability clauses → single plain statement |
| `many-to-one` | Plain splits complex original | 0.70-0.94 | Original compound sentence → multiple plain clauses |
| `many-to-many` | Complete restructuring | 0.50-0.69 | Copyleft reorganization |
| `unmapped-plain` | Plain content with no original source | null | Interpretation notices |
| `unmapped-original` | Original omitted in plain | null | Title headings |

---

#### Semantic Tag Taxonomy

**Purpose**: Group clauses by legal concept for validation, navigation, and analytics

**Core Tags**:

- `permissions` - Rights granted (use, copy, modify, distribute, sell)
- `conditions` - Requirements (attribution, share-alike, include license)
- `warranty` - Warranty disclaimers (as-is, quality, merchantability)
- `liability` - Liability limitations (damages, claims, indemnification)
- `termination` - When license ends
- `definitions` - Term definitions
- `scope` - What license covers
- `interpretation` - How to interpret (Plain License additions)
- `metadata` - Title, version, URL

**Subtag Support**: Use colon notation for specificity

- `permissions:commercial` - Commercial use rights
- `warranty:as-is` - "As is" disclaimers
- `conditions:attribution` - Credit requirements

---

#### Confidence Scoring Rubric (from specification)

| Score | Type | Criteria |
|-------|------|----------|
| **0.95-0.99** | Direct Translation | Nearly identical meaning, only language simplification |
| **0.85-0.94** | Educational Expansion | Core meaning preserved, adds explanatory context |
| **0.70-0.84** | Legal Interpretation | Interprets compliance methods, adds examples |
| **0.50-0.69** | Conceptual Correspondence | Restructures concept, meaning preserved but transformed |
| **0.30-0.49** | Loose Association | Thematically related, questionable mapping |
| **<0.30** | Unmapped/Questionable | No clear correspondence, mark as unmapped |

---

#### Hash Generation (SHA-256)

**Algorithm**: SHA-256 with specific normalization rules

**Normalization Rules**:

1. **Whitespace**: Trim leading/trailing, collapse multiple spaces, remove line breaks
2. **Markdown**: PRESERVE formatting (affects meaning and display)
3. **Template Variables**: PRESERVE (e.g., `{{ year }}`)
4. **Annotations**: EXCLUDE HTML/markdown annotations and reference markers

**Output Format**: `sha256:a1b2c3d4e5f6...` (hexadecimal lowercase with prefix)

**Example**:

```javascript
Input:  "  You  must   keep\nour   copyright  notice  "
Normalized: "You must keep our copyright notice"
Hash: sha256:a1b2c3d4e5f6... (64 hex chars)
```

---

#### Data Structure (JSON Schema)

**Complete Schema**: See [`mapping-schema.json`](./mapping-schema.json)

**Top-Level Structure**:

```json
{
  "$schema": "https://plainlicense.org/schemas/mapping/v1.0.0",
  "license_id": "MIT",
  "version": "0.2.1",
  "mapping_philosophy": "clause-level with interpretive correspondence",
  "generation_method": "ai-assisted",
  "human_reviewed": true,
  "semantic_tags": {
    "permissions": ["plain-perm-use", "plain-perm-copy"],
    "warranty": ["plain-warranty-as-is"],
    "conditions": ["plain-cond-copyright"]
  },
  "mappings": [
    {
      "id": "map-perm-use",
      "type": "one-to-one-expanded",
      "plain_clause": { /* clause object */ },
      "original_clause": { /* clause object */ },
      "confidence": 0.90,
      "expansion_type": "educational-clarification",
      "semantic_tag": "permissions",
      "notes": "Direct translation with friendly formatting",
      "created_at": "2026-01-30T10:00:00Z",
      "created_by": "ai-assisted",
      "human_reviewed": true
    }
  ],
  "validation": {
    "tags_with_changes": ["warranty"],
    "mappings_needing_review": ["map-warranty-1"],
    "validation_status": "valid"
  },
  "metadata": {
    "total_mappings": 24,
    "average_confidence": 0.87,
    "completeness": {
      "plain_clauses_mapped": 0.95,
      "original_clauses_mapped": 0.88
    }
  }
}
```

**Clause Object** (used in mappings):

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

---

#### Validation Rules (from specification)

**Mapping Completeness**:

- <5% unmapped plain clauses acceptable
- <10% unmapped original clauses acceptable (structural content)

**Mapping Consistency**:

- `one-to-one`: confidence ≥ 0.95
- `one-to-one-expanded`: confidence ≥ 0.85
- `many-to-many`: confidence ≥ 0.50
- Semantic tags should match between plain and original clauses in same mapping

**Content Change Detection**:

1. Compare current content hashes to stored hashes
2. Identify mappings with hash mismatches
3. Group by semantic tag
4. Present tag-level summary: "warranty: 7 mappings need review"
5. Allow editor to review by tag, not individual mappings

---

#### Editor UX Decision (from brainstorming)

**Recommendation for Implementation**:

-   **v1.0**: Manual JSON editing with CLI hash generation tool (4-6 hours development)
-   **v2.0**: Browser-based web app for visual mapping (15-25 hours development)
    - Upload license markdown → visual side-by-side interface → download mappings.json
    - No local setup required, hosted on Cloudflare Pages
    - Optional: AI-assisted mapping suggestions

**Rationale**: Ship v1.0 quickly with manual approach, learn from usage, build proper visual tool for v2.0

---

#### Design Decisions ✅ RESOLVED

All 8 technical design questions have been resolved. See [`mapping-specification.md`](./mapping-specification.md) section "Design Decisions (Resolved)" for full details.

**Summary of Decisions**:

1. **Clause ID Generation**: Manual semantic IDs (`plain-perm-use` pattern)
2. **Subtag Delimiter**: Colon (`:`) for hierarchical tags
3. **Hash Storage**: Full SHA-256 hash (64 chars) with UI truncation
4. **Validation Strictness**: Hybrid - critical tags block, non-critical warn
5. **Many-to-Many UI**: Side-by-side grouped clauses (v1.0)
6. **Tag Taxonomy**: 9 core tags + `custom:` extension mechanism
7. **Confidence Override**: Allowed with required justification
8. **Version Control**: Schema version in `$schema` + Git for content

---

### 3. License Version

**Storage**: `packages/{license}/package.json` + `content/licenses/{category}/{slug}/versions.json`
**Format**: Dual-storage (Lerna package.json + version metadata JSON)

**Lerna Package** (`packages/mit/package.json`):

```json
{
  "name": "@plainlicense/mit",
  "version": "1.2.0",
  "description": "Plain MIT License",
  "main": "../../content/licenses/permissive/mit/index.md",
  "repository": {
    "type": "git",
    "url": "https://github.com/plainlicense/plainlicense.git"
  },
  "release": {
    "branches": ["main", {"name": "dev", "prerelease": "rc"}]
  },
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github"
  ]
}
```

**Version Metadata** (`content/licenses/{category}/{slug}/versions.json`):

```json
{
  "license_id": "MIT",
  "current_version": "1.2.0",
  "versions": [
    {
      "version": "1.2.0",
      "released_at": "2026-01-20T14:22:00Z",
      "changelog": "Improved clarity in warranty disclaimer section",
      "git_tag": "mit-v1.2.0",
      "git_commit": "a1b2c3d4",
      "created_by": "editor@plainlicense.org",
      "breaking_changes": false,
      "exports": {
        "markdown_gfm": "https://github.com/plainlicense/plainlicense/releases/download/mit-v1.2.0/MIT.md",
        "pdf": "https://github.com/plainlicense/plainlicense/releases/download/mit-v1.2.0/MIT.pdf",
        "plaintext": "https://github.com/plainlicense/plainlicense/releases/download/mit-v1.2.0/MIT.txt",
        "spdx_xml": "https://github.com/plainlicense/plainlicense/releases/download/mit-v1.2.0/MIT.xml",
        "embed_html": "https://github.com/plainlicense/plainlicense/releases/download/mit-v1.2.0/MIT-embed.html"
      }
    },
    {
      "version": "1.1.0",
      "released_at": "2025-08-10T09:15:00Z",
      "changelog": "Added visual examples for 'source materials' concept",
      "git_tag": "mit-v1.1.0",
      "git_commit": "e5f6g7h8",
      "created_by": "editor@plainlicense.org",
      "breaking_changes": false
    }
  ]
}
```

**Versioning Workflow** (Lerna + semantic-release):

1. Editor makes content changes via Sveltia CMS
2. Commit message follows conventional commits format: `fix(mit): clarify warranty section`
3. Merge to `main` branch triggers semantic-release
4. Semantic-release analyzes commits, bumps version in `package.json`
5. Creates Git tag: `mit-v1.2.0`
6. Generates changelog, creates GitHub release
7. Build pipeline generates exports, attaches to GitHub release
8. Updates `versions.json` with new version metadata

**⚠️ VERSION MANAGEMENT UX NEEDED**: How do editors manage versions?

- Automatic via commit messages (conventional commits)?
- Manual version bump control in CMS?
- Preview changelog before release?
- Consider: Automated workflow vs manual control trade-off

---

### 4. Template Block

**Storage**: `content/template-blocks/{slug}.md`
**Format**: Markdown file with minimal frontmatter

**Schema**:

```yaml
---
identifier: warranty-disclaimer  # Machine-readable ID (unique)
category: warranty              # Block type
title: Standard Warranty Disclaimer
usage_count: 4                  # Computed: licenses using this block
---

# Standard Warranty Disclaimer

THE WORK IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

**Usage**:

- Referenced in license frontmatter: `template_blocks: [warranty-disclaimer]`
- Sveltia CMS provides selection interface (multi-select field)
- Build process injects template block content into final output

**Categories**:

- `warranty`: Warranty disclaimers
- `permission`: Permission grants
- `condition`: License conditions
- `limitation`: Liability limitations
- `notice`: Copyright/attribution notices

---

### 5. Blog Post

**Storage**: `content/blog/posts/{date}-{slug}.md`
**Format**: Markdown file with YAML frontmatter

**Schema**:

```yaml
---
title: Why Plain Language Matters for Legal Documents
slug: plain-language-matters
excerpt: >
  Complex legal language creates barriers. Here's why we're changing that.
author: editor@plainlicense.org
featured_image: ./images/plain-language-hero.jpg
tags:
  - plain-language
  - accessibility
  - legal-reform
related_licenses:           # Optional: link to relevant licenses
  - MIT
  - MPL-2.0
status: published
published_at: 2026-01-15T10:00:00Z
updated_at: 2026-01-15T10:00:00Z
---

# Why Plain Language Matters for Legal Documents

[Blog post content...]
```

**Relationships**:

- `related_licenses`: Array of SPDX IDs linking to license pages
- Build process generates related content widgets

---

### 6. Export Format

**Storage**: `exports/{license}/v{version}/` (build artifact, not source)
**Format**: Generated files during build process

**Generated Artifacts**:

```
exports/
└── mit/
    └── v1.2.0/
        ├── MIT.md                  # GitHub-flavored Markdown
        ├── MIT-commonmark.md       # CommonMark Markdown
        ├── MIT.txt                 # Plaintext
        ├── MIT.pdf                 # PDF (Pandoc + Typst)
        ├── MIT.xml                 # SPDX XML
        └── MIT-embed.html          # Embeddable HTML widget
```

**Generation Process**:

1. **Build-time**: Astro build script generates all formats
2. **Tools**: Pandoc (Markdown/PDF), Python (plaintext/XML), htmlmin (embed)
3. **GitHub Actions**: Attaches exports to GitHub release as assets
4. **CDN**: Also deployed to Cloudflare Pages `/exports/` directory

**Metadata Tracking** (in `versions.json`):

- URLs point to GitHub release assets (permanent, CDN-backed)
- SHA-256 hashes for cache busting and integrity verification
- Generation timestamp and method

---

## Authentication & Authorization

**Model**: GitHub repository permissions = CMS permissions

**Roles** (GitHub repository access levels):

- **Read**: Can view admin interface, cannot edit
- **Write**: Can create/edit content, create PRs (if branch protection enabled)
- **Maintain**: Can merge PRs, manage settings
- **Admin**: Full repository access

**OAuth Flow**:

1. Editor visits `/admin`
2. Sveltia CMS redirects to Cloudflare Worker OAuth proxy
3. Worker initiates GitHub OAuth flow
4. User authorizes app, returns to Sveltia CMS
5. Sveltia CMS stores access token (browser localStorage)
6. All content edits use GitHub API with token

**No separate user database needed**: GitHub handles authentication, repository permissions handle authorization.

---

## Configuration Files

### Sveltia CMS Configuration

**Location**: `public/admin/config.yml`

```yaml
backend:
  name: github
  repo: plainlicense/plainlicense
  branch: main
  base_url: https://plainlicense-oauth.workers.dev  # Cloudflare Worker

media_folder: public/images
public_folder: /images

collections:
  - name: licenses
    label: Licenses
    folder: content/licenses
    nested:
      depth: 2                # {category}/{slug}/
      summary: '{{dirname}}'
    create: true
    slug: '{{fields.slug}}'
    fields:
      - {label: "SPDX ID", name: "spdx_id", widget: "string", required: true}
      - {label: "Name", name: "name", widget: "string", required: true}
      - {label: "Plain Name", name: "plain_name", widget: "string"}
      - {label: "Slug", name: "slug", widget: "string", required: true}
      - label: "Category"
        name: "category"
        widget: "select"
        options: ["permissive", "copyleft", "source-available", "public-domain", "proprietary"]
      - {label: "Description", name: "description", widget: "text"}
      - label: "Permissions"
        name: "permissions"
        widget: "select"
        multiple: true
        options:
          - {label: "Commercial Use", value: "commercial-use"}
          - {label: "Modifications", value: "modifications"}
          - {label: "Distribution", value: "distribution"}
          - {label: "Private Use", value: "private-use"}
      - label: "Conditions"
        name: "conditions"
        widget: "select"
        multiple: true
        options:
          - {label: "Include Copyright", value: "include-copyright"}
          - {label: "Include License", value: "include-license"}
          - {label: "Document Changes", value: "document-changes"}
          - {label: "Disclose Source", value: "disclose-source"}
          - {label: "Same License", value: "same-license"}
      - label: "Limitations"
        name: "limitations"
        widget: "select"
        multiple: true
        options:
          - {label: "Liability", value: "liability"}
          - {label: "Warranty", value: "warranty"}
          - {label: "Trademark Use", value: "trademark-use"}
      - {label: "Original Gunning Fog", name: "original_gunning_fog", widget: "number", value_type: "float"}
      - {label: "Plain Gunning Fog", name: "plain_gunning_fog", widget: "number", value_type: "float"}
      - label: "Status"
        name: "status"
        widget: "select"
        options: ["draft", "published", "archived"]
        default: "draft"
      - label: "Template Blocks"
        name: "template_blocks"
        widget: "relation"
        collection: "template-blocks"
        search_fields: ["identifier", "title"]
        value_field: "identifier"
        display_fields: ["title"]
        multiple: true
        required: false
      - {label: "Body", name: "body", widget: "markdown"}

  - name: blog
    label: Blog Posts
    folder: content/blog/posts
    create: true
    slug: '{{year}}-{{month}}-{{day}}-{{slug}}'
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Slug", name: "slug", widget: "string"}
      - {label: "Excerpt", name: "excerpt", widget: "text"}
      - {label: "Author Email", name: "author", widget: "string"}
      - {label: "Featured Image", name: "featured_image", widget: "image", required: false}
      - label: "Tags"
        name: "tags"
        widget: "list"
        required: false
      - label: "Related Licenses"
        name: "related_licenses"
        widget: "relation"
        collection: "licenses"
        search_fields: ["spdx_id", "name"]
        value_field: "spdx_id"
        display_fields: ["name"]
        multiple: true
        required: false
      - label: "Status"
        name: "status"
        widget: "select"
        options: ["draft", "published"]
        default: "draft"
      - {label: "Body", name: "body", widget: "markdown"}

  - name: template-blocks
    label: Template Blocks
    folder: content/template-blocks
    create: true
    slug: '{{fields.identifier}}'
    fields:
      - {label: "Identifier", name: "identifier", widget: "string", required: true}
      - label: "Category"
        name: "category"
        widget: "select"
        options: ["warranty", "permission", "condition", "limitation", "notice"]
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Content", name: "body", widget: "markdown"}
```

---

## Migration Strategy

### From Current System (MkDocs + YAML)

**Content Migration**:

1. Current frontmatter structure is **already compatible** with Git-based CMS
2. No database migration required (content stays in repository)
3. Move license content from `docs/licenses/` to `content/licenses/`
4. Lerna packages remain unchanged (`packages/` directory)

**Python Hooks → TypeScript**:

- Rewrite `license_factory.py` as Astro integration
- Rewrite `shame_counter.py` as Astro build script
- Rewrite `socialmedia.py` using Astro social cards integration

**Section Mappings**:

- Create initial `mappings.json` files manually (editor tooling TBD)
- Preserve existing section relationships if any

**Estimated Migration Time**: 8-12 hours (mostly Python → TypeScript rewrites)

---

## Data Validation

### Frontmatter Validation (Sveltia CMS)

**Required Fields**:

- License: `spdx_id`, `name`, `slug`, `category`, `permissions`, `status`
- Blog Post: `title`, `slug`, `author`, `status`
- Template Block: `identifier`, `category`, `title`

**Format Validation**:

- `spdx_id`: Matches SPDX identifier format (uppercase, hyphens, numbers)
- `slug`: URL-safe (lowercase, hyphens only, no spaces)
- `permissions`/`conditions`/`limitations`: Valid enum values only
- Gunning Fog scores: Positive float values

**Content Validation** (build-time checks):

- Minimum content length (100 characters for plain language version)
- Section ID uniqueness within document
- Template block references exist
- Related licenses exist (for blog posts)

---

## Performance Considerations

**Build Time Projections**:

- Static site generation (Astro): 20-30 seconds
- Export generation (6 formats × 10 licenses): +6-10 seconds
- Total: **<1 minute** for full build

**Repository Size**:

- Estimated: <50 MB for 50 licenses + 100 blog posts
- Git history: Keep export artifacts out of repo (GitHub Releases only)

**CMS Performance**:

- Sveltia CMS: Client-side app, instant UI responsiveness
- GitHub API rate limits: 5,000 requests/hour (authenticated)
- Sufficient for dozens of editors making hundreds of edits/day

---

## Design Decisions Summary

### 1. Per-License Versioning Workflow ✅ CONFIRMED

**Decision**: Fully automated versioning with LLM-assisted commit message generation

**Approach**: Lerna + semantic-release with AI-generated conventional commit messages

- Editors write natural language descriptions of changes in Sveltia CMS
- LLM (GPT-4/Claude) converts description to conventional commit format
- Semantic-release analyzes commits and auto-bumps versions
- Changelog auto-generated from commit messages

**Versioning Rules** (from FAQ - docs/faq/index.md):

- **Major** (X.0.0): Version 1.0 when confident license is accurate; future majors only for significant errors requiring major changes
- **Minor** (x.X.0): Significant changes (adding/removing terms, structure changes, substantial style/formatting changes)
- **Patch** (x.x.X): Minor changes (typos, simpler synonyms, formatting fixes that don't affect structure/meaning)

**Workflow**:

1.  Editor makes content changes via Sveltia CMS
2.  Editor writes natural description in "Changelog" field:

   ```
   Fixed typo in warranty section, changed "utilization" to "use"
   ```

3.  Pre-commit hook invokes LLM to generate conventional commit:

   ```
   fix(mit): fix typo in warranty section

   Changed "utilization" to simpler "use" for clarity
   ```

4.  Commit merged to `main` triggers semantic-release
5.  Semantic-release analyzes commit type (`fix` = patch, `feat` = minor, `BREAKING CHANGE` = major)
6.  Bumps version in `packages/mit/package.json` (e.g., 1.2.0 → 1.2.1)
7.  Creates Git tag `mit-v1.2.1`
8.  Generates changelog entry
9.  Creates GitHub release with exports

**LLM Integration Point**: GitHub Actions with Claude Code OAuth (FREE)

**Workflow**:

1.  Editor writes changes with natural language description (any format)
2.  Sveltia CMS creates commit with editor's natural description
3.  Editor creates Pull Request
4.  **GitHub Actions** (on PR or merge to main):
   - Reads commit message(s) from PR
   - Uses **Claude Code OAuth** to call Claude API (FREE)
   - Claude generates conventional commit message following rules
   - GitHub Actions amends commit message OR creates standardized commit
5.  Semantic-release analyzes conventional commit → bumps version

**GitHub Actions Workflow** (`.github/workflows/conventional-commits.yml`):

```yaml
name: Generate Conventional Commits

on:
  pull_request:
    types: [opened, synchronize]
  # OR on merge to main - depends on preferred workflow

jobs:
  standardize-commits:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for commit analysis

      - name: Get commit messages
        id: commits
        run: |
          git log --format=%B -n 1 > commit_message.txt

      - name: Generate conventional commit with Claude
        uses: anthropics/claude-code-action@v1  # Hypothetical action
        with:
          oauth-token: ${{ secrets.CLAUDE_CODE_OAUTH }}
          prompt: |
            Convert this commit message to conventional commits format
            following Plain License versioning rules:

            RULES:
            - fix: typos, clarity improvements → PATCH
            - feat: new terms, structure changes → MINOR
            - BREAKING CHANGE: significant errors → MAJOR

            COMMIT MESSAGE:
            ${{ steps.commits.outputs.message }}

            GENERATE: Conventional commit (type(scope): subject)

      - name: Amend commit message
        run: |
          git commit --amend -m "${{ steps.claude.outputs.commit-message }}"
          git push --force-with-lease
```

**Claude Code OAuth Setup**:

- No API costs (uses Claude Code's free authentication)
- Configure in repository settings: `CLAUDE_CODE_OAUTH` secret
- Claude Code provides OAuth tokens for CI/CD use

**Benefits**:

- ✅ **100% FREE** (no LLM API costs via Claude Code OAuth)
- ✅ Non-technical editors write natural descriptions
- ✅ Consistent commit message format (Claude enforces rules)
- ✅ Automated versioning (Lerna + semantic-release unchanged)
- ✅ Runs in CI (no local setup, no pre-commit hooks)
- ✅ Works with Pull Request workflow (standardize before merge)

**Trade-offs**:

- ⚠️ Requires Claude Code OAuth setup (one-time configuration)
- ⚠️ Slight PR workflow delay (~5-10 seconds for Claude API call in CI)
- ⚠️ Commit message rewrite in CI (force-push to PR branch)

**Alternative Approach** (if commit amending is problematic):

- Keep original commits as-is
- Generate conventional commit in **separate commit** for semantic-release
- Preserve editor's natural language for human changelog
- Semantic-release reads standardized commit, generates from natural description

**Fallback**: If Claude Code OAuth fails, GitHub Actions can prompt for manual conventional commit or use fallback format based on file changes (e.g., changes to `index.md` = `fix(license): update content`)

---

### 2. License Clause Mapping ✅ CONFIRMED

**Decision**: Clause-level mapping with comprehensive specification

**Specification Created**:

- Complete mapping specification: [`mapping-specification.md`](./mapping-specification.md)
- Formal JSON schema: [`mapping-schema.json`](./mapping-schema.json)
- 7 mapping types defined with confidence rubrics
- Semantic tag taxonomy for grouping clauses
- SHA-256 hash generation with normalization rules
- Validation rules and edge case handling

**Implementation Approach**:

- **v1.0**: Manual JSON editing with CLI hash generation tool (ship quickly, learn requirements)
- **v2.0**: Browser-based visual mapping tool (no local setup, upload/download workflow)
- **Phase 1 Prototype**: AI-assisted mapping tool (see `phase1-ai-prototype-spec.md`)

**Design Decisions**: ✅ All 8 technical decisions resolved - see `mapping-specification.md` section "Design Decisions (Resolved)"

---

### 3. Version History Display

**Question**: Should license version history be visible on the site, or just in GitHub?

**Options**:

- **GitHub Only**: Link to GitHub releases page
- **Site Integration**: Build changelog page per license
- **Both**: GitHub for raw data, site for formatted presentation

**Recommendation**: Both (GitHub for technical users, site for general public)

---

## Next Steps

1.  **Review & Approve Data Model** (this document)
2.  **Create API Contracts** (`contracts/` directory)
   - CMS → Git API contract
   - Build → Export Generation contract
   - Frontend → Section Mapping contract
3.  **Create Quickstart Guide** (`quickstart.md`)
   - Developer environment setup
   - Running Astro + Sveltia CMS locally
   - Making first content edit
4.  **Prototype Section Mapping Tool** (spike/POC)
   - Validate UX approach before full implementation

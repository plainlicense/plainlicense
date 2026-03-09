# CMS Content Contract

**Feature**: 001-cms-license-platform
**Component**: Sveltia CMS → Git Repository
**Last Updated**: 2026-01-30

## Overview

This contract defines how content is authored in Sveltia CMS and stored in the Git repository. Sveltia CMS is a Git-based CMS that stores content as markdown files with YAML frontmatter directly in the repository.

**Key Principle**: Content lives in Git as markdown files. CMS provides editing UI, Git is source of truth.

## Directory Structure

```
content/
├── licenses/           # License content
│   ├── mit.md
│   ├── mpl-2-0.md
│   └── elastic-2-0.md
├── blog/              # Blog posts
│   └── 2026-01-30-example-post.md
└── mappings/          # License clause mappings
    ├── mit-mapping.json
    ├── mpl-2-0-mapping.json
    └── elastic-2-0-mapping.json

public/
└── original-licenses/ # Original legal text (not CMS-managed)
    ├── MIT.txt
    ├── MPL-2.0.txt
    └── Elastic-2.0.txt
```

## License Content Schema

### File Location

-   **Path**: `content/licenses/{license-id}.md`
-   **Naming**: Kebab-case, matches SPDX ID when possible
    - `mit.md` (SPDX: MIT)
    - `mpl-2-0.md` (SPDX: MPL-2.0)
    - `elastic-2-0.md` (SPDX: Elastic-2.0)

### Frontmatter Schema

```yaml
---
# === Required Fields ===
title: "MIT License (Plain Language)"
spdx_id: "MIT"                    # SPDX identifier or "custom-{id}"
version: "0.2.1"                  # Semantic version of plain language version
original_version: "2024"          # Version of original legal text
description: "Short description for meta tags and cards"

# === License Classification ===
license_type: "permissive"        # permissive | copyleft | source-available
is_osi_approved: true             # Boolean
is_fsf_approved: true             # Boolean
fair_code: false                  # Boolean (true for source-available licenses)

# === Content Sections (Optional but Recommended) ===
summary: "One-sentence summary"
use_cases:
  - "Open source software projects"
  - "Personal creative projects"

# === Restrictions (Optional) ===
restrictions:
  commercial_use: false           # true if commercial use restricted
  attribution_required: true      # true if attribution required
  share_alike: false              # true if copyleft/share-alike required

# === Metadata ===
canonical_url: "https://opensource.org/licenses/MIT"
created_date: "2026-01-30"
last_modified: "2026-01-30"
author: "Plain License Team"

# === SEO & Social ===
meta_description: "Plain language MIT license for all creative works"
og_image: "/images/licenses/mit-og.png"  # Optional

# === Mappings ===
has_mapping: true                 # Boolean - whether mapping.json exists
mapping_version: "1.0.0"          # Version of mapping data

# === Display Options ===
show_original_comparison: true    # Show side-by-side comparison
show_shame_counter: true          # Show legal complexity counter
featured: false                   # Featured on homepage
---

# Your markdown content here
```

### Frontmatter Field Validation

**Required Fields**:

- `title` (string, 1-100 chars)
- `spdx_id` (string, pattern: `^[A-Z0-9.-]+$` or `^custom-[a-z0-9-]+$`)
- `version` (string, semantic version pattern: `^\d+\.\d+\.\d+$`)
- `original_version` (string)
- `description` (string, 1-300 chars)
- `license_type` (enum: `permissive`, `copyleft`, `source-available`)
- `is_osi_approved` (boolean)
- `is_fsf_approved` (boolean)

**Optional Fields**:

- All other fields are optional but recommended for completeness

**Validation Rules**:

1. `spdx_id` must be unique across all licenses
2. `version` must follow semantic versioning
3. If `fair_code: true`, then `license_type` must be `source-available`
4. If `has_mapping: true`, corresponding mapping file must exist in `content/mappings/{spdx_id}-mapping.json`

## Blog Post Schema

### File Location

-   **Path**: `content/blog/{date}-{slug}.md`
-   **Naming**: `YYYY-MM-DD-{kebab-case-title}.md`
    - Example: `2026-01-30-introducing-plain-license.md`

### Frontmatter Schema

```yaml
---
# === Required Fields ===
title: "Blog Post Title"
date: "2026-01-30"                # ISO 8601 date
author: "Author Name"
description: "Post description for meta tags"

# === Optional Fields ===
tags:
  - "announcements"
  - "licenses"
category: "announcements"         # announcements | tutorials | updates
featured: false                   # Boolean
og_image: "/images/blog/post-og.png"
---

# Your markdown content here
```

## Mapping Data Schema

### File Location

-   **Path**: `content/mappings/{spdx_id}-mapping.json`
-   **Naming**: Matches corresponding license file
    - `mit-mapping.json` for `mit.md`
    - `mpl-2-0-mapping.json` for `mpl-2-0.md`

### Schema Reference

See `mapping-schema.json` for complete JSON Schema.

**Key Requirements**:

1. Must validate against `mapping-schema.json`
2. File must be valid JSON (no comments)
3. `license_id` in mapping must match license `spdx_id`
4. `version` in mapping must match Plain License system version (from `package.json`)

### Example Structure

```json
{
  "license_id": "MIT",
  "version": "0.2.1",
  "mapping_philosophy": "clause-level with interpretive correspondence",
  "mappings": [
    {
      "id": "map-perm-use",
      "type": "one-to-one-expanded",
      "plain_clause": { "id": "plain-perm-use", "hash": "sha256:...", "content": "..." },
      "original_clause": { "id": "original-grant-use", "hash": "sha256:...", "content": "..." },
      "confidence": 0.92,
      "semantic_tag": "permissions"
    }
  ]
}
```

## Sveltia CMS Configuration

### Collection Definition (config.yml)

```yaml
collections:
  - name: "licenses"
    label: "Licenses"
    folder: "content/licenses"
    create: true
    slug: "{{spdx_id}}"
    fields:
      # Field definitions matching frontmatter schema
      - {label: "Title", name: "title", widget: "string", required: true}
      - {label: "SPDX ID", name: "spdx_id", widget: "string", required: true,
         pattern: ['^[A-Z0-9.-]+$|^custom-[a-z0-9-]+$', "Must be valid SPDX ID"]}
      - {label: "Version", name: "version", widget: "string", required: true,
         pattern: ['^\d+\.\d+\.\d+$', "Must be semantic version (e.g., 1.0.0)"]}
      # ... more fields

  - name: "blog"
    label: "Blog Posts"
    folder: "content/blog"
    create: true
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    fields:
      - {label: "Title", name: "title", widget: "string", required: true}
      - {label: "Date", name: "date", widget: "datetime", required: true}
      # ... more fields

  - name: "mappings"
    label: "License Mappings"
    folder: "content/mappings"
    extension: "json"
    create: true
    slug: "{{license_id}}-mapping"
    editor:
      preview: false
    fields:
      - {label: "License ID", name: "license_id", widget: "string", required: true}
      - {label: "Mappings", name: "mappings", widget: "list",
         fields: [...]}  # Complex nested structure
```

## Content Authoring Workflow

### Creating a New License (Editor Perspective)

1. **Login to CMS**: Navigate to `/admin`, authenticate via GitHub OAuth
2. **New License**: Click "New License" in CMS
3. **Fill Form**: Complete required fields in CMS form UI
4. **Write Content**: Author plain language license in markdown editor
5. **Preview**: View live preview of rendering
6. **Save Draft**: CMS creates Git branch with draft content
7. **Publish**: CMS merges branch to main, triggers build

### CMS → Git Translation

When editor clicks "Save" or "Publish":

```
CMS Form Data
    ↓
YAML Frontmatter Generation
    ↓
Markdown File Creation (content/licenses/mit.md)
    ↓
Git Commit (on draft branch)
    ↓
[On Publish] Git Merge to main
    ↓
CI/CD Build Trigger (Cloudflare Pages)
```

## Validation Rules

### Pre-Commit Validation (Git Hooks)

1.  **Frontmatter Validation**:
   - All required fields present
   - Field types correct (string, boolean, array)
   - Patterns match (spdx_id, version)

2.  **File Structure Validation**:
   - File in correct directory
   - Filename matches conventions
   - No duplicate `spdx_id` values

3.  **Mapping Validation**:
   - If `has_mapping: true`, mapping file exists
   - Mapping JSON validates against schema
   - `license_id` in mapping matches license `spdx_id`

4.  **Markdown Validation**:
   - Valid markdown syntax
   - No broken internal links
   - Images referenced exist

### Build-Time Validation (Astro)

1. **Content Collection Schema**: Astro Zod schema validates frontmatter
2. **Cross-References**: Verify mapping files referenced exist
3. **Image Assets**: Verify all referenced images exist
4. **Link Checking**: Verify internal and external links

## Migration from Current System

### Current System (MkDocs)

```
packages/
└── licenses/
    └── MIT/
        ├── package.json
        ├── LICENSE_PLAIN.md
        └── LICENSE_ORIGINAL.txt
```

### New System (Astro + Sveltia CMS)

```
content/
└── licenses/
    └── mit.md  (contains frontmatter + content)

public/
└── original-licenses/
    └── MIT.txt
```

### Migration Strategy

1. **Extract Frontmatter**: Parse `package.json` → YAML frontmatter
2. **Merge Content**: `LICENSE_PLAIN.md` content → markdown body
3. **Move Original**: `LICENSE_ORIGINAL.txt` → `public/original-licenses/`
4. **Lerna Versioning**: Keep semantic-release for version bumps, update frontmatter `version` field

## Contract Guarantees

### CMS Guarantees (Sveltia CMS)

- ✅ Content stored as markdown + YAML in Git
- ✅ All edits create Git commits
- ✅ Draft/publish workflow via Git branches
- ✅ Real-time preview during editing
- ✅ Form validation before save

### Repository Guarantees (Git)

- ✅ Content versioned with full history
- ✅ Rollback capability via Git
- ✅ Concurrent editing via branch workflow
- ✅ Pre-commit hooks validate content

### Build System Guarantees (Astro)

- ✅ Frontmatter validates against Zod schema
- ✅ Invalid content blocks build
- ✅ Type-safe access to frontmatter data
- ✅ Automatic slug generation from filename

## Success Criteria (SC-001 Compliance)

**Goal**: Non-technical editor can create/publish license in <30 minutes

**Workflow Time Breakdown**:

1. Login to CMS: ~30 seconds (GitHub OAuth)
2. Create new license: ~5 seconds (click button)
3. Fill required fields: ~2-3 minutes (11 required fields)
4. Write content: ~8-12 minutes (content authoring)
5. Preview: Real-time (<1 second)
6. Publish: ~30-60 seconds (Git commit + build)

**Total**: 15-20 minutes ✅ (beats 30-minute requirement)

## Error Handling

### CMS Validation Errors

- **Missing Required Field**: Show inline error in form, block save
- **Invalid Pattern**: Show regex error message, block save
- **Duplicate spdx_id**: Check existing files, show error, block save

### Build Errors

- **Invalid Frontmatter**: Build fails with clear error message referencing file and line
- **Missing Mapping**: Build warning (not blocking) if `has_mapping: true` but file missing
- **Invalid Mapping JSON**: Build fails with JSON parse error and file location

### Git Conflicts

- **Concurrent Edits**: Sveltia CMS detects conflicts, prompts user to resolve
- **Branch Cleanup**: Auto-delete merged branches after publish

## Related Contracts

- **Astro Content Contract** (`astro-content-contract.md`): How Astro consumes this content
- **Mapping Data Contract** (`mapping-data-contract.md`): Detailed mapping JSON schema
- **Export Pipeline Contract** (`export-pipeline-contract.md`): How exports are generated from content

## References

- Sveltia CMS Documentation: <https://github.com/sveltia/sveltia-cms>
- Decap CMS Config: <https://decapcms.org/docs/configuration-options/>
- SPDX License List: <https://spdx.org/licenses/>
- Semantic Versioning: <https://semver.org/>

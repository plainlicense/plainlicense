# Current System Analysis: Plain License

**Date**: 2026-01-30
**Purpose**: Understand existing architecture before proposing replacement

---

## System Overview

Plain License is a **frontmatter-driven static site** using MkDocs Material with custom Python hooks for content assembly and processing.

### Tech Stack (Current)

- **Static Site Generator**: MkDocs Material
- **Build Tool**: Bun (TypeScript/JavaScript)
- **Content**: Markdown files with extensive YAML frontmatter
- **Processing**: Python hooks in `overrides/hooks/`
- **Styling**: Custom CSS with GSAP animations
- **Assets**: Optimized images/videos via `src/build/index.ts`
- **Versioning**: Lerna monorepo with semantic-release per license
- **Hosting**: (Assumed GitHub Pages based on public repo)

---

## Content Architecture

### Lerna Monorepo Structure

```
packages/
├── mit/
│   └── package.json          # Semantic release config, changelog management
├── mpl-2.0/
│   └── package.json
├── elastic-2.0/
│   └── package.json
├── unlicense/
│   └── package.json
└── plainlicense/
    └── package.json
```

**Each package**:

- Independent semantic versioning (v0.2.1, v1.0.0, etc.)
- Automated changelog generation (@semantic-release/changelog)
- GitHub releases with markdown assets
- Commit-based versioning (type: stable/new/subs/admin/bot)

**Package metadata** points to actual content:

```json
{
  "main": "../../docs/licenses/permissive/mit/index.md"
}
```

---

## License Content Structure

### Frontmatter-Driven Model

Licenses are **single markdown files** (`docs/licenses/{category}/{license}/index.md`) with **extensive YAML frontmatter**:

```yaml
---
template: license.html
plain_name: Plain MIT License
spdx_id: MIT
original_name: MIT License
category: permissive

# Metadata
permissions: [commercial-use, modifications, distribution, private-use]
conditions: [include-copyright]
limitations: [liability, warranty]

# Readability metrics
original_gunning_fog: 21.94
plain_gunning_fog: 9.74

# Content (Jinja2 templates)
reader_license_text: |
  Copyright Notice: (c) {{ year }} [copyright holders]

  ## You Can Do Anything with The Work
  ...

original_license_text: |
  # The MIT License (MIT)
  ...

# Reference links (reusable across content)
reference_links:
  - name: selflink
    url: https://plainlicense.org/licenses/permissive/mit/
---

# Additional content after frontmatter (abbreviations, etc.)
```

**Key Features**:

- **Jinja2 templates**: `{{ year }}` for dynamic copyright years
- **Rich metadata**: Permissions/conditions/limitations for at-a-glance view
- **Dual content**: Both plain language (`reader_license_text`) and original (`original_license_text`)
- **Readability tracking**: Gunning Fog scores for both versions
- **Reference links**: Centralized link definitions

---

## Python Hooks (Content Processing)

Located in `overrides/hooks/`, these process content during MkDocs build:

### 1. **license_factory.py**

- **Purpose**: Assembles licenses from frontmatter and boilerplate
- **What it does**: Likely parses YAML frontmatter, processes Jinja2 templates, inserts boilerplate text
- **Size**: 23,627 characters (complex logic)

### 2. **shame_counter.py**

- **Purpose**: Counts "shame words" (complex legal terms) in licenses
- **Integration**: Tracks plain language quality

### 3. **socialmedia.py**

- **Purpose**: Generates social media cards (OpenGraph images)
- **Material integration**: Uses MkDocs Material social cards plugin

### 4. **update_site_license.py**

- **Purpose**: Keeps site license current with latest Plain Unlicense

### 5. **fix_html.py**

- **Purpose**: Post-rendering HTML fixes

### Supporting Files:

- `_utils.py`: Utility functions
- `hook_logger.py`: Centralized logging
- `env_settings.py`: Jinja environment configuration

---

## Build Pipeline (`src/build/index.ts`)

**Size**: 11,151 characters (comprehensive build orchestrator)

**Likely responsibilities** (based on size and structure):

- Asset optimization (images, videos, fonts)
- TypeScript compilation with esbuild
- CSS processing and bundling
- Hash-based cache busting for assets
- Multi-format video generation for hero sections

---

## Categories & Navigation

### License Categories (4 total)

1. **Public Domain**: Unlicense
2. **Permissive**: MIT
3. **Copyleft**: MPL-2.0
4. **Source-Available**: Elastic License 2.0
5. **Proprietary**: (Category exists but no licenses yet)

### Site Structure

```
/
├── home (index.md)
├── about/
├── faq/
├── licenses/
│   ├── public-domain/unlicense/
│   ├── permissive/mit/
│   ├── copyleft/mpl-2.0/
│   └── source-available/elastic-2.0/
├── help/ (craft, write, legal, translate, code, speak, donate)
└── blog/
```

---

## Current Pain Points (Inferred)

### 1. **Non-Technical User Barrier** ❌

- **Problem**: Editing YAML frontmatter requires technical knowledge
- **Impact**: Violates SC-001 ("non-technical editors create license <30 minutes")
- **Evidence**: 111 lines of YAML frontmatter for MIT license alone

### 2. **No Visual Preview** ❌

- **Problem**: No live preview of changes before committing to Git
- **Impact**: Editors can't see formatted output until after push
- **Workflow**: Edit YAML → commit → push → wait for build → view on site

### 3. **MkDocs Unmaintained** ❌

- **Problem**: MkDocs unmaintained for 18 months (confirmed by user)
- **Impact**: Security vulnerabilities, no bug fixes, ecosystem stagnation
- **Risk**: Incompatibility with future dependencies

### 4. **No Draft/Publish Workflow** ❌

- **Problem**: All changes go directly to Git (published immediately)
- **Impact**: No ability to work on drafts without publishing
- **Missing**: Content versioning (beyond Git commits)

### 5. **Manual Metadata Management** ⚠️

- **Problem**: Permissions, conditions, limitations manually maintained
- **Risk**: Inconsistency across licenses (typos, missing tags)
- **Example**: `permissions: [commercial-use, modifications, ...]` - easy to misspell

---

## What Works Well ✅

### 1. **Elegant Content Model**

- Frontmatter-based is **clean and maintainable** for developers
- Dual plain/original content in single file is **smart architecture**
- Jinja2 templates allow **dynamic elements** (`{{ year }}`)
- Reference links prevent **duplicate URLs** across content

### 2. **Readability Tracking**

- **Gunning Fog scores** prove plain language improvement (MIT: 21.94 → 9.74)
- **Shame word counter** enforces plain language standards
- **Measurable quality** aligns with Plain License mission

### 3. **Semantic Versioning**

- **Lerna monorepo** allows independent license versioning
- **Automated changelogs** via semantic-release
- **GitHub releases** provide version history
- **Commit-based versioning** enables automated releases

### 4. **Custom Processing Pipeline**

- **Python hooks** enable powerful content transformations
- **TypeScript build** optimizes frontend assets
- **Modular architecture** separates concerns cleanly

### 5. **Plain Language Quality**

- **Constitution-driven** (CLAUDE.md standards)
- **Shame words list** in mkdocs.yml enforces vocabulary
- **Consistent terminology** across licenses

---

## Technical Debt

### 1. **MkDocs Lock-In**

- Entire content processing relies on MkDocs Material
- Python hooks tightly coupled to MkDocs plugin system
- Migration requires rewriting all hooks

### 2. **No Automated Tests**

- Build pipeline untested
- Python hooks untested
- Risk of regressions when changing content

### 3. **Manual Content Assembly**

- No automated mapping between plain/original sections
- Section comparison feature (FR-014-018) requires new infrastructure

---

## Migration Challenges

### Content Migration

- **100+ lines of frontmatter** per license → CMS fields
- **Jinja2 templates** → CMS dynamic fields or build-time rendering
- **Reference links** → CMS link management
- **Permissions/conditions** → CMS taxonomy or tags

### Process Migration

- **Python hooks logic** → New static site generator hooks or build scripts
- **Shame counter** → CMS plugin or build validation
- **Social media cards** → New generator's social card system
- **License assembly** → CMS content model + templates

### Version Control Migration

- **Lerna packages** → CMS version tracking
- **Semantic release** → Manual versioning or CMS workflows
- **Changelogs** → CMS changelog generation

---

## Current Workflow (Developer)

1. **Edit**: Open `docs/licenses/{category}/{license}/index.md` in editor
2. **Modify**: Edit YAML frontmatter (technical, error-prone)
3. **Preview** (optional): Run `mkdocs serve` locally (requires Python setup)
4. **Commit**: `git add`, `git commit` with semantic commit message
5. **Push**: `git push` to trigger build
6. **Wait**: GitHub Actions builds site
7. **Verify**: Check live site for changes

**Time estimate**: 10-30 minutes for technical user, **impossible** for non-technical user

---

## Success Criteria Gaps

| Requirement | Current Status | Gap |
|-------------|---------------|-----|
| **SC-001**: Non-technical editor creates license <30 minutes | ❌ FAIL | Requires YAML frontmatter expertise, Git knowledge |
| **FR-001**: Visual editor without code | ❌ FAIL | Raw markdown + YAML editing only |
| **FR-004**: Preview before publishing | ⚠️ PARTIAL | Local preview requires dev setup |
| **FR-005**: Draft/published states | ❌ FAIL | No draft system (Git only) |
| **FR-019-023**: Version management | ✅ PASS | Lerna + semantic-release works well |

---

## Recommendations for Redesign

### What to Keep

1. **Content model**: Frontmatter-based structure is elegant (translate to CMS fields)
2. **Dual content**: Plain/original in same entity (preserve in CMS)
3. **Readability tracking**: Gunning Fog, shame words (integrate with CMS)
4. **Semantic versioning**: Lerna approach works (adapt to CMS)
5. **Plain language standards**: Constitution, shame words list (enforce in CMS)

### What to Replace

1. **MkDocs**: Choose maintained static site generator
2. **Manual YAML editing**: Visual CMS editor for non-technical users
3. **Git-only workflow**: Add CMS with draft/publish
4. **No preview**: Live preview in CMS before publishing

### What to Build New

1. **Section mapping**: Plain-to-original comparison (FR-014-018)
2. **Reactive components**: FAQ, tables, decision trees (FR-030-034)
3. **Multi-format export**: Build-time generation (FR-007-013)
4. **Blog CMS**: Non-technical blog editing (FR-035-038)

---

## Questions for Redesign

1. **Static Site Generator**: What replaces MkDocs? (Astro, Eleventy, Docusaurus, Next.js?)
2. **CMS Integration**: How to map frontmatter → CMS fields without breaking content model?
3. **Python Hooks**: Rewrite in JavaScript/TypeScript or keep Python build scripts?
4. **Versioning**: Keep Lerna or move to CMS version tracking?
5. **Free Hosting**: GitHub Pages sufficient or need Cloudflare Pages features?
6. **Build Pipeline**: Extend `src/build/index.ts` or rewrite for new generator?

---

## Current System Strengths Summary

✅ **Elegant architecture** (frontmatter-driven, dual content, reference links)
✅ **Semantic versioning works** (Lerna + semantic-release)
✅ **Measurable quality** (readability scores, shame words)
✅ **Modular processing** (Python hooks, TypeScript build)
✅ **Plain language excellence** (constitution-driven, consistent terminology)

**BUT**: Completely inaccessible to non-technical users ❌

---

## Next Steps

1. ✅ **Current system analyzed** (this document)
2. ⏳ **Research static site generators** (MkDocs replacements)
3. ⏳ **Research FREE CMS options** (visual editing for non-technical users)
4. ⏳ **Research free hosting** (GitHub Pages vs alternatives)
5. ⏳ **Design CMS field mapping** (frontmatter → CMS schema)

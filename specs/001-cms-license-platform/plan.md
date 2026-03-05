# Implementation Plan: Content Management & License Platform Redesign

**Branch**: `001-cms-license-platform` | **Date**: 2026-01-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-cms-license-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Complete redesign of Plain License website to add headless CMS for content management, multi-format license export (markdown, PDF, plaintext, SPDX XML, embed), interactive plain-to-original comparison, versioning system, reactive components, and blog functionality. Core technical approach uses Git-based headless CMS (fallback option) with MkDocs Material, headless browser PDF generation (Playwright), and build-time static export generation.

## Technical Context

**Language/Version**: Python 3.11+ (MkDocs), TypeScript 5.x (frontend), Bun 1.x (build tooling)
**Primary Dependencies**: Astro (site generator), Starlight (documentation theme), Sveltia CMS (Git-based headless CMS), Typst (PDF generation), esbuild (bundling), GSAP (animations)
**Storage**: Git repository (Sveltia CMS content) + Cloudflare R2 or DigitalOcean Spaces (export artifacts)
**Testing**: Vitest + @vitest/coverage-v8 (unit/integration), Playwright (E2E), Lighthouse CI (performance), axe-core (accessibility)
**Test Strategy**: Test-Driven Development (TDD) with comprehensive coverage - 111 test tasks across all user stories
**Coverage Targets**: 80% unit, 70% integration, 90% E2E, 100% success criteria validation
**Test Automation**: GitHub Actions CI with parallel execution, coverage reporting (Codecov), visual regression (Percy/Chromatic)
**Performance Testing**: Lighthouse CI performance budgets, custom benchmarks, load testing (1000 concurrent users)
**Security Testing**: OAuth flow security audit, XSS/CSRF protection, dependency vulnerability scanning (npm audit, Snyk)
**Test Effort**: 70-90 hours (25-30% of total project) - industry standard for quality software
**Target Platform**: Cloudflare Pages (static site + Sveltia CMS admin interface)
**Project Type**: Web (Git-based static site + headless CMS)
**Performance Goals**: <2s page load (SC-002), <50ms comparison highlighting, 5-12s PDF generation (10 licenses, parallel)
**Constraints**: Free Cloudflare Pages hosting, Git-based content management (no database costs), build-time export generation, 98% download success (CDN redundancy)
**Scale/Scope**: Dozens of licenses, Git-based content management, multiple content editors with OAuth-based access control, blog functionality, full version history via Git
**Starlight Customization Strategy**: Hybrid approach using strategic component overrides
  - **Keep**: Base layout, accessibility (WCAG 2.1 AA), performance optimizations, design system, typography
  - **Override**: Header (Plain License branding), Footer (custom attribution), Sidebar (license navigation)
  - **Custom Pages**: License detail pages, blog listing/detail, homepage using `<StarlightPage>` wrapper
  - **Custom Components**: Comparison UI, download center, reactive components (FAQ, tables, decision trees)
  - **Multiple Collections**: licenses, blog, docs (optional), template-blocks via Astro Content Collections API
**Authentication Strategy**: OAuth 2.0 with PKCE + localStorage token storage
  - **Approach**: Sveltia CMS standard OAuth flow with localStorage (industry-standard for Git-based SPAs)
  - **Security**: Mitigate XSS risks via strict CSP Level 3 (FR-047), 15-min token expiration, secure token rotation
  - **Rationale**: Aligns with Sveltia CMS architecture, free tier constraints, modern browser localStorage isolation
  - **Implementation**: Short-lived access tokens (15 min), long-lived refresh tokens (7 days), input sanitization (FR-048)
**Export Generation Strategy**: Incremental builds with content-based hashing
  - **Approach**: SHA-256 hash of license content + templates, skip exports if unchanged, build manifest tracking
  - **Performance**: 50 licenses: ~2s incremental, 500 licenses: ~20s first build / ~5s incremental (vs ~100s linear)
  - **Parallelization**: 5-10 concurrent Typst processes using Bun concurrency for faster PDF generation
  - **Scalability**: Supports FR-053 target of 500 licenses without Cloudflare Pages timeout (30-min limit)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Plain Language First ✅
- CMS will enable rich text editing with readability tools integration
- Export formats must maintain plain language quality
- No violations expected

### II. Voice Consistency ✅
- CMS template blocks enforce consistent voice across licenses
- Reactive components maintain Plain License tone
- Blog functionality uses same editorial standards
- No violations expected

### III. Universal Applicability ✅
- CMS must support "source materials" terminology system
- Template blocks will include cross-medium examples
- Export formats must preserve universal applicability
- No violations expected

### IV. Cross-License Consistency ✅
- Template blocks will standardize permission/warranty language
- CMS validation can enforce terminology standards
- Version management tracks consistency across updates
- No violations expected

### V. Documentation Quality ✅
- Rich text editor supports structured formatting
- PDF export maintains typography standards (FR-012)
- Reactive components provide visual enhancement
- Shame words detection integrated in build pipeline
- No violations expected

**STATUS**: All constitution principles align with feature requirements. No complexity justification needed.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Static Site Generator + Frontend Assets
src/
├── assets/
│   ├── javascripts/       # TypeScript modules (Observable-based, GSAP)
│   ├── stylesheets/       # CSS processing
│   ├── images/            # Optimized images
│   └── fonts/             # Web fonts
└── build/                 # Custom build orchestrator (esbuild, hash caching)

# MkDocs Theme + Python Processing
overrides/
├── hooks/                 # Content processing (license_factory, shame_counter, socialmedia)
├── partials/              # Theme template overrides
└── images/                # Theme assets

# License Content Packages (Lerna monorepo)
packages/
├── mit/                   # Individual license NPM packages
├── mpl-2.0/
├── elastic-2.0/
├── unlicense/
└── plainlicense/

# CMS Integration (Git-based with Sveltia + Astro)
public/admin/              # Sveltia CMS admin interface
└── config.yml             # CMS configuration (collections, fields, workflows)

content/                   # Git-based content repository (Astro Content Collections)
├── licenses/              # License content markdown files
│   ├── permissive/        # Category: Permissive licenses (MIT, Apache, etc.)
│   ├── copyleft/          # Category: Copyleft licenses (GPL, MPL, etc.)
│   └── source-available/  # Category: Fair Code / Source-available
├── blog/                  # Blog post markdown files
│   └── posts/
├── template-blocks/       # Reusable boilerplate content
└── mappings/              # Section mapping JSON files

# Astro Project Structure
src/
├── content/
│   └── config.ts          # Zod schemas for content validation
├── components/            # Astro/Svelte/React components
│   ├── reactive/          # Interactive components (FAQ, tables, trees)
│   └── layouts/           # Page layouts
├── pages/                 # File-based routing
│   ├── licenses/[slug].astro
│   ├── blog/[slug].astro
│   └── preview/[...slug].astro
├── assets/
│   ├── javascripts/       # TypeScript modules (GSAP, RxJS, clipboard)
│   └── stylesheets/       # CSS/SCSS files
├── build/
│   └── exports/           # Export generation pipeline (markdown, PDF, XML, embed)
├── utils/                 # Shared utilities (hashing, validation, parsing)
└── schemas/               # JSON schemas for data validation

# Export Artifacts (build output)
dist/exports/              # Pre-generated at build time (Astro build process)
├── markdown/
│   ├── github/            # GitHub-flavored markdown
│   └── commonmark/        # Vanilla markdown
├── plaintext/             # Plain text versions
├── pdf/                   # Typst-generated PDFs
├── xml/                   # SPDX XML format
└── embed/                 # Embed-ready HTML

# Cloudflare Workers (Authentication)
workers/
└── oauth-proxy/           # OAuth 2.0 proxy for GitHub/Google authentication
    └── index.ts

# Testing Infrastructure
tests/                     # Vitest for TypeScript, Playwright for E2E
├── unit/                  # Component and utility function tests
│   ├── exports.test.ts    # Export generation tests
│   └── components.test.ts # Component rendering tests
├── integration/           # Multi-module integration tests
│   ├── content-collections.test.ts
│   └── mapping-system.test.ts
└── e2e/                   # Playwright browser tests
    ├── cms-workflow.spec.ts
    └── visitor-journey.spec.ts
```

**Structure Decision**: Git-based architecture using Sveltia CMS (admin at /public/admin) with Astro Content Collections API. Content stored as markdown files in content/ directory with frontmatter validation via Zod schemas. Export generation integrated into Astro build pipeline in src/build/exports/. Cloudflare Workers handle OAuth authentication. All artifacts deployed to Cloudflare Pages as static site.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

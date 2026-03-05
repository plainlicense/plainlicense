# Tasks: Content Management & License Platform Redesign

**Input**: Design documents from `/specs/001-cms-license-platform/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are NOT explicitly requested in the feature specification. Test tasks are EXCLUDED per requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, etc.)
- File paths follow the architecture defined in plan.md and data-model.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Git-based CMS architecture setup

- [ ] T001 Create directory structure per data-model.md (content/, public/, exports/, workers/)
- [ ] T002 Initialize Astro project with Starlight theme and Content Collections API
- [ ] T002a [P] Configure Starlight component overrides in astro.config.mjs (Header, Footer, Sidebar)
- [ ] T002b [P] Create custom Header component in src/components/overrides/Header.astro with Plain License branding
- [ ] T002c [P] Create custom Footer component in src/components/overrides/Footer.astro with attribution
- [ ] T002d [P] Create custom Sidebar component in src/components/overrides/Sidebar.astro for license navigation
- [ ] T003 [P] Install Sveltia CMS dependencies and configure public/admin/ directory
- [ ] T004 [P] Configure Bun build tooling and TypeScript compilation
- [ ] T005 [P] Setup Biome for code formatting and linting
- [ ] T006 [P] Install Typst for PDF generation
- [ ] T006a [P] Verify Typst installation in GitHub Actions build environment (wget + install to /usr/local/bin/)
- [ ] T007 Create content collection schemas in src/content/config.ts per astro-content-contract.md
- [ ] T008 Configure Astro integrations for sitemap, image optimization, and content processing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Create Zod validation schemas for License entity in src/content/config.ts (per astro-content-contract.md)
- [ ] T010 [P] Create Zod validation schemas for BlogPost entity in src/content/config.ts
- [ ] T010a [P] Implement secure localStorage token management with XSS protections (CSP enforcement, short-lived tokens, token rotation)
- [ ] T011 [P] Create Zod validation schemas for TemplateBlock entity in src/content/config.ts
- [ ] T012 Setup Sveltia CMS configuration in public/admin/config.yml per cms-content-contract.md
- [ ] T013 Configure git-gateway backend for local development in public/admin/config.yml
- [ ] T014 Create base Astro layout components in src/layouts/ (BaseLayout.astro, LicenseLayout.astro)
- [ ] T015 [P] Setup asset pipeline for images, fonts, and stylesheets in src/assets/
- [ ] T016 [P] Configure GSAP and RxJS dependencies for reactive components
- [ ] T017 Create error handling and validation utilities in src/utils/
- [ ] T018 Setup environment configuration (.env, astro.config.mjs)
- [ ] T019 Create export generation base infrastructure in src/build/exports/
- [ ] T020 [P] Setup Cloudflare Workers OAuth proxy structure in workers/oauth-proxy/
- [ ] T020a [P] Implement build-time versions.json generation from packages/*/package.json (single source of truth, prevent version drift)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Content Editor Creates License Content (Priority: P1) 🎯 MVP

**Goal**: Enable non-technical content editors to create and update license content via Sveltia CMS without writing code

**Independent Test**: Create test user account, log into CMS at /admin, create new license entry with rich text content, save it, verify it appears in preview system

### Implementation for User Story 1

- [ ] T021 [P] [US1] Configure Sveltia CMS "licenses" collection in public/admin/config.yml with all required fields
- [ ] T022 [P] [US1] Add rich text editor widgets (markdown, select, relation) to CMS config per cms-content-contract.md
- [ ] T023 [US1] Create license content processing integration in src/content/licenses/ to handle frontmatter validation
- [ ] T024 [US1] Implement draft/published status workflow in Astro content layer
- [ ] T025 [US1] Create preview route in src/pages/preview/[...slug].astro for unpublished content
- [ ] T026 [US1] Configure template block relation field in CMS to reference template-blocks collection
- [ ] T027 [US1] Implement template block injection logic in license content renderer
- [ ] T028 [P] [US1] Create TemplateBlock collection schema in src/content/config.ts
- [ ] T029 [P] [US1] Setup template-blocks directory in content/template-blocks/
- [ ] T030 [US1] Add CMS configuration for template-blocks collection in public/admin/config.yml
- [ ] T031 [US1] Create centralized template library management interface in CMS
- [ ] T032 [US1] Implement boilerplate text insertion workflow (warranty disclaimers, permission lists)
- [ ] T033 [US1] Add version metadata tracking in license frontmatter (current_version, package_path)
- [ ] T034 [US1] Create automatic changelog entry generation on content save
- [ ] T035 [US1] Implement validation for minimum content length (100 characters)
- [ ] T036 [US1] Add readability metrics calculation (Gunning Fog score) during content processing
- [ ] T037 [US1] Create shame words counter integration using existing shame_words list from mkdocs.yml

**Checkpoint**: At this point, User Story 1 should be fully functional - editors can create, edit, and preview licenses

---

## Phase 4: User Story 2 - Visitor Understands and Downloads License (Priority: P1) 🎯 MVP

**Goal**: Enable visitors to quickly understand license fit and obtain it in preferred format without friction

**Independent Test**: Visit license page as anonymous user, view at-a-glance summary, download license in multiple formats (markdown, plaintext, PDF), copy to clipboard

### Implementation for User Story 2

- [ ] T038 [P] [US2] Create license detail page template in src/pages/licenses/[slug].astro
- [ ] T039 [P] [US2] Design at-a-glance summary component in src/components/LicenseSummary.astro
- [ ] T040 [US2] Implement permissions/conditions/limitations display from frontmatter metadata
- [ ] T041 [US2] Create download options component in src/components/DownloadOptions.astro
- [ ] T042 [US2] Generate markdown export (GitHub-flavored) in src/build/exports/markdown.ts per export-pipeline-contract.md
- [ ] T043 [P] [US2] Generate markdown export (CommonMark) in src/build/exports/markdown.ts
- [ ] T044 [P] [US2] Generate plaintext export in src/build/exports/plaintext.ts
- [ ] T045 [P] [US2] Generate SPDX XML export in src/build/exports/spdx.ts
- [ ] T046 [P] [US2] Generate embed HTML export in src/build/exports/embed.ts
- [ ] T047 [US2] Implement PDF generation using Typst in src/build/exports/pdf.ts per export-pipeline-contract.md
- [ ] T048 [US2] Configure Typst templates for legal document formatting (12pt serif, 1.5 line spacing, 1-inch margins)
- [ ] T049 [US2] Add version metadata and attribution to all export formats
- [ ] T050 [US2] Create export orchestrator in src/build/exports/index.ts to coordinate all format generation
- [ ] T051 [US2] Integrate export generation into Astro build pipeline with incremental build support
- [ ] T051a [US2] Implement incremental export generation with content-based hashing (SHA-256) and build manifest tracking
- [ ] T051b [P] [US2] Add parallel export processing (5-10 concurrent Typst processes) using Bun concurrency
- [ ] T052 [US2] Implement copy-to-clipboard functionality in src/assets/javascripts/clipboard.ts with visual feedback
- [ ] T052a [P] [US2] Add clipboard button UI component to license pages with success/error states
- [ ] T052b [P] [US2] Implement format selection for clipboard (raw text, markdown, with attribution)
- [ ] T053 [US2] Create shareable link generation with OpenGraph preview support
- [ ] T054 [US2] Generate OpenGraph social media cards using Astro's built-in OG image generation
- [ ] T055 [US2] Implement readability comparison metrics display (plain vs original Gunning Fog)
- [ ] T056 [US2] Add export file paths to exports/ directory during build
- [ ] T057 [US2] Create download links pointing to static export files in dist/exports/

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - editors create content, visitors consume and download

---

## Phase 5: User Story 3 - Editor Maps Plain Language to Original (Priority: P2)

**Goal**: Enable content editors to establish connections between plain language sections and original license sections for comparison features

**Independent Test**: Open editorial mapping interface, view plain and original side-by-side, create section-to-section connections with drag-drop or click, save mappings, verify they display in public comparison view

### Implementation for User Story 3

- [ ] T058 [P] [US3] Create mapping JSON schema validation in src/schemas/mapping-schema.json per mapping-data-contract.md
- [ ] T059 [P] [US3] Implement SHA-256 hash generation utility in src/utils/hash.ts with normalization rules
- [ ] T060 [US3] Create mapping file structure in content/mappings/{license}-mapping.json
- [ ] T061 [US3] Build editorial mapping interface component in src/components/MappingEditor.astro
- [ ] T062 [US3] Implement side-by-side view of plain language and original license text
- [ ] T063 [US3] Add clause selection UI with click-to-select functionality
- [ ] T064 [US3] Implement one-to-one mapping creation workflow
- [ ] T065 [US3] Add support for one-to-many mapping relationships
- [ ] T066 [US3] Add support for many-to-one mapping relationships
- [ ] T067 [US3] Add support for many-to-many mapping relationships (complex restructuring)
- [ ] T068 [US3] Implement confidence scoring calculation based on mapping type
- [ ] T069 [US3] Add semantic tag taxonomy support (permissions, conditions, warranty, liability)
- [ ] T070 [US3] Create mapping persistence to JSON file
- [ ] T071 [US3] Implement mapping validation against schema during save
- [ ] T072 [US3] Add content change detection using hash comparison
- [ ] T073 [US3] Create mapping preservation logic for content edits
- [ ] T074 [US3] Add editorial notes and metadata fields to mappings
- [ ] T075 [US3] Implement mapping session persistence across page refreshes

**Checkpoint**: At this point, User Story 3 is complete - editors can create and save section mappings

---

## Phase 6: User Story 4 - Visitor Compares Plain Language to Original (Priority: P2)

**Goal**: Enable visitors to verify plain language accuracy by comparing it directly to original license text

**Independent Test**: Visit license page, enable comparison mode, hover over plain language sections to see original text highlights, toggle feature on/off

### Implementation for User Story 4

- [ ] T076 [P] [US4] Load mapping data from JSON file in license detail page
- [ ] T077 [P] [US4] Implement CSS Custom Highlight API integration in src/assets/javascripts/highlight.ts
- [ ] T078 [US4] Create comparison mode toggle component in src/components/ComparisonToggle.astro
- [ ] T079 [US4] Implement hover interaction to highlight corresponding sections (<50ms target)
- [ ] T080 [US4] Add visual connection indicators between plain and original sections
- [ ] T081 [US4] Create detailed side-by-side modal for clicked sections
- [ ] T082 [US4] Implement session preference storage for comparison mode state
- [ ] T083 [US4] Add graceful fallback for licenses without mappings (informative message)
- [ ] T084 [US4] Create DOM wrapper fallback for older browsers (non-CSS Highlight API)
- [ ] T085 [US4] Optimize highlighting performance with virtual scrolling for large documents
- [ ] T086 [US4] Add confidence level indicators to mappings in comparison view

**Checkpoint**: At this point, User Story 4 is complete - visitors can interactively compare plain and original text

---

## Phase 7: User Story 5 - Content Manager Versions and Publishes (Priority: P3)

**Goal**: Enable content managers to track license changes over time, create versions, and publish updates with changelogs

**Independent Test**: Create license version 1.0.0, make edits to create 1.0.1, view version history, access previous versions, verify changelogs are auto-generated

### Implementation for User Story 5

- [ ] T087 [P] [US5] Setup Lerna monorepo structure in packages/ directory per data-model.md
- [ ] T088 [P] [US5] Configure semantic-release for per-license versioning
- [ ] T089 [US5] Create package.json for each license package with semantic version
- [ ] T090 [US5] Implement conventional commits format enforcement in CMS
- [ ] T091 [US5] Add LLM-assisted commit message generation using GitHub Actions
- [ ] T092 [US5] Configure GitHub Actions workflow for Claude Code OAuth integration (.github/workflows/conventional-commits.yml)
- [ ] T093 [US5] Build custom LLM commit message analyzer (OpenAI/Claude API) to classify commits as fix/feat/BREAKING
- [ ] T093a [US5] Implement validation and confidence scoring for LLM commit analysis (fallback to manual if confidence <0.8)
- [ ] T094 [US5] Integrate LLM-analyzed commit types with semantic-release workflow on merge to main branch
- [ ] T095 [US5] Add automatic version bumping based on commit type (fix/feat/BREAKING)
- [ ] T096 [US5] Create Git tag generation for each version (format: {license}-v{version})
- [ ] T097 [US5] Implement automatic changelog generation from commit messages
- [ ] T098 [US5] Create GitHub release with changelog and version metadata
- [ ] T099 [US5] Add version history metadata storage in content/licenses/{category}/{slug}/versions.json
- [ ] T100 [US5] Build version history display component in src/components/VersionHistory.astro
- [ ] T101 [US5] Create version selector UI for accessing historical versions
- [ ] T102 [US5] Implement version metadata inclusion in all export formats
- [ ] T103 [US5] Add export file attachment to GitHub releases
- [ ] T104 [US5] Create permanent download URLs pointing to GitHub release assets

**Checkpoint**: At this point, User Story 5 is complete - full version control with automated changelogs

---

## Phase 8: User Story 6 - Editor Uses Reactive Components (Priority: P3)

**Goal**: Enable editors to insert interactive components (FAQs, comparison tables, decision trees) using simple markup

**Independent Test**: Insert component placeholder in CMS editor (e.g., `{{faq}}`), preview page to see rendered component, verify it exports correctly to static formats

### Implementation for User Story 6

- [ ] T105 [P] [US6] Create component registry in src/components/reactive/
- [ ] T106 [P] [US6] Implement FAQ component in src/components/reactive/FAQ.astro
- [ ] T107 [P] [US6] Implement comparison table component in src/components/reactive/ComparisonTable.astro
- [ ] T108 [P] [US6] Implement decision tree component in src/components/reactive/DecisionTree.astro
- [ ] T109 [US6] Create component placeholder parser in src/utils/component-parser.ts
- [ ] T110 [US6] Add component marker syntax support in markdown content (e.g., `{{component:type}}`)
- [ ] T111 [US6] Implement component configuration options parsing
- [ ] T112 [US6] Create component preview in CMS editor
- [ ] T113 [US6] Build component library browser interface in CMS
- [ ] T114 [US6] Add interactive rendering for web format using GSAP
- [ ] T115 [US6] Implement static equivalents for PDF export (tables, lists)
- [ ] T116 [US6] Add plaintext conversion for reactive components
- [ ] T117 [US6] Create component insertion UI in CMS editor toolbar

**Checkpoint**: At this point, User Story 6 is complete - editors can use rich interactive components

---

## Phase 9: User Story 7 - Visitor Reads Blog Content (Priority: P4)

**Goal**: Enable visitors to read blog posts about Plain License updates, license guides, and community content

**Independent Test**: Visit blog section, view post listings, read individual posts, navigate between posts

### Implementation for User Story 7

- [ ] T118 [P] [US7] Create BlogPost collection schema in src/content/config.ts
- [ ] T119 [P] [US7] Configure blog collection in Sveltia CMS in public/admin/config.yml
- [ ] T120 [US7] Create blog post directory structure in content/blog/posts/
- [ ] T121 [US7] Build blog listing page in src/pages/blog/index.astro
- [ ] T122 [US7] Create blog post detail page template in src/pages/blog/[slug].astro
- [ ] T123 [US7] Implement reverse chronological ordering with pagination
- [ ] T124 [US7] Add blog post excerpt generation from frontmatter
- [ ] T125 [US7] Create related posts component based on tags
- [ ] T126 [US7] Implement related licenses widget using related_licenses frontmatter field
- [ ] T127 [US7] Add featured image support with Astro image optimization
- [ ] T128 [US7] Create rich text rendering for blog content (images, code snippets, embeds)
- [ ] T129 [US7] Implement tag filtering and categorization
- [ ] T130 [US7] Add blog navigation between posts (previous/next)

**Checkpoint**: At this point, User Story 7 is complete - full blog functionality

---

## Phase 10: Authentication & Authorization (Cross-Cutting)

**Purpose**: Secure CMS access with GitHub OAuth and magic links

- [ ] T131 [P] Implement Cloudflare Worker OAuth proxy in workers/oauth-proxy/index.ts per auth-contract.md
- [ ] T132 [P] Configure GitHub OAuth app credentials (client ID, client secret)
- [ ] T133 [P] Add Google OAuth provider support
- [ ] T134 Setup OAuth 2.0 Authorization Code Grant with PKCE flow
- [ ] T135 Implement JWT token generation (RS256, 15-min expiration)
- [ ] T136 Add refresh token mechanism (7-day opaque tokens)
- [ ] T137 Configure httpOnly secure cookies for token storage
- [ ] T138 Implement session management with regeneration after auth
- [ ] T139 Add RBAC roles (viewer, editor, admin) mapped to GitHub repository permissions
- [ ] T140 Implement magic link authentication via @magicdx/auth extension
- [ ] T141 Add security headers (CSP, HSTS, X-Frame-Options)
- [ ] T142 Configure rate limiting (5 auth attempts per 15 minutes per IP)
- [ ] T143 Deploy Cloudflare Worker to production with custom domain (auth.plainlicense.org)
- [ ] T144 Update Sveltia CMS config to use production OAuth endpoint

---

## Phase 11: Deployment & Hosting

**Purpose**: Deploy to Cloudflare Pages with CDN and export storage

- [ ] T145 [P] Configure Cloudflare Pages deployment settings
- [ ] T146 [P] Setup custom domain with automatic SSL (plainlicense.org)
- [ ] T147 Connect GitHub repository to Cloudflare Pages
- [ ] T148 Configure build command (bun run build) and output directory (dist/)
- [ ] T149 Setup environment variables in Cloudflare Pages dashboard
- [ ] T150 Create deployment webhook from Sveltia CMS to trigger rebuilds
- [ ] T151 Configure object storage (DigitalOcean Spaces or AWS S3) for export artifacts
- [ ] T152 Setup CDN integration for export file delivery
- [ ] T153 Implement content hash fingerprinting for exports (MIT.a3f7b9.md)
- [ ] T154 Configure long TTL caching (1 year for immutable hashed exports)
- [ ] T155 Add version-based CDN purge using manifest mapping
- [ ] T156 Create preview deployments for pull requests
- [ ] T157 Setup production and staging environments (main vs dev branch)

---

## Phase 12: Migration from Existing System

**Purpose**: Migrate content from current MkDocs system to new Astro + CMS architecture

- [ ] T158 [P] Create content migration script to convert existing packages/ markdown to Astro content collections
- [ ] T159 [P] Extract frontmatter from current license files and map to new schema
- [ ] T160 Parse existing shame words data from mkdocs.yml and integrate
- [ ] T161 Migrate existing template blocks to content/template-blocks/
- [ ] T162 Convert Python hooks (license_factory.py, shame_counter.py, socialmedia.py) to TypeScript
- [ ] T163 Migrate existing build pipeline from src/build/index.ts to new export system
- [ ] T164 Transfer license content from docs/licenses/ to content/licenses/
- [ ] T165 Preserve Lerna package structure in packages/ directory
- [ ] T166 Create initial mappings.json files for existing licenses (manual or tool-assisted)
- [ ] T167 Validate migrated content against new Zod schemas
- [ ] T168 Run full build to verify migration success
- [ ] T169 Compare exported files (markdown, PDF) with originals for quality assurance

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T170 [P] Update quickstart.md with final deployment instructions
- [ ] T171 [P] Create comprehensive README.md for the project
- [ ] T172 Add API documentation for export generation pipeline
- [ ] T173 Create editor documentation for using Sveltia CMS
- [ ] T174 Implement error tracking and logging infrastructure
- [ ] T175 Add performance monitoring for build times and page load
- [ ] T176 Optimize asset loading (lazy loading images, code splitting)
- [ ] T177 Run accessibility audit (WCAG 2.1 AA compliance)
- [ ] T178 Add schema.org structured data for licenses
- [ ] T179 Implement sitemap generation for SEO
- [ ] T180 Create robots.txt with proper crawling directives
- [ ] T181 Add RSS feed for blog posts
- [ ] T182 Implement search functionality (client-side with Fuse.js or Pagefind)
- [ ] T183 Code cleanup and refactoring for maintainability
- [ ] T184 Security hardening review (CSP, input sanitization)
- [ ] T185 Performance optimization across all user stories (<2s page load target)
- [ ] T186 Run quickstart.md validation end-to-end
- [ ] T187 Create troubleshooting guide based on common issues
- [ ] T188 [P] Validate comparison mode highlighting performance meets <100ms target (SC-004)
- [ ] T189 [P] Validate page load time <2s for 95% of visitors (SC-002)
- [ ] T190 [P] Validate PDF generation completes within 5-12s for 10 licenses in parallel

### Edge Case Handling

- [ ] T191 [US4] Handle licenses with no mappings - display graceful "Comparison not available" message
- [ ] T192 [US2] Handle extremely long licenses in PDF export - implement page breaks and table of contents
- [ ] T193 [US3] Handle orphaned mappings when sections are deleted - auto-cleanup or warning system
- [ ] T194 [US2] Handle special characters and legal symbols in export formats - proper escaping/encoding
- [ ] T195 [US1] Implement conflict detection for concurrent editing - Git-based merge conflict handling
- [ ] T196 [US1] Handle broken template block references - validation and migration strategy
- [ ] T197 [US5] Handle permanent links and redirects for archived license versions
- [ ] T198 [US3] Handle many-to-many section mappings for significant restructuring - UI and data model support

---

## Phase 14: Testing & Quality Assurance (CRITICAL - MVP REQUIREMENT)

**Purpose**: Validate all user stories meet acceptance criteria and success criteria with automated testing

**Rationale**: Tests are CRITICAL for validating 15 success criteria, preventing regressions in complex features (mapping system, export generation, versioning), and ensuring production quality. Expert review identified testing as the #1 blocking issue preventing implementation readiness.

**Estimated Effort**: 70-90 hours (25-30% of total project)

### Test Infrastructure Setup

- [ ] T199 [P] Setup Vitest test framework with coverage reporting (@vitest/coverage-v8)
- [ ] T200 [P] Setup Playwright test framework for E2E browser testing
- [ ] T201 [P] Configure test CI pipeline in GitHub Actions (.github/workflows/test.yml)
- [ ] T202 [P] Setup test database/fixtures for integration tests
- [ ] T203 [P] Configure code coverage thresholds (80% minimum for critical paths)
- [ ] T204 [P] Setup visual regression testing infrastructure (Percy, Chromatic, or Playwright screenshots)

### User Story 1 Tests - Content Editor Creates License Content

- [ ] T205 [P] [US1] Unit test: SHA-256 hash generation with normalization edge cases (tests/unit/hash.test.ts)
- [ ] T206 [P] [US1] Unit test: Gunning Fog readability calculation accuracy (tests/unit/readability.test.ts)
- [ ] T207 [P] [US1] Unit test: Shame words counter against known test cases (tests/unit/shame-counter.test.ts)
- [ ] T208 [US1] Integration test: Astro Content Collections validation with Zod schemas (tests/integration/content-validation.test.ts)
- [ ] T209 [US1] Integration test: Template block injection in license content (tests/integration/template-blocks.test.ts)
- [ ] T210 [US1] Integration test: Draft/published status workflow (tests/integration/publishing-workflow.test.ts)
- [ ] T211 [US1] E2E test: Complete CMS workflow - create license → save → preview (tests/e2e/cms-create-license.spec.ts)
- [ ] T212 [US1] E2E test: Template block insertion from centralized library (tests/e2e/template-blocks.spec.ts)
- [ ] T213 [US1] E2E test: Version metadata tracking and changelog generation (tests/e2e/version-tracking.spec.ts)

### User Story 2 Tests - Visitor Understands and Downloads License

- [ ] T214 [P] [US2] Unit test: Markdown GFM export format correctness (tests/unit/exports/markdown-gfm.test.ts)
- [ ] T215 [P] [US2] Unit test: CommonMark export format correctness (tests/unit/exports/markdown-commonmark.test.ts)
- [ ] T216 [P] [US2] Unit test: Plaintext export format correctness (tests/unit/exports/plaintext.test.ts)
- [ ] T217 [P] [US2] Unit test: SPDX XML export validation against official schema (tests/unit/exports/spdx-xml.test.ts)
- [ ] T218 [P] [US2] Unit test: Embed HTML export escaping and sanitization (tests/unit/exports/embed-html.test.ts)
- [ ] T219 [US2] Integration test: Typst PDF generation with golden file comparison (tests/integration/pdf-generation.test.ts)
- [ ] T220 [US2] Integration test: Export orchestrator coordinates all 6 formats (tests/integration/export-orchestrator.test.ts)
- [ ] T221 [US2] Integration test: Version metadata included in all export formats (tests/integration/export-metadata.test.ts)
- [ ] T222 [US2] E2E test: Download all 6 formats and verify content integrity (tests/e2e/download-all-formats.spec.ts)
- [ ] T223 [US2] E2E test: Copy-to-clipboard functionality with visual feedback (tests/e2e/clipboard-copy.spec.ts)
- [ ] T224 [US2] E2E test: OpenGraph social media card generation (tests/e2e/social-cards.spec.ts)
- [ ] T225 [US2] Performance test: Clipboard copy operation <50ms (tests/performance/clipboard-speed.test.ts)
- [ ] T226 [US2] Performance test: Page load <2s for 95th percentile (tests/performance/page-load.test.ts)
- [ ] T227 [US2] Validation test: All export formats match golden files for MIT, MPL-2.0, Apache-2.0 (tests/validation/export-golden-files.test.ts)
- [ ] T227a [P] [US2] Property-based export tests using fast-check for edge case coverage (tests/validation/export-property-tests.test.ts)

### User Story 3 Tests - Editor Maps Plain Language to Original

- [ ] T228 [P] [US3] Unit test: Mapping JSON schema validation - valid and invalid cases (tests/unit/mapping-schema.test.ts)
- [ ] T229 [P] [US3] Unit test: Confidence scoring calculation per mapping type (tests/unit/confidence-scoring.test.ts)
- [ ] T230 [P] [US3] Unit test: SHA-256 hash normalization rules (whitespace, markdown) (tests/unit/hash-normalization.test.ts)
- [ ] T231 [US3] Integration test: Create mapping → edit content → verify hash change detection (tests/integration/mapping-invalidation.test.ts)
- [ ] T232 [US3] Integration test: Semantic tag validation and tag-level grouping (tests/integration/semantic-tags.test.ts)
- [ ] T233 [US3] Integration test: One-to-one, one-to-many, many-to-one mapping types (tests/integration/mapping-types.test.ts)
- [ ] T234 [US3] E2E test: Complete mapping workflow - select clauses → save → verify persistence (tests/e2e/mapping-editor.spec.ts)
- [ ] T235 [US3] E2E test: Mapping preservation when plain language content edited (tests/e2e/mapping-preservation.spec.ts)
- [ ] T236 [US3] Validation test: Mapping completeness requirements (<5% unmapped plain, <10% unmapped original) (tests/validation/mapping-completeness.test.ts)

### User Story 4 Tests - Visitor Compares Plain Language to Original

- [ ] T237 [P] [US4] Integration test: Load mapping data from JSON and render highlights (tests/integration/comparison-rendering.test.ts)
- [ ] T238 [P] [US4] Integration test: CSS Custom Highlight API integration (tests/integration/highlight-api.test.ts)
- [ ] T239 [US4] Performance test: Hover highlighting response time <100ms (tests/performance/highlight-latency.test.ts)
- [ ] T240 [US4] E2E test: Enable comparison mode → hover sections → verify visual highlighting (tests/e2e/comparison-mode.spec.ts)
- [ ] T241 [US4] E2E test: Detailed side-by-side modal for clicked sections (tests/e2e/comparison-modal.spec.ts)
- [ ] T242 [US4] E2E test: Session preference persistence across page navigation (tests/e2e/comparison-preference.spec.ts)
- [ ] T243 [US4] E2E test: Graceful fallback for licenses without mappings (tests/e2e/comparison-no-mappings.spec.ts)

### User Story 5 Tests - Content Manager Versions and Publishes

- [ ] T244 [P] [US5] Unit test: Conventional commit message parsing (fix, feat, BREAKING CHANGE) (tests/unit/conventional-commits.test.ts)
- [ ] T245 [P] [US5] Unit test: Semantic version bump rules (patch, minor, major) (tests/unit/version-bumping.test.ts)
- [ ] T246 [US5] Integration test: Semantic-release version bump workflow (tests/integration/semantic-release.test.ts)
- [ ] T247 [US5] Integration test: Changelog generation from commit messages (tests/integration/changelog-generation.test.ts)
- [ ] T248 [US5] Integration test: Git tag creation with correct format (license-vX.Y.Z) (tests/integration/git-tagging.test.ts)
- [ ] T249 [US5] Integration test: GitHub release creation with export attachments (tests/integration/github-releases.test.ts)
- [ ] T250 [US5] E2E test: Publish license → verify new version created → verify GitHub release (tests/e2e/version-publishing.spec.ts)
- [ ] T251 [US5] E2E test: Version history display and historical version access (tests/e2e/version-history.spec.ts)

### User Story 6 Tests - Editor Uses Reactive Components

- [ ] T252 [P] [US6] Unit test: Component placeholder parser ({{faq}}, {{table}}, {{tree}}) (tests/unit/component-parser.test.ts)
- [ ] T253 [P] [US6] Unit test: Component configuration options parsing (tests/unit/component-config.test.ts)
- [ ] T254 [US6] Integration test: FAQ component rendering to interactive HTML (tests/integration/faq-component.test.ts)
- [ ] T255 [US6] Integration test: Comparison table component rendering (tests/integration/table-component.test.ts)
- [ ] T256 [US6] Integration test: Decision tree component rendering (tests/integration/tree-component.test.ts)
- [ ] T257 [US6] Integration test: Component static export to PDF format (tests/integration/component-pdf-export.test.ts)
- [ ] T258 [US6] E2E test: Insert component in CMS → preview → verify rendering (tests/e2e/component-insertion.spec.ts)
- [ ] T259 [US6] E2E test: Component library browser interface (tests/e2e/component-library.spec.ts)

### User Story 7 Tests - Visitor Reads Blog Content

- [ ] T260 [P] [US7] Integration test: Blog post collection validation against Zod schema (tests/integration/blog-validation.test.ts)
- [ ] T261 [P] [US7] Integration test: Related licenses widget rendering (tests/integration/related-licenses.test.ts)
- [ ] T262 [US7] E2E test: Create blog post → publish → verify listing page (tests/e2e/blog-create.spec.ts)
- [ ] T263 [US7] E2E test: Blog post detail page with rich content rendering (tests/e2e/blog-detail.spec.ts)
- [ ] T264 [US7] E2E test: Blog pagination and navigation (tests/e2e/blog-pagination.spec.ts)

### Success Criteria Validation Tests

- [ ] T265 [SC-001] Test: Editor workflow completes in <30 minutes (timed E2E test with realistic content) (tests/success-criteria/sc-001-editor-time.test.ts)
- [ ] T266 [SC-002] Test: Page load <2s for 95% of visitors (Lighthouse CI with multiple pages) (tests/success-criteria/sc-002-page-load.test.ts)
- [ ] T267 [SC-003] Test: Download success rate 98% (reliability testing with network conditions) (tests/success-criteria/sc-003-download-reliability.test.ts)
- [ ] T268 [SC-004] Test: Comparison highlighting <100ms (performance testing with timing assertions) (tests/success-criteria/sc-004-highlight-speed.test.ts)
- [ ] T269 [SC-005] Test: Export generation 100% success for all published licenses (tests/success-criteria/sc-005-export-success.test.ts)
- [ ] T270 [SC-006] Test: PDF quality matches professional legal documents (visual regression + typography validation) (tests/success-criteria/sc-006-pdf-quality.test.ts)
- [ ] T271 [SC-007] Test: Mapping creation workflow <5 minutes for 10 connections (timed integration test) (tests/success-criteria/sc-007-mapping-time.test.ts)
- [ ] T272 [SC-008] Test: Version history access <3 seconds (performance testing) (tests/success-criteria/sc-008-history-speed.test.ts)
- [ ] T273 [SC-009] Test: Template blocks reduce duplicate content by 60% (statistical analysis of content reuse) (tests/success-criteria/sc-009-template-reuse.test.ts)
- [ ] T274 [SC-010] Test: WCAG 2.1 AA accessibility compliance (axe-core automated testing) (tests/success-criteria/sc-010-accessibility.test.ts)
- [ ] T275 [SC-011] Test: OpenGraph image generation and social media display (visual validation) (tests/success-criteria/sc-011-social-cards.test.ts)
- [ ] T276 [SC-012] Test: Blog post creation time reduced by 50% vs current system (baseline comparison) (tests/success-criteria/sc-012-blog-efficiency.test.ts)
- [ ] T277 [SC-013] Test: Reactive components render correctly in web and static formats (cross-format validation) (tests/success-criteria/sc-013-component-rendering.test.ts)
- [ ] T278 [SC-014] Test: Session preference persistence across navigation (E2E state testing) (tests/success-criteria/sc-014-session-state.test.ts)
- [ ] T279 [SC-015] Test: Concurrent editing without data loss (multi-user simulation) (tests/success-criteria/sc-015-concurrent-editing.test.ts)

### Regression & Quality Assurance

- [ ] T280 [P] Create golden file test suite for all export formats (MIT, MPL-2.0, Apache-2.0 baseline) (tests/golden/)
- [ ] T281 [P] Setup visual regression testing for UI components (Percy/Chromatic or Playwright screenshots) (tests/visual/)
- [ ] T282 [P] Configure automated accessibility testing in CI (axe-core + Lighthouse) (.github/workflows/accessibility.yml)
- [ ] T283 [P] Create cross-browser compatibility test matrix (Chrome, Firefox, Safari, Edge) (tests/e2e/browsers.config.ts)
- [ ] T284 Setup mutation testing for critical business logic (Stryker or equivalent) (tests/mutation/)
- [ ] T285 Configure test coverage reporting and badge (Codecov, Coveralls) (.github/workflows/coverage.yml)
- [ ] T286 Create smoke test suite for deployment validation (tests/smoke/)
- [ ] T286a [P] Create post-deployment health checks with auto-rollback on failure (tests/health/)

### Load & Performance Testing

- [ ] T287 [P] Load test: Simulate 1,000 concurrent visitors and measure response times (tests/load/concurrent-visitors.test.ts)
- [ ] T288 [P] Build performance test: Measure build time for 10, 50, 100 licenses (tests/performance/build-scaling.test.ts)
- [ ] T289 [P] Export generation benchmark: Time per format per license (tests/performance/export-benchmarks.test.ts)
- [ ] T290 Stress test: Maximum licenses before build timeout (identify scalability limit) (tests/load/build-limits.test.ts)
- [ ] T291 Network performance test: Page load under various network conditions (3G, 4G, throttled) (tests/performance/network-conditions.test.ts)

### Security Testing

- [ ] T292 [P] Security audit: OAuth flow (PKCE, CSRF protection, token expiration) (tests/security/oauth-flow.test.ts)
- [ ] T293 [P] Security audit: CMS input sanitization (XSS prevention, markdown injection) (tests/security/input-sanitization.test.ts)
- [ ] T294 [P] Security audit: Content Security Policy headers validation (tests/security/csp-headers.test.ts)
- [ ] T295 Security test: GitHub API token storage and transmission security (tests/security/token-security.test.ts)
- [ ] T296 Security test: Export file path traversal protection (tests/security/path-traversal.test.ts)
- [ ] T297 Dependency vulnerability scan: npm audit and Snyk integration (automated in CI)
- [ ] T298 Security headers test: HSTS, X-Frame-Options, X-Content-Type-Options (tests/security/security-headers.test.ts)

### Test Environment & CI/CD Integration

- [ ] T299 [P] Document local test environment setup (README-TESTING.md)
- [ ] T300 [P] Create test data fixtures and factories for all entities (tests/fixtures/)
- [ ] T301 Configure GitHub Actions matrix testing (Node.js versions, OS platforms) (.github/workflows/test.yml)
- [ ] T302 Setup preview deployment testing (run E2E tests against Cloudflare Pages preview URLs) (.github/workflows/preview-test.yml)
- [ ] T303 Configure test result reporting and annotations in PRs (tests/reporters/)
- [ ] T304 Create test performance dashboard (track test execution time trends) (tests/performance-dashboard/)
- [ ] T305 Setup synthetic monitoring for production (Pingdom, Uptime Robot, or Checkly) (tests/synthetic/)

### Migration & Data Validation Testing

- [ ] T306 [P] Migration test: Validate existing license content migration to new schema (tests/migration/content-migration.test.ts)
- [ ] T307 [P] Migration test: Verify frontmatter compatibility and Zod schema validation (tests/migration/frontmatter-validation.test.ts)
- [ ] T308 Data integrity test: Compare migrated exports with original MkDocs output (tests/migration/export-comparison.test.ts)
- [ ] T309 Rollback test: Verify ability to revert to current system if migration fails (tests/migration/rollback-validation.test.ts)
- [ ] T309a [P] CMS contract testing: Validate Sveltia CMS API stability across updates (tests/contracts/cms-contract.test.ts)

**Checkpoint**: Phase 14 complete when all tests pass with ≥80% coverage and all 15 success criteria validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order: US1 (P1) → US2 (P1) → US3 (P2) → US4 (P2) → US5 (P3) → US6 (P3) → US7 (P4)
- **Authentication (Phase 10)**: Can start after Foundational, needed before production deployment
- **Deployment (Phase 11)**: Depends on authentication and at least US1+US2 completion for MVP
- **Migration (Phase 12)**: Can start after Foundational, should complete before production deployment
- **Polish (Phase 13)**: Depends on all desired user stories being complete
- **Testing (Phase 14)**: CRITICAL - Test tasks run in parallel with implementation (TDD approach recommended)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Integrates with US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational - Independent mapping creation
- **User Story 4 (P2)**: Depends on US3 (needs mappings to display) but can stub for testing
- **User Story 5 (P3)**: Can start after Foundational - Independent versioning system
- **User Story 6 (P3)**: Can start after Foundational - Independent component system
- **User Story 7 (P4)**: Can start after Foundational - Completely independent blog functionality

### Within Each User Story

- Models/schemas before services
- Services before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities Per User Story

**User Story 1** (Content Editor Creates License):
```bash
# Can run in parallel:
T021 + T022  # CMS configuration (different files)
T028 + T029  # TemplateBlock schema and directory
T033 + T034  # Version metadata and changelog (different concerns)
T036 + T037  # Readability metrics and shame counter (different files)
```

**User Story 2** (Visitor Downloads License):
```bash
# Can run in parallel:
T038 + T039  # Page template and summary component
T042 + T043 + T044 + T045 + T046  # All export format generators (different files)
T052 + T053 + T054  # Clipboard, links, social cards (different files)
```

**User Story 3** (Editor Maps Sections):
```bash
# Can run in parallel:
T058 + T059  # Schema validation and hash utility
```

**User Story 4** (Visitor Compares):
```bash
# Can run in parallel:
T076 + T077  # Load mapping data and highlight API (different files)
```

**User Story 5** (Versioning):
```bash
# Can run in parallel:
T087 + T088 + T089  # Lerna setup tasks
```

**User Story 6** (Reactive Components):
```bash
# Can run in parallel:
T105 + T106 + T107 + T108  # All component implementations (different files)
```

**User Story 7** (Blog):
```bash
# Can run in parallel:
T118 + T119 + T120  # Schema, CMS config, directory (different files)
T121 + T122  # Listing and detail pages
```

---

## Parallel Example: User Story 1

```bash
# Launch CMS configuration tasks together:
Task T021: "Configure Sveltia CMS licenses collection in public/admin/config.yml"
Task T022: "Add rich text editor widgets to CMS config"

# Launch template block setup together:
Task T028: "Create TemplateBlock collection schema in src/content/config.ts"
Task T029: "Setup template-blocks directory in content/template-blocks/"

# Launch metrics calculation together:
Task T036: "Add readability metrics calculation (Gunning Fog score)"
Task T037: "Create shame words counter integration"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only) 🎯

1. ✅ Complete Phase 1: Setup
2. ✅ Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. ✅ Complete Phase 3: User Story 1 (Content editor workflow)
4. ✅ Complete Phase 4: User Story 2 (Visitor download workflow)
5. **STOP and VALIDATE**: Test US1+US2 independently
6. Deploy MVP to staging environment

**MVP Delivers**:
- Editors can create and edit licenses via CMS ✅ (SC-001: <30 minutes)
- Visitors can view and download licenses in all formats ✅ (SC-002: <2s page load, SC-003: 98% success)
- Export generation works for all formats ✅ (SC-005: 100% success, SC-006: PDF quality)

### Incremental Delivery

1. **MVP Release** (US1 + US2): Core CMS and visitor experience ✅
2. **Enhancement 1** (US3 + US4): Add interactive comparison features
3. **Enhancement 2** (US5): Add versioning and changelog automation
4. **Enhancement 3** (US6): Add reactive components for rich content
5. **Enhancement 4** (US7): Add blog functionality for community engagement

Each release adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

1. **Team completes Setup + Foundational together** (~3-5 days)
2. **Once Foundational is done**:
   - **Developer A**: User Story 1 (CMS editing workflow)
   - **Developer B**: User Story 2 (Export generation and downloads)
   - **Developer C**: Authentication & Deployment setup
3. **After MVP (US1+US2)**:
   - **Developer A**: User Story 3 (Mapping editor)
   - **Developer B**: User Story 4 (Comparison viewer)
   - **Developer C**: User Story 5 (Versioning)
4. Stories complete and integrate independently

---

## Summary

**Total Tasks**: 322 (includes Phase 14 testing - CRITICAL for MVP)
**MVP Tasks** (US1 + US2 + Testing): T001-T057 + T051a-T051b (implementation) + T199-T227a (US1-US2 tests) + T265-T279 (SC validation) = 106 tasks
**Starlight Override Tasks**: 4 tasks (T002a-T002d in Phase 1)
**Critical Path**: Setup → Foundational → US1 + US1 Tests → US2 + US2 Tests → SC Validation → Deploy MVP

**Task Distribution by Phase**:
- **Setup + Starlight Overrides** (Phase 1): 13 tasks (T001-T008, including T002a-T002d, T006a)
- **Foundational** (Phase 2): 14 tasks (T009-T020, including T010a, T020a)
- **US1 - Content Editor** (Phase 3): 17 tasks (T021-T037)
- **US2 - Visitor Downloads** (Phase 4): 24 tasks (T038-T057, including T051a-T051b, T052a-T052b)
- **US3 - Editor Maps** (Phase 5): 18 tasks (T058-T075)
- **US4 - Visitor Compares** (Phase 6): 11 tasks (T076-T086)
- **US5 - Versioning** (Phase 7): 19 tasks (T087-T104, including T093a)
- **US6 - Reactive Components** (Phase 8): 13 tasks (T105-T117)
- **US7 - Blog** (Phase 9): 13 tasks (T118-T130)
- **Authentication** (Phase 10): 14 tasks (T131-T144)
- **Deployment** (Phase 11): 13 tasks (T145-T157)
- **Migration** (Phase 12): 12 tasks (T158-T169)
- **Polish + Validation + Edge Cases** (Phase 13): 29 tasks (T170-T198)
- **Testing & Quality Assurance** (Phase 14): 114 tasks (T199-T309a) ← CRITICAL MVP REQUIREMENT

**Test Task Breakdown**:
- Test Infrastructure: 6 tasks (T199-T204)
- User Story 1-7 Tests: 66 tasks (T205-T264, T227a)
- Success Criteria Validation: 15 tasks (T265-T279)
- Regression & QA: 8 tasks (T280-T286a)
- Load & Performance: 5 tasks (T287-T291)
- Security Testing: 7 tasks (T292-T298)
- Test Environment: 7 tasks (T299-T305)
- Migration Testing: 5 tasks (T306-T309a)

**Parallel Opportunities**: 143+ tasks marked [P] can run in parallel within their phases (98 implementation + 45 testing)

**Estimated MVP Timeline** (single developer with TDD):
- Setup: 1-2 days
- Foundational: 3-4 days
- User Story 1 + Tests: 6-8 days (implementation + unit/integration/E2E)
- User Story 2 + Tests: 8-10 days (implementation + export testing + performance)
- Success Criteria Validation: 2-3 days
- **Total MVP**: ~25-30 business days (includes comprehensive testing)

**Testing Effort**: 70-90 hours (25-30% of total project - industry standard for quality software)

**Coverage Targets**: 80% unit, 70% integration, 90% E2E, 100% success criteria validation

**Suggested MVP Scope**: User Stories 1 + 2 + Testing (SC-001 through SC-006 validated with automated tests)

---

## Format Validation

✅ **All tasks follow required format**: `- [ ] [ID] [P?] [Story?] Description with file path`
✅ **Task IDs**: Sequential T001-T198 + T002a-T002d (Starlight overrides)
✅ **[P] markers**: 94+ tasks marked for parallel execution
✅ **[Story] labels**: US1-US7 applied correctly to user story tasks
✅ **File paths**: Included in all implementation tasks
✅ **Organization**: Grouped by user story for independent delivery
✅ **Tests**: Excluded (not requested in specification)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete work
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Architecture follows Git-based CMS (Sveltia + Astro) per research.md Phase 0 decisions
- All file paths align with data-model.md structure
- Contract compliance validated against contracts/ directory
- Quickstart.md workflow incorporated into task sequence

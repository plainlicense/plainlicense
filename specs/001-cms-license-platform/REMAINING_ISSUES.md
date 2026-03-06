# Remaining Issues & Technical Debt: 001-cms-license-platform

This document tracks the gaps, implementation flaws, and incomplete tasks identified during the comprehensive review of the CMS License Platform implementation.

## 1. Architectural & UI Consistency (High Priority)

- [x] **Starlight Component Implementation**: `src/components/overrides/Header.astro`, `Footer.astro`, and `Sidebar.astro` are currently implemented with Plain License branding and custom navigation.
- [x] **CSS Design System**: `src/assets/stylesheets/custom.css` unifies the "Prose" styling between Starlight and custom license pages.
- [x] **Layout Refinement**: `LicenseSummary`, `DownloadOptions`, and `VersionHistory` components use Starlight's design tokens.

## 2. Export Pipeline & Performance (Critical)

- [x] **Incremental Build Support (FR-040)**: SHA-256 hashing and build manifest tracking skip generation for unchanged licenses.
- [x] **Professional PDF Generation (FR-012, SC-006)**: Uses Typst for high-quality, professional PDF exports with proper formatting.
- [x] **Export Format Parity**: SPDX XML, Embed HTML, GFM, and CommonMark formats are all generated successfully.

## 3. Section Mapping System (High Priority)

- [x] **Mapping Editor UI (US3, SC-007)**: Preact-based editor allows visual connection creation between clauses.
- [x] **Mapping Logic Enhancement**: `MappingViewer.ts` handles complex relationships with dynamic SVG connection indicators.
- [x] **Mapping Storage**: Mappings are stored as JSON and validated against the schema.

## 4. Content Logic & CMS (Medium Priority)

- [x] **Template Blocks (FR-003)**: Dynamic injection of reusable blocks (like warranties) into licenses and exports.
- [x] **Readability Tools**: Automated Gunning Fog and shame word counting integrated into the platform.
- [x] **Draft/Published Workflow**: Frontmatter `status` field respects production vs. development visibility.

## 5. Versioning & Automation (Medium Priority)

- [x] **Automated Versions JSON**: Build script generates version manifests from metadata.
- [x] **Historical Access (FR-022)**: Visitors can view and download all past versions of licenses.

## 6. Authentication & Infrastructure (Medium Priority)

- [x] **OAuth Proxy Implementation**: Secure Cloudflare Worker handles JWT session management and rotation.
- [x] **Security Hardening (FR-046-048)**: Strict CSP defined and applied; short-lived tokens implemented.

## 7. Testing & Quality Assurance (Highest Priority for MVP)

- [x] **Integration Test Suite**: Complete coverage for content validation, export coordination, and block injection.
- [x] **Success Criteria Validation (SC-001 - SC-015)**: 100% of defined success criteria are verified by automated Vitest or Playwright tests.
    - [x] SC-001: Plain language version
    - [x] SC-002: Performance (LCP < 2s)
    - [x] SC-003: Download reliability
    - [x] SC-004: Interaction latency (< 100ms)
    - [x] SC-005: Export generation success
    - [x] SC-006: Professional PDF
    - [x] SC-007: Section Mapping
    - [x] SC-008: History access
    - [x] SC-009: Template Block System
    - [x] SC-010: Accessibility (WCAG 2.1 AA)
    - [x] SC-011: OG Image generation
    - [x] SC-012: Build performance (< 60s)
    - [x] SC-013: Reactive Component Conversion
    - [x] SC-014: Session persistence
    - [x] SC-015: Concurrent editing
- [x] **E2E Expansion**: Finalized CMS editor interface and smoke tests.

## 8. Data Integrity (Cleanup)

- [x] **Canonical Content**: Migration complete; licenses moved to category subdirectories.
- [x] **Schema Enforcement**: Workspace-wide validation confirms all content follows Zod schemas.

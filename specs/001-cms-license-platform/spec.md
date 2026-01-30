# Feature Specification: Content Management & License Platform Redesign

**Feature Branch**: `001-cms-license-platform`
**Created**: 2026-01-30
**Status**: Draft
**Input**: User description: "Complete website redesign with CMS, multi-format export, and interactive license comparison"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Content Editor Creates License Content (Priority: P1)

A non-technical content editor needs to create or update a license's plain language version without writing code or understanding technical markup systems.

**Why this priority**: This is the foundation of the entire platform. Without a working CMS for content creation, the site cannot scale or be maintained by non-developers. This directly addresses the primary pain point identified in the current system.

**Independent Test**: Can be fully tested by creating a test user account, logging into the CMS, creating a new license entry with rich text content, saving it, and verifying it appears in the preview system. Delivers immediate value by enabling content creation without developer intervention.

**Acceptance Scenarios**:

1. **Given** a content editor is logged into the CMS, **When** they create a new license with title, description, and body content, **Then** the content is saved and appears in the preview
2. **Given** a license exists in the CMS, **When** the editor updates the plain language version, **Then** changes are saved and visible in preview without publishing
3. **Given** an editor is working on a license, **When** they add formatting (headings, bullets, emphasis), **Then** the formatting is preserved across all export formats
4. **Given** an editor is creating license content, **When** they need to reuse boilerplate text (warranty disclaimers, permission lists), **Then** they can insert common blocks from a centralized template library
5. **Given** a license has been updated, **When** the editor publishes changes, **Then** a new version is created with changelog entry

---

### User Story 2 - Visitor Understands and Downloads License (Priority: P1)

A website visitor needs to quickly understand if a license fits their needs and obtain it in their preferred format without confusion or friction.

**Why this priority**: This is the core user-facing value proposition. If visitors cannot easily understand and obtain licenses, the entire project fails its mission. This must work in MVP.

**Independent Test**: Can be fully tested by visiting a license page as an anonymous user, viewing the at-a-glance summary, downloading the license in multiple formats (markdown, plaintext, PDF), and copying to clipboard. Delivers complete end-user value independently.

**Acceptance Scenarios**:

1. **Given** a visitor lands on a license page, **When** they view the page, **Then** they see a clear summary of the license's key permissions, conditions, and limitations without reading the full text
2. **Given** a visitor understands the license, **When** they click download options, **Then** they can choose from multiple formats (GitHub markdown, vanilla markdown, plaintext, PDF, embedded code) with clear labels
3. **Given** a visitor selects a format, **When** they download or copy, **Then** the content is properly formatted for that format with all necessary metadata
4. **Given** a visitor wants to share a license, **When** they use sharing options, **Then** they can generate shareable links with proper OpenGraph preview images
5. **Given** a visitor is comparing licenses, **When** they view the readability comparison, **Then** they see metrics comparing the Plain License version to the original (reading level, word count, complexity)

---

### User Story 3 - Editor Maps Plain Language to Original (Priority: P2)

A content editor needs to establish connections between sections of the plain language version and corresponding sections in the original license text to maintain accuracy and enable comparison features.

**Why this priority**: This enables the interactive comparison feature which builds trust and demonstrates fidelity to original license intent. Critical for credibility but not required for basic content creation and consumption.

**Independent Test**: Can be fully tested by opening the editorial mapping interface, viewing plain language and original side-by-side, creating section-to-section connections with drag-drop or click actions, saving mappings, and verifying they display correctly in the public comparison view.

**Acceptance Scenarios**:

1. **Given** an editor is working on a license, **When** they open the mapping interface, **Then** they see the plain language version and original license side-by-side
2. **Given** the editor views both versions, **When** they select a section in the plain language version, **Then** they can link it to corresponding section(s) in the original
3. **Given** sections are linked, **When** the editor saves the mapping, **Then** the connections are stored and preserved across sessions
4. **Given** mappings exist, **When** a visitor views the comparison interface, **Then** hovering over plain language sections highlights corresponding original sections
5. **Given** an editor creates a mapping, **When** the plain language section is later edited, **Then** the mapping is preserved unless explicitly removed

---

### User Story 4 - Visitor Compares Plain Language to Original (Priority: P2)

A visitor needs to verify the plain language version's accuracy by comparing it directly to the original license text to build trust and understanding.

**Why this priority**: This transparency feature builds credibility and helps users understand the translation process. Important for trust but not required for basic license consumption.

**Independent Test**: Can be fully tested by visiting a license page, enabling comparison mode, hovering over plain language sections to see original text highlights, and toggling the feature on/off. Delivers trust-building value independently.

**Acceptance Scenarios**:

1. **Given** a visitor is viewing a license, **When** they enable comparison mode, **Then** they see the plain language version with interactive sections
2. **Given** comparison mode is active, **When** they hover over a plain language section, **Then** the corresponding original section is highlighted with visual connection
3. **Given** a visitor is comparing sections, **When** they click a section, **Then** they see a detailed side-by-side view of the plain and original text
4. **Given** a visitor enables comparison mode, **When** they refresh or return later, **Then** their preference is remembered for the session
5. **Given** a license has no mappings yet, **When** a visitor tries to enable comparison, **Then** they see a message explaining the feature is not available for this license

---

### User Story 5 - Content Manager Versions and Publishes (Priority: P3)

A content manager needs to track changes to licenses over time, create new versions, and publish updates while maintaining historical records and changelogs.

**Why this priority**: Version control is important for license maintenance and compliance tracking, but initial content can launch without formal versioning. Can be added after core features work.

**Independent Test**: Can be fully tested by creating a license version 1.0.0, making edits to create version 1.0.1, viewing version history, accessing previous versions, and verifying changelogs are automatically generated.

**Acceptance Scenarios**:

1. **Given** a license exists, **When** an editor makes changes, **Then** they can create a new version with semantic version number (MAJOR.MINOR.PATCH)
2. **Given** a new version is created, **When** the editor saves, **Then** a changelog entry is automatically generated from the changes
3. **Given** multiple versions exist, **When** a visitor views the license, **Then** they see the latest version by default with option to view history
4. **Given** a visitor views version history, **When** they select an older version, **Then** they can view and download that historical version
5. **Given** a license is published, **When** all export formats are generated, **Then** version metadata is included in each format's header

---

### User Story 6 - Editor Uses Reactive Components (Priority: P3)

A content editor needs to insert interactive or dynamic components (FAQs, comparison tables, decision trees) into license content using simple markup rather than code.

**Why this priority**: Enhances content richness and interactivity, but basic static content is sufficient for MVP. This is a content enhancement feature.

**Independent Test**: Can be fully tested by inserting a component placeholder in the CMS editor (e.g., `{{faq}}` or `{{comparison-table}}`), previewing the page to see the rendered component, and verifying it exports correctly to static formats.

**Acceptance Scenarios**:

1. **Given** an editor is writing license content, **When** they insert a component marker, **Then** they see a preview of how the component will appear
2. **Given** a component is inserted, **When** the editor configures component options (FAQ questions, table columns), **Then** the configuration is saved with the content
3. **Given** content has reactive components, **When** exported to web format, **Then** components are rendered as interactive elements
4. **Given** content has reactive components, **When** exported to static formats (PDF, plaintext), **Then** components are converted to appropriate static equivalents
5. **Given** common components exist, **When** an editor creates a new license, **Then** they can browse and insert from a component library

---

### User Story 7 - Visitor Reads Blog Content (Priority: P4)

A visitor needs to read blog posts about Plain License updates, license guides, and community content to stay informed and engaged.

**Why this priority**: Blog functionality is important for community building and content marketing, but not required for core license functionality. Can be added after license features are stable.

**Independent Test**: Can be fully tested by visiting the blog section, viewing post listings, reading individual posts, and navigating between posts. Delivers supplementary content value independently.

**Acceptance Scenarios**:

1. **Given** a visitor navigates to the blog, **When** they view the listing, **Then** they see recent posts with titles, excerpts, and publication dates
2. **Given** a visitor selects a post, **When** they read it, **Then** they see formatted content with images, code snippets, and embedded media
3. **Given** a visitor finishes reading, **When** they scroll to the end, **Then** they see related posts or navigation to other content
4. **Given** an editor creates blog content, **When** they use the CMS, **Then** they can write posts with the same rich editing experience as licenses

---

### Edge Cases

- What happens when a license has content but no mappings to the original (comparison mode should gracefully indicate unavailability)?
- How does the system handle extremely long licenses when generating PDF exports (page breaks, table of contents)?
- What happens when an editor creates a mapping and later deletes the section it maps to (orphaned mapping handling)?
- How does the system handle license content with special characters or legal symbols in different export formats (escaping, encoding)?
- What happens when multiple editors work on the same license simultaneously (conflict detection, merge handling)?
- How are broken boilerplate references handled when template content is updated (version compatibility, migration)?
- What happens to URLs and references when a license version is archived (permanent links, redirects)?
- How does the comparison interface handle licenses where plain language restructures sections significantly (many-to-one, one-to-many mappings)?

## Clarifications

### Session 2026-01-30

- Q: The CMS backend architecture will significantly impact implementation complexity, hosting costs, and scalability. What type of CMS architecture should we use? → A: Git-based headless CMS (Sveltia CMS) with Astro Content Collections API, deployed on Cloudflare Pages. Rationale: Free hosting, no database costs, version control built-in, simple deployment workflow.
- Q: The CMS requires authentication to control who can create and edit content. What authentication mechanism should be used? → A: OAuth with GitHub/Google and/or email magic links
- Q: PDF generation is a key requirement with specific quality standards. How should PDFs be generated? → A: Typst PDF generation engine with legal document templates
- Q: Export formats need to be available for download. When should these formats be generated? → A: Build-time static generation during Astro build process
- Q: Section mappings connect plain language to original license text. How should sections be technically identified for mapping? → A: SHA-256 hash-based identification with whitespace normalization. Each content section generates a stable hash from normalized text (lowercase, trimmed, collapsed whitespace) enabling reliable mapping even when formatting changes. Details in data-model.md mapping-data-contract.md.

### Session 2026-01-30 (Architecture Decisions - RESOLVED)

- Q: Which static site generator and theme will be used? → A: **Astro static site generator with Starlight theme using strategic component overrides (hybrid approach)**. 

**Architecture Decision**: After evaluating Starlight's capabilities, the hybrid approach is selected:

**Starlight Strengths to Leverage**:
- Excellent WCAG 2.1 AA accessibility out of box
- Fast performance with built-in optimizations  
- Robust component override system (can replace ANY component: Header, Footer, Sidebar, etc.)
- Supports custom pages via `<StarlightPage>` wrapper component
- Works seamlessly with multiple Astro content collections (licenses, blog, docs, template-blocks)
- Built-in dark mode, search, i18n capabilities
- Great developer experience and documentation

**Plain License Customizations**:
- **Keep**: Base layout, design system, accessibility features, typography, navigation structure
- **Override**: Header (Plain License branding), Footer (custom attribution), Sidebar (license navigation)
- **Custom Pages**: License detail pages (`src/pages/licenses/[slug].astro`), blog pages (`src/pages/blog/`), homepage
- **Custom Components**: License comparison UI, download center, reactive components (FAQ, tables, decision trees)

**Technical Approach**: 
1. Initialize Astro + Starlight (T002)
2. Configure component overrides in `astro.config.mjs` (T002a-T002d)
3. Create custom page layouts using `<StarlightPage>` wrapper for consistency
4. Define multiple content collections (licenses, blog, template-blocks) in `src/content/config.ts`
5. Build custom license/blog components that integrate with Starlight's design system

**Rationale**: Starlight's component override system is production-ready and well-documented. The `<StarlightPage>` component allows full custom layouts while maintaining design consistency. This approach provides the best balance of:
- Professional foundation (Starlight's accessibility and performance)
- Flexibility for custom features (comparison UI, download center, blog)
- Maintainability (leverage Starlight updates, override only what's needed)
- Development speed (reuse proven components, customize strategically)

**Risk Assessment**: LOW - Starlight override system is straightforward, active community support, easy fallback to base Astro if needed

**Estimated Additional Effort**: ~8-10 days for component overrides and custom layouts beyond base tasks

## Requirements *(mandatory)*

### Functional Requirements

#### Content Management

- **FR-001**: System MUST provide a visual editor interface for creating and editing license content without code using one of: (a) traditional database-backed CMS with free tier (Strapi, Directus), (b) API-first SaaS CMS with free tier (Contentful, Sanity), or (c) Git-based headless CMS (Tina CMS, Decap CMS) as fallback
- **FR-002**: System MUST support rich text formatting including headings, lists, emphasis, links, and blockquotes
- **FR-003**: System MUST maintain a centralized template library for common boilerplate text that can be inserted into any license
- **FR-004**: System MUST allow non-technical users to preview content changes before publishing
- **FR-005**: System MUST support draft and published states for license content
- **FR-006**: Editors MUST be able to create, read, update, and delete license entries through the CMS interface
- **FR-006a**: System MUST authenticate editors using OAuth (GitHub/Google) and/or passwordless email magic links before granting CMS access

#### Multi-Format Export

- **FR-007**: System MUST generate GitHub-flavored markdown from license content
- **FR-008**: System MUST generate vanilla markdown (CommonMark) from license content
- **FR-009**: System MUST generate plaintext versions with appropriate formatting
- **FR-010**: System MUST generate embed-ready HTML for iframe usage
- **FR-011**: System MUST generate SPDX XML format for license metadata
- **FR-012**: System MUST generate print-optimized PDF with proper typography and page layout using Typst PDF generation engine with legal document templates
- **FR-013**: All export formats MUST include version metadata and attribution
- **FR-013a**: Export formats MUST be either pre-generated when content is published or generated during static site build process (not on-demand at download time)

#### License Comparison

- **FR-014**: System MUST provide an editorial interface for mapping plain language sections to original license sections (technical implementation for section identification deferred to planning phase)
- **FR-015**: System MUST support one-to-one, one-to-many, and many-to-one section mappings
- **FR-016**: System MUST display interactive comparison highlighting when visitors enable comparison mode
- **FR-017**: System MUST persist user preference for comparison mode enabled/disabled during their session
- **FR-018**: Mappings MUST be preserved when plain language content is edited unless explicitly deleted

#### Version Management

- **FR-019**: System MUST support semantic versioning (MAJOR.MINOR.PATCH) for each license
- **FR-020**: System MUST automatically generate changelog entries when versions are created
- **FR-021**: System MUST maintain access to all historical versions of each license
- **FR-022**: Visitors MUST be able to view and download any historical version
- **FR-023**: System MUST display version number and last updated date on license pages

#### License Presentation

- **FR-024**: Each license page MUST display an at-a-glance summary of permissions, conditions, and limitations
- **FR-025**: System MUST provide clearly labeled download options for all available formats
- **FR-026**: System MUST enable one-click copy-to-clipboard for license text
- **FR-027**: System MUST generate unique OpenGraph images for each license for social sharing
- **FR-028**: System MUST display readability metrics comparing plain language to original
- **FR-029**: System MUST support optional FAQ components for licenses

#### Reactive Components

- **FR-030**: System MUST allow editors to insert component placeholders using simple markup syntax
- **FR-031**: System MUST provide a component library including FAQ, comparison tables, and decision trees
- **FR-032**: Components MUST render as interactive elements in web format
- **FR-033**: Components MUST convert to appropriate static equivalents in PDF and plaintext formats
- **FR-034**: System MUST preview reactive components in the CMS editor

#### Blog Functionality

- **FR-035**: System MUST support blog post creation through the same CMS interface as licenses
- **FR-036**: System MUST display blog posts in reverse chronological order with pagination
- **FR-037**: Blog posts MUST support the same rich text features as license content
- **FR-038**: System MUST provide navigation between related blog posts and license content

### Key Entities

- **Editor**: User with content creation privileges, including authentication provider (GitHub, Google, email), unique identifier, display name, email address, and role/permission level
- **License**: Core content entity representing a legal license with plain language version, original text, metadata (name, identifier, category), version information, publication status, and creation/modification timestamps
- **License Version**: Historical snapshot of a license at a specific point, including version number (MAJOR.MINOR.PATCH), publication date, changelog entry, content state, and all format exports for that version
- **Section Mapping**: Connection between plain language section and original license section(s), including source section identifier, target section identifier(s), mapping type (one-to-one, one-to-many, many-to-one), and relationship description (technical approach for section identification to be determined during planning)
- **Template Block**: Reusable boilerplate content including block identifier, category (warranty, permission, condition), content text, and usage tracking across licenses
- **Export Format**: Generated output in specific format including format type (markdown, plaintext, PDF, XML, embed), file content or URL, generation timestamp, and version association
- **Blog Post**: Supplementary content including title, author, body content, publication date, tags/categories, and related licenses
- **Component Instance**: Reactive component embedded in content including component type (FAQ, table, decision tree), configuration parameters, position in content, and static export fallback

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Non-technical content editors can create and publish a complete license without developer assistance in under 30 minutes
- **SC-002**: License pages load and display at-a-glance summary within 2 seconds for 95% of visitors
- **SC-003**: Visitors can successfully download their preferred license format on first attempt with 98% success rate
- **SC-004**: Comparison mode highlighting responds to hover interactions within 100 milliseconds
- **SC-005**: All export formats (markdown, plaintext, PDF, XML, embed) generate successfully for 100% of published licenses
- **SC-006**: PDF exports maintain consistent typography and layout quality equivalent to professional legal documents
- **SC-007**: Section mapping interface allows editors to create 10 section connections in under 5 minutes
- **SC-008**: Version history displays and allows access to all historical versions within 3 seconds
- **SC-009**: Template blocks reduce duplicate content writing by 60% compared to current system
- **SC-010**: Site remains accessible and usable for visitors using screen readers and keyboard navigation
- **SC-011**: OpenGraph images generate correctly and display properly when licenses are shared on social media platforms
- **SC-012**: Blog post creation and publishing time is reduced by 50% compared to current markdown file process
- **SC-013**: Reactive components render correctly in web format while maintaining readable static equivalents in PDF/plaintext
- **SC-014**: Session preference for comparison mode persists across page navigation within the same visit
- **SC-015**: System handles concurrent editing by multiple users without data loss or corruption

### Assumptions

- Content editors have basic computer literacy and experience with word processors or content management systems
- The existing brand colors and stylesheets will be provided as design system reference
- CMS selection prioritizes free-tier options for traditional database-backed (Strapi, Directus) or API-first SaaS (Contentful, Sanity) solutions, with Git-based headless CMS (Tina, Decap) as cost-free fallback
- Export formats are pre-generated (either at publish time or during static site build) to ensure fast download performance and meet the 2-second page load target
- Hosting platform decision (GitHub Pages, Cloudflare, Vercel) can be made during planning based on technical requirements, CMS backend choice, and export generation strategy
- Section mapping between plain language and original can be manually created by editors (no automated intelligent mapping required for MVP)
- License content volume will remain manageable (dozens of licenses, not thousands) for initial platform
- SPDX XML format requirements can be determined from existing SPDX specifications
- PDF generation uses Typst markup-based PDF engine with legal document templates (12pt serif font, 1.5 line spacing, 1-inch margins) for professional typography and consistent layout
- Blog functionality requirements mirror standard blog platforms (chronological listing, individual post pages, basic navigation)
- Component library will start with 3-5 common components and expand based on usage patterns
- Existing license content can be migrated into new CMS structure through initial data import process

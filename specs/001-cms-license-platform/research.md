# Research: Content Management & License Platform Redesign

**Feature**: 001-cms-license-platform
**Date**: 2026-01-30
**Status**: In Progress

## Research Tasks

This document resolves all NEEDS CLARIFICATION items from the Technical Context section.

### 1. Headless CMS Selection

**Question**: Which headless CMS should we use?

**Decision**: **Directus (self-hosted)** with **CloudCannon** as premium alternative

**Rationale**:

- Directus is free for organizations <$5M revenue (Plain License qualifies)
- No artificial content entry limits (vs Strapi Cloud 500 entries, Contentful 25 models)
- Excellent visual editing UX with content versioning and draft/publish workflows
- Built-in OAuth support (GitHub, Google) + magic link extensions
- No vendor lock-in (direct SQL database access)
- Cost: $10-20/month VPS hosting (vs CloudCannon $55-300/month)

**Integration Approach**:

- Self-host Directus on VPS with PostgreSQL/MySQL
- Create Python hook (`overrides/hooks/directus_integration.py`) to fetch content via REST/GraphQL API
- Generate markdown files during MkDocs build
- Webhook from Directus → GitHub Actions → Rebuild site

**Alternatives Considered**:

- **CloudCannon**: Best MkDocs integration but no free tier ($55+/month)
- **Strapi Cloud**: Free tier too restrictive (500 entries)
- **Contentful**: Severe free tier restrictions (25 models, personal use only)
- **Sanity**: Viable but less control than Directus
- **TinaCMS**: No MkDocs integration
- **Decap CMS**: Viable fallback but less feature-rich

**Status**: COMPLETED

---

### 2. Storage Architecture

**Question**: How should license content be stored?

**Decision**: **Database-backed (PostgreSQL with Directus)**

**Rationale**:

- Directus uses PostgreSQL/MySQL for structured content storage
- Native content versioning and draft/publish workflows
- Better performance for complex queries and relationships
- Backup via standard database tools (pg_dump, automated backups)
- Content migration: One-time import from current `packages/` markdown to Directus

**Implementation**:

- PostgreSQL database hosted on same VPS as Directus
- Database size estimate: <100MB for dozens of licenses + blog
- Automated daily backups to object storage (DigitalOcean Spaces/S3)
- Version control: Directus native versioning + database snapshots

**Migration Strategy**:

- Parse existing markdown files in `packages/` directories
- Extract frontmatter and content
- Import via Directus API or bulk SQL import
- Preserve version history where available

**Status**: COMPLETED

---

### 3. Testing Strategy

**Question**: What testing framework and approach should we implement?

**Decision**: **pytest (Python) + Vitest (TypeScript) + Playwright (E2E)**

**Rationale**:

- **pytest**: Industry standard for Python, excellent MkDocs hook testing support
- **Vitest**: 10-20× faster than Jest for TypeScript in 2026, native ESM support
- **Playwright**: Already available for PDF generation, reuse for E2E tests

**Coverage Goals** (realistic for documentation sites):

- Python hooks: 80% (core business logic)
- TypeScript: 70% (animations harder to test)
- Build validation: 90% (critical asset checks)
- E2E scenarios: 5-10 critical user flows

**Test Structure**:

```
tests/
├── unit/           # pytest for Python, Vitest for TypeScript
├── integration/    # CMS → export pipeline, build system
├── e2e/            # Playwright for user flows
└── build/          # Asset optimization, bundle validation
```

**CI/CD Integration**:

- GitHub Actions matrix testing (Python 3.10-3.12, Node 20-22)
- Coverage reporting with pytest-cov and @vitest/coverage-v8
- Target: <10 minute pipeline duration
- Coverage badges on PR comments

**Key Tools**:

- mkdocs-test framework for MkDocs integration testing
- RxJS marble testing for Observable streams
- jsdom for GSAP browser API support
- Visual regression testing with Playwright

**Status**: COMPLETED

---

### 4. Section Mapping Technical Implementation

**Question**: How should sections be technically identified for plain-to-original mapping?

**Decision**: **SHA-256 content hashing with CSS Custom Highlight API**

**Section Identification**:

- Primary: SHA-256 hash of normalized section content (automatic, survives minor edits)
- Override: Manual `data-section="custom-id"` attributes for stability
- Hybrid approach balances automation with editorial control

**Data Model**:

- Graph structure stored in `packages/{license}/mappings.json`
- Supports one-to-one, one-to-many, many-to-one, many-to-many relationships
- Includes confidence levels and editorial metadata

**Interactive Rendering**:

- CSS Custom Highlight API (500× faster than DOM manipulation)
- Graceful degradation for older browsers (DOM wrapper fallback)
- Performance target: <50ms for 10-section highlighting

**Editor UX**:

- Click-based selection interface (simple MVP)
- Side-by-side plain vs original view
- Local development server for creating mappings
- Visual preview of highlights before saving

**Mapping Preservation**:

- Fuzzy matching algorithm detects broken mappings when content changes
- Suggests migrations based on text similarity
- Requires editorial review before applying migrations
- Version control tracks mapping changes

**Storage Format**:

```json
{
  "mappings": [
    {
      "plainId": "sha256:abc123...",
      "originalId": "sha256:def456...",
      "type": "one-to-one",
      "confidence": 0.95,
      "notes": "Direct translation"
    }
  ]
}
```

**Implementation Libraries**:

- CSS Custom Highlight API (native browser API)
- Fuzzy matching: Levenshtein distance for similarity scoring
- Virtual scrolling for large documents

**Status**: COMPLETED (68-page technical design delivered)

---

### 5. Export Generation Workflow

**Question**: When and how should export formats be generated?

**Decision**: **Hybrid Approach - Build-time (lightweight) + Publish-time (PDFs)**

**Build-Time Generation** (Lightweight formats):

- GitHub-flavored Markdown
- Vanilla Markdown (CommonMark)
- Plaintext
- Embed HTML
- SPDX XML
- **Trigger**: Git commit to license content
- **Integration**: Extend `src/build/index.ts`, add MkDocs hook
- **Duration**: <5 seconds for all static formats

**Publish-Time PDF Generation** (Resource-intensive):

- Playwright headless browser PDF generation
- **Architecture**: CMS Webhook → API Gateway → SQS Queue → Lambda (Playwright) → S3 → CDN
- **Async processing**: Prevents timeout issues, decouples from build
- **Duration**: <30 seconds per PDF (doesn't block users)

**Cache Strategy**:

- **Content hash fingerprinting**: `MIT.a3f7b9.md` instead of query strings
- **Long TTL**: 1 year for immutable hashed exports (`Cache-Control: public, max-age=31536000, immutable`)
- **Multi-layer caching**: Browser → CDN Edge → Origin
- **Invalidation**: Version-based CDN purge using manifest mapping

**Storage**:

- Object storage: DigitalOcean Spaces or AWS S3 ($5-20/month)
- Integrated CDN for global distribution
- **Structure**: `s3://plainlicense-exports/{license}/v{version}/{license}.{hash}.{ext}`
- Version symlinks: `latest/` → current version

**Technology Stack**:

- **Markdown conversion**: Pandoc (supports all required formats)
- **PDF generation**: Playwright on AWS Lambda (ARM64 for cost)
- **Queueing**: AWS SQS (native Lambda integration)
- **CDN**: Integrated with object storage

**Performance Targets** (from spec):

- ✅ Page load: <2 seconds (pre-generated static exports)
- ✅ Download success: 98% (CDN redundancy)
- ✅ Build time impact: +5-10 seconds for static formats

**Status**: COMPLETED

---

### 6. Hosting Platform Decision

**Question**: Which static hosting platform should we use?

**Decision**: **Cloudflare Pages**

**Rationale**:

- **Unlimited bandwidth** on free tier (vs 100GB limits on GitHub Pages/Vercel)
- **Superior CDN performance**: 300+ data center locations (2× competitors)
- **Serverless functions**: 100K requests/day on free tier (for magic link authentication)
- **Official MkDocs support**: Framework-specific deployment guide
- **Fast deployments**: 3× faster builds than launch, edge deployment in seconds
- **Developer experience**: Automatic DNS + SSL, preview deployments on PRs

**Comparison**:

| Feature | GitHub Pages | Cloudflare Pages | Vercel |
|---------|-------------|-----------------|---------|
| Bandwidth | 100 GB/month | ✅ **Unlimited** | 100 GB/month |
| Build Minutes | 10 builds/hour | 500 builds/month | Limited |
| Serverless | ❌ None | ✅ 100K/day | ✅ 150K/month |
| CDN Locations | Fastly CDN | ✅ **300+** | Fewer than CF |
| MkDocs Guide | ✅ Yes | ✅ Yes | Manual setup |

**CMS Backend Hosting**:

- **Directus**: Separate VPS hosting ($10-20/month)
- Not on same platform (static site vs app server)
- Webhook integration: Directus → Cloudflare Pages rebuild

**Migration**:

- Connect GitHub repo to Cloudflare Pages
- Configure build settings (existing `bun run build`)
- Set up custom domain with automatic SSL
- Test deployment pipeline

**Cost**: Free for static site hosting

**Status**: COMPLETED

---

### 7. PDF Generation Best Practices

**Question**: What are the best practices for Playwright PDF generation at scale?

**Decision**: **Build-time generation with browser pooling**

**Legal Document Standards**:

- **Page size**: Letter (8.5" × 11") for US legal documents
- **Margins**: 1-inch on all sides
- **Typography**: 12pt serif fonts (Times New Roman), 1.5 line spacing
- **Alignment**: Left-aligned, right-justified

**PDF Configuration**:

```typescript
await page.pdf({
  path: outputPath,
  format: 'Letter',
  printBackground: true,  // Critical for graphics
  margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
  displayHeaderFooter: true,
  headerTemplate: '<div>{title}</div>',
  footerTemplate: '<div>Version {version} | Page <span class="pageNumber"></span></div>',
  preferCSSPageSize: false
});
```

**Font Embedding**:

- Use local WOFF2 files for reliability
- Wait for fonts: `await page.evaluate(() => document.fonts.ready)`
- Base64 data URLs for header/footer fonts if needed

**Table of Contents**:

- **Limitation**: Playwright lacks native PDF bookmark support
- **Solution**: Generate HTML-based TOC as part of content
- **Alternative**: Post-processing with pdf-lib (limited bookmark support)

**Performance Optimization**:

- **Browser instance pooling**: 3-5 reusable browser instances
- **Parallel generation**: 10 licenses in 5-12 seconds with 3 workers
- **Build-time vs publish-time**: Build-time for static assets, publish-time for async queue

**CSS Print Optimization**:

```css
@media print {
  @page { size: letter; margin: 1in; }
  h1, h2, h3 { page-break-after: avoid; }
  section { page-break-inside: avoid; }
  p { orphans: 3; widows: 3; }
}
```

**Integration**:

- Add `src/pdf/generator.ts` with `LicensePDFGenerator` class
- Extend build pipeline: `bun run build:pdf`
- Lambda function for publish-time async generation

**Status**: COMPLETED

---

### 8. Authentication Best Practices

**Question**: What are the best practices for OAuth and magic link authentication?

**Decision**: **OAuth 2.0 (GitHub/Google) + Passwordless Magic Links with JWT**

**OAuth Implementation**:

- **Providers**: GitHub and Google OAuth 2.0
- **Flow**: Authorization Code Grant with PKCE
- **Scopes**: Minimal (user:email for GitHub, profile+email for Google)
- **Library**: Auth.js (NextAuth.js) recommended for flexibility
- **Alternative**: Directus built-in OAuth support

**Magic Link Security**:

- **Token generation**: Cryptographically secure (crypto.randomBytes(32))
- **Expiration**: 10-15 minutes maximum
- **One-time use**: Invalidate immediately after verification
- **Session binding**: Bind tokens to originating session ID
- **Email validation**: Verify email before sending link

**JWT Token Strategy**:

- **Access tokens**: 15-minute expiration, RS256 algorithm (asymmetric)
- **Refresh tokens**: 7-day expiration, opaque tokens (not JWT)
- **Storage**: httpOnly, secure cookies (prevents XSS)
- **Claims**: Minimal payload (user ID, role, expiration)

**Session Management**:

- **Regenerate session** after successful authentication (prevents session fixation)
- **Hybrid approach**: Sessions mint new JWTs before expiration
- **Instant revocation**: Session invalidation for security events

**Role-Based Access Control (RBAC)**:

```typescript
enum UserRole {
  VIEWER = 'viewer',    // Read-only
  EDITOR = 'editor',    // Create/edit content
  ADMIN = 'admin'       // Full system access
}
```

**Security Measures**:

- **CSRF protection**: Synchronizer token pattern on state-changing requests
- **XSS prevention**: Input sanitization, Content Security Policy headers
- **Session fixation**: Regenerate session ID after authentication
- **Rate limiting**: 5 auth attempts per 15 minutes per IP
- **HTTPS only**: Secure flag on all cookies

**Security Headers**:

```typescript
{
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff'
}
```

**Directus Integration**:

- Native OAuth providers configured in Directus admin
- Magic link via @magicdx/auth extension
- Role mapping between app roles and Directus roles
- API tokens for CMS access from frontend

**Implementation Roadmap**:

- **Phase 1**: OAuth setup (GitHub, Google)
- **Phase 2**: Magic links + security hardening
- **Phase 3**: RBAC + CMS integration
- **Phase 4**: Testing + deployment

**Status**: COMPLETED

---

## Research Execution Summary

**Phase 0 Status**: ✅ **COMPLETED** - All 8 research tasks finished

**Execution Approach**:

- Dispatched 7 parallel research agents for independent tasks
- Tasks 1-8 all moved from PENDING to COMPLETED
- Total research time: ~40 minutes (parallel execution)

**Key Architectural Decisions Made**:

1. **CMS**: Directus (self-hosted) - Free, no limits, excellent UX
2. **Storage**: PostgreSQL database with Directus - Structured, versioned
3. **Testing**: pytest + Vitest + Playwright - Modern, fast, comprehensive
4. **Section Mapping**: SHA-256 hashing + CSS Custom Highlight API - Performant, modern
5. **Export Generation**: Hybrid build-time + publish-time - Optimal performance
6. **Hosting**: Cloudflare Pages - Unlimited bandwidth, superior CDN
7. **PDF Generation**: Build-time with browser pooling - Fast, reliable
8. **Authentication**: OAuth + Magic Links + JWT - Secure, flexible

**Next Phase**: Phase 1 - Design & Contracts (populate data-model.md, contracts/, quickstart.md)

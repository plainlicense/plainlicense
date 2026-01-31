# Quickstart Guide

**Feature**: 001-cms-license-platform
**Audience**: Developers setting up local development environment
**Last Updated**: 2026-01-30
**Status**: ✅ Phase 1 Complete

## Overview

This guide walks you through setting up the Plain License CMS platform locally, from installation to your first license publication. Estimated setup time: **15-20 minutes**.

**What you'll accomplish**:
- ✅ Install and configure development environment
- ✅ Run Astro development server with hot reload
- ✅ Configure Sveltia CMS for local editing
- ✅ Create and publish your first license
- ✅ Generate multi-format exports
- ✅ Deploy authentication proxy (optional)

---

## Prerequisites

### Required Tools

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| **Node.js** | 20.x LTS | JavaScript runtime |
| **Bun** | 1.0+ | Package manager and build tool |
| **Git** | 2.40+ | Version control |
| **Typst** | 0.11+ | PDF generation |

### Optional Tools

| Tool | Purpose |
|------|---------|
| **Docker** | Containerized development |
| **Wrangler CLI** | Cloudflare Workers deployment |
| **GitHub CLI** | GitHub integration |

### System Requirements

- **OS**: macOS, Linux, or WSL2 on Windows
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 2GB free space
- **Network**: Internet connection for dependencies

---

## Installation

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/plainlicense/plainlicense.git
cd plainlicense

# Verify you're on the correct branch
git branch
# Should show: dev (for development) or main (for production)
```

### 2. Install Dependencies

```bash
# Install all dependencies with Bun
bun install

# This installs:
# - Astro and Content Collections
# - Sveltia CMS
# - Build tools (TypeScript, esbuild, Vite)
# - Typst (via package.json scripts)
# - XML generation tools
```

**Installation Time**: ~2-3 minutes

### 3. Verify Installation

```bash
# Check installed versions
node --version    # Should be 20.x
bun --version     # Should be 1.x
typst --version   # Should be 0.11+

# Verify Astro CLI
bunx astro --version
```

---

## Configuration

### 1. Environment Variables

Create `.env` file in project root:

```bash
# Required for CMS authentication (local development)
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

# Optional: Custom CMS URL (defaults to https://plainlicense.org)
CMS_URL=http://localhost:4321

# Optional: Enable debug logging
DEBUG=true
```

**For local development**, you can skip GitHub OAuth setup and use git-gateway mode instead (see CMS Configuration below).

### 2. Sveltia CMS Configuration

The CMS configuration is at `public/admin/config.yml`. For local development with direct Git access:

```yaml
# public/admin/config.yml
backend:
  name: git-gateway  # Use git-gateway for local dev (no OAuth needed)
  branch: dev        # Or your feature branch

# For production with GitHub OAuth:
# backend:
#   name: github
#   repo: plainlicense/plainlicense
#   branch: main
#   base_url: https://auth.plainlicense.org
#   auth_endpoint: /auth

media_folder: "public/images"
public_folder: "/images"

collections:
  - name: "licenses"
    label: "Licenses"
    folder: "content/licenses"
    create: true
    slug: "{{spdx_id | lower}}"
    # ... (full config in cms-content-contract.md)
```

**Local Development Mode**:
- Uses `git-gateway` backend (no OAuth required)
- Direct Git operations via local repository
- Changes commit to your current branch

**Production Mode**:
- Uses `github` backend with OAuth proxy
- Requires Cloudflare Worker deployment (see Authentication section)

### 3. Content Directory Setup

```bash
# Create content directories (if not exist)
mkdir -p content/licenses
mkdir -p content/blog
mkdir -p content/mappings
mkdir -p public/original-licenses

# Verify structure
ls -la content/
# Should show: licenses/ blog/ mappings/
```

---

## First Build

### 1. Development Server

```bash
# Start Astro development server with hot reload
bun run dev

# Server starts at: http://localhost:4321
# CMS admin at: http://localhost:4321/admin
```

**What happens**:
1. Astro reads content from `content/` directories
2. Validates frontmatter against Zod schemas
3. Generates routes for licenses and blog posts
4. Serves static assets from `public/`
5. Hot reload on file changes

**Expected output**:
```
  🚀  astro  v4.0.0 started in 823ms

  ┃ Local    http://localhost:4321/
  ┃ Network  use --host to expose

  watching for file changes...
```

### 2. Production Build

```bash
# Full production build
bun run build

# This runs:
# 1. TypeScript compilation
# 2. CSS processing
# 3. Astro static site generation
# 4. Export generation (6 formats)
# 5. Asset optimization
```

**Build output** goes to `dist/`:
```
dist/
├── index.html
├── licenses/
│   ├── mit/
│   │   └── index.html
│   └── index.html
├── exports/
│   ├── MIT-1.0.0.md
│   ├── MIT-1.0.0.txt
│   ├── MIT-1.0.0.pdf
│   └── ...
└── _astro/
    └── [optimized assets]
```

**Build Time**: ~30-60 seconds for 20-25 licenses ✅

### 3. Verify Build

```bash
# Preview production build
bun run preview

# Server starts at: http://localhost:4321
# Test all routes and exports
```

---

## Your First License

### Option 1: Using Sveltia CMS (Recommended)

#### Step 1: Access CMS

```bash
# Make sure dev server is running
bun run dev

# Navigate to CMS admin
open http://localhost:4321/admin
```

#### Step 2: Login

**Local Development** (git-gateway):
- No login required, direct Git access
- Click "Continue" or "Work Locally"

**Production** (GitHub OAuth):
- Click "Login with GitHub"
- Authorize app (first time only)
- Redirected back to CMS

#### Step 3: Create License

1. Click **"Licenses"** in sidebar
2. Click **"New License"** button
3. Fill required fields:

```yaml
Title: MIT License (Plain Language)
SPDX ID: MIT
Version: 1.0.0
Original Version: 2024
Description: Simple permissive license with minimal restrictions
License Type: permissive
OSI Approved: ✓ (true)
FSF Approved: ✓ (true)
```

4. Write plain language content:

```markdown
## What You Can Do

- **Use** it for any purpose
- **Copy** and share it
- **Change** it however you like
- **Sell** products that include it

## What You Must Do

- **Keep the license notice** in copies you share
- **Keep the copyright notice** if present

## What You Should Know

We offer the work "as is" with no warranties. We are not responsible
for any damages or issues that arise from using the work.
```

5. Click **"Save"** → Creates Git commit
6. Click **"Publish"** → Merges to main branch

**Time**: ~15-20 minutes ✅ (meets SC-001 requirement)

#### Step 4: Verify License

```bash
# Check Git commit
git log -1 --oneline
# Should show: "Create MIT license" or similar

# View created file
cat content/licenses/mit.md

# Rebuild site
bun run build

# Check license page
open http://localhost:4321/licenses/mit/
```

### Option 2: Manual File Creation

#### Step 1: Create License File

```bash
# Create license markdown file
touch content/licenses/mit.md
```

#### Step 2: Add Frontmatter and Content

```markdown
---
title: "MIT License (Plain Language)"
spdx_id: "MIT"
version: "1.0.0"
original_version: "2024"
description: "Simple permissive license with minimal restrictions"
license_type: "permissive"
is_osi_approved: true
is_fsf_approved: true
has_mapping: false
show_original_comparison: true
show_shame_counter: true
featured: false
---

## What You Can Do

- **Use** it for any purpose
- **Copy** and share it
- **Change** it however you like
- **Sell** products that include it

## What You Must Do

- **Keep the license notice** in copies you share
- **Keep the copyright notice** if present

## What You Should Know

We offer the work "as is" with no warranties. We are not responsible
for any damages or issues that arise from using the work.
```

#### Step 3: Add Original License (Optional)

```bash
# Download original MIT license text
curl https://opensource.org/licenses/MIT \
  -o public/original-licenses/MIT.txt
```

#### Step 4: Build and Verify

```bash
# Development server auto-rebuilds
# Or manually rebuild:
bun run build

# Verify license page
open http://localhost:4321/licenses/mit/
```

---

## Export Generation

### 1. Automatic Export Generation

Exports are generated automatically during `bun run build`:

```bash
# Build site (includes export generation)
bun run build

# Check generated exports
ls -la dist/exports/

# Should show:
# MIT-1.0.0.md          (GitHub Flavored Markdown)
# MIT-1.0.0-common.md   (CommonMark)
# MIT-1.0.0.txt         (Plain text)
# MIT-1.0.0.pdf         (PDF via Typst)
# MIT-1.0.0-spdx.xml    (SPDX XML)
# MIT-1.0.0-embed.html  (Embeddable HTML)
```

### 2. Format-Specific Generation

#### Markdown Exports

```typescript
// Generated automatically
// src/build/exports/markdown.ts

export async function generateMarkdown(license: License) {
  // GitHub Flavored Markdown
  const gfmContent = renderGFM(license);

  // CommonMark (stricter)
  const commonContent = renderCommonMark(license);
}
```

#### PDF Export (Typst)

```bash
# Verify Typst installation
typst --version

# PDF generated during build via:
# src/build/exports/pdf.ts
```

#### SPDX XML Export

```typescript
// src/build/exports/spdx.ts
import { create } from 'xmlbuilder2';

export async function generateSPDX(license: License) {
  const spdx = create({ version: '1.0' })
    .ele('SPDXLicense')
      .ele('licenseId').txt(license.spdx_id).up()
      .ele('licenseName').txt(license.title).up()
      // ... full SPDX structure
    .end({ prettyPrint: true });
}
```

### 3. Manual Export Generation

```bash
# Generate exports only (without full build)
bunx tsx src/build/exports/index.ts

# Generate specific format
bunx tsx src/build/exports/pdf.ts mit

# Generate for specific license
bunx tsx src/build/exports/index.ts --license mit
```

**Performance**: ~15 seconds for 20 licenses ✅

---

## Creating Mappings

### 1. Manual Mapping Creation

Create mapping JSON file in `content/mappings/`:

```bash
# Create mapping file
touch content/mappings/MIT-mapping.json
```

```json
{
  "license_id": "MIT",
  "version": "1.0.0",
  "mapping_philosophy": "Direct translation with minimal paraphrasing",
  "mappings": [
    {
      "id": "map-perm-use",
      "type": "one-to-one-expanded",
      "plain_clause": {
        "id": "plain-perm-use",
        "hash": "sha256:a1b2c3...",
        "content": "- **Use** it for any purpose",
        "semantic_tag": "permissions"
      },
      "original_clause": {
        "id": "original-grant-use",
        "hash": "sha256:9f8e7d...",
        "content": "Permission is hereby granted, free of charge, to any person obtaining a copy..."
      },
      "confidence": 0.95,
      "semantic_tag": "permissions"
    }
  ]
}
```

### 2. Update License Frontmatter

```yaml
# content/licenses/mit.md
---
# ... other fields
has_mapping: true
mapping_version: "1.0.0"
show_original_comparison: true
---
```

### 3. Validate Mapping

```bash
# Build validates mapping against JSON Schema
bun run build

# Expected: No errors if mapping is valid
# Error example: "Invalid mapping: missing required field 'hash'"
```

### 4. View Mapping UI

```bash
# Start dev server
bun run dev

# View license page with comparison
open http://localhost:4321/licenses/mit/

# Mapping viewer should render side-by-side comparison
```

---

## Authentication Setup (Optional)

For production GitHub OAuth authentication, deploy Cloudflare Worker:

### 1. Install Wrangler CLI

```bash
# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### 2. Configure Worker

```bash
# Navigate to worker directory
cd workers/oauth-proxy

# Copy example config
cp wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml`:

```toml
name = "plainlicense-oauth-proxy"
main = "index.ts"
compatibility_date = "2024-01-01"

[vars]
CMS_URL = "https://plainlicense.org"
```

### 3. Set Secrets

```bash
# Set GitHub OAuth credentials
wrangler secret put GITHUB_CLIENT_ID
# Paste your GitHub OAuth Client ID

wrangler secret put GITHUB_CLIENT_SECRET
# Paste your GitHub OAuth Client Secret
```

### 4. Deploy Worker

```bash
# Deploy to Cloudflare
wrangler deploy

# Output shows worker URL:
# Published plainlicense-oauth-proxy
# https://plainlicense-oauth-proxy.ACCOUNT.workers.dev
```

### 5. Configure Custom Domain (Optional)

```bash
# Via Cloudflare Dashboard:
# Workers → Custom Domains → Add domain
# → auth.plainlicense.org → Add

# Or via Wrangler:
wrangler deploy --route auth.plainlicense.org
```

### 6. Update CMS Config

```yaml
# public/admin/config.yml
backend:
  name: github
  repo: plainlicense/plainlicense
  branch: main
  base_url: https://auth.plainlicense.org  # Your worker URL
  auth_endpoint: /auth
```

### 7. Test Authentication

```bash
# Rebuild with new config
bun run build
bun run preview

# Navigate to CMS
open http://localhost:4321/admin

# Click "Login with GitHub"
# Should redirect through Cloudflare Worker → GitHub → back to CMS
```

---

## Common Workflows

### Add a New License

```bash
# 1. Create license file
cat > content/licenses/apache-2-0.md << 'EOF'
---
title: "Apache License 2.0 (Plain Language)"
spdx_id: "Apache-2.0"
version: "1.0.0"
original_version: "2004"
description: "Permissive license with patent grant"
license_type: "permissive"
is_osi_approved: true
is_fsf_approved: true
---

## What You Can Do
...
EOF

# 2. Add original license
curl https://www.apache.org/licenses/LICENSE-2.0.txt \
  -o public/original-licenses/Apache-2.0.txt

# 3. Build and verify
bun run build
open http://localhost:4321/licenses/apache-2-0/
```

### Update Existing License

```bash
# 1. Edit license file
vim content/licenses/mit.md

# 2. Increment version in frontmatter
# version: "1.0.0" → "1.0.1"

# 3. Rebuild
bun run build

# 4. Verify exports reflect new version
ls -la dist/exports/MIT-1.0.1.*
```

### Run Quality Checks

```bash
# Full quality check suite
bun run check

# Individual checks
bun run check:style:ts       # TypeScript linting
bun run check:style:css      # CSS linting
bun run check:style:python   # Python linting (hooks)
bun run check:style:markdown # Markdown linting

# Auto-fix issues
bun run fix
```

### Deploy to Cloudflare Pages

```bash
# Install Wrangler (if not already)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build production site
bun run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist/ --project-name plainlicense

# Output shows deployment URL
```

---

## Troubleshooting

### Build Failures

#### Schema Validation Errors

**Error**:
```
[ERROR] [content] Invalid frontmatter in content/licenses/mit.md
  version: Expected string matching /^\d+\.\d+\.\d+$/, received "1.0"
```

**Fix**:
```yaml
# Change version to semver format
version: "1.0" → "1.0.0"
```

#### Missing Dependencies

**Error**:
```
Cannot find package 'astro'
```

**Fix**:
```bash
# Reinstall all dependencies
rm -rf node_modules bun.lockb
bun install
```

#### Typst Not Found

**Error**:
```
/bin/sh: typst: command not found
```

**Fix**:
```bash
# Install Typst
# macOS:
brew install typst

# Linux:
curl -fsSL https://typst.app/install.sh | sh

# Verify installation
typst --version
```

### CMS Issues

#### CMS Won't Load

**Error**: Blank page at `/admin`

**Fix**:
1. Check browser console for errors
2. Verify `public/admin/index.html` exists
3. Ensure dev server is running: `bun run dev`

#### Authentication Fails

**Error**: "Login failed, please try again"

**Fix**:
1. **Local dev**: Switch to `git-gateway` backend in `config.yml`
2. **Production**: Verify Cloudflare Worker secrets:
   ```bash
   wrangler secret list
   # Should show: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
   ```

#### Can't Save Changes

**Error**: "Failed to persist entry"

**Fix**:
1. Check Git status: `git status` (should be clean or have expected changes)
2. Verify write permissions: `ls -la content/licenses/`
3. Check Git config: `git config user.name && git config user.email`

### Export Generation Issues

#### PDF Generation Fails

**Error**: `Failed to generate PDF for MIT`

**Fix**:
```bash
# Test Typst directly
echo "= Test" > test.typ
typst compile test.typ test.pdf

# If fails, reinstall Typst
brew reinstall typst  # macOS
```

#### SPDX XML Invalid

**Error**: "Invalid SPDX XML: missing licenseId"

**Fix**:
Ensure license has `spdx_id` in frontmatter:
```yaml
spdx_id: "MIT"  # Required, must match SPDX standard
```

### Performance Issues

#### Slow Build Times

**Issue**: Build takes >2 minutes

**Diagnosis**:
```bash
# Run build with timing
time bun run build
```

**Fix**:
1. Clear Astro cache: `rm -rf .astro/`
2. Clear node_modules: `rm -rf node_modules && bun install`
3. Disable source maps for production: `astro.config.mjs → vite.build.sourcemap: false`

#### Dev Server Slow

**Issue**: Hot reload takes >5 seconds

**Fix**:
1. Reduce content size (temporarily move licenses out of `content/`)
2. Disable plugins in `astro.config.mjs` during development
3. Use `--host` flag only when needed: `bun run dev --host`

---

## Development Tips

### 1. Fast Development Loop

```bash
# Terminal 1: Watch mode for TypeScript
bun run watch:ts

# Terminal 2: Dev server with hot reload
bun run dev

# Make changes → auto-rebuild → browser refreshes
```

### 2. Content Preview

```bash
# Preview specific license during development
bun run dev --open /licenses/mit/

# Preview exports (after build)
bun run preview --open /exports/
```

### 3. Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/add-gpl-license

# Make changes, commit
git add content/licenses/gpl-3-0.md
git commit -m "Add GPL 3.0 plain language version"

# Push and create PR
git push -u origin feature/add-gpl-license
gh pr create --title "Add GPL 3.0" --body "Plain language version of GPL 3.0"
```

### 4. Testing Exports Locally

```bash
# Build exports
bun run build

# Test each format
cat dist/exports/MIT-1.0.0.md           # Markdown
cat dist/exports/MIT-1.0.0.txt          # Plain text
open dist/exports/MIT-1.0.0.pdf         # PDF (macOS)
cat dist/exports/MIT-1.0.0-spdx.xml     # SPDX XML
open dist/exports/MIT-1.0.0-embed.html  # Embed HTML
```

### 5. Validation Scripts

```bash
# Validate all mappings against JSON Schema
bunx ajv validate -s content/mappings/schema.json \
  -d "content/mappings/*-mapping.json"

# Validate frontmatter (via Astro build)
bun run build --config astro.config.validate.mjs
```

---

## Next Steps

After completing this quickstart:

1. **Read the Contracts** (`specs/001-cms-license-platform/contracts/`)
   - Understand system architecture and guarantees
   - Learn data flows and validation rules

2. **Explore Phase 1 AI Prototype** (`specs/001-cms-license-platform/phase1-ai-prototype-spec.md`)
   - AI-assisted mapping generation workflow
   - Confidence scoring and validation

3. **Review Data Model** (`specs/001-cms-license-platform/data-model.md`)
   - Entity definitions and relationships
   - Complete schema reference

4. **Join the Community**
   - GitHub Discussions: Ask questions and share feedback
   - Contributing Guide: Submit plain language licenses
   - Code of Conduct: Community standards

---

## Reference

### Key Files

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro configuration and plugins |
| `public/admin/config.yml` | Sveltia CMS configuration |
| `src/content/config.ts` | Content Collections schemas |
| `package.json` | Dependencies and scripts |
| `.env` | Environment variables (local only) |

### Key Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Development server with hot reload |
| `bun run build` | Production build with exports |
| `bun run preview` | Preview production build |
| `bun run check` | Run all quality checks |
| `bun run fix` | Auto-fix style issues |

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `content/` | License content (markdown + frontmatter) |
| `public/` | Static assets and original licenses |
| `dist/` | Build output (static site + exports) |
| `src/` | Source code (TypeScript, CSS, build scripts) |
| `workers/` | Cloudflare Workers (OAuth proxy) |

---

## Support

**Issues**: https://github.com/plainlicense/plainlicense/issues
**Discussions**: https://github.com/plainlicense/plainlicense/discussions
**Email**: hello@plainlicense.org

---

**Last Updated**: 2026-01-30
**Next Review**: After Phase 1 implementation or user feedback

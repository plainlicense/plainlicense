# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note**: `CLAUDE.md` is a symlink to this file (`AGENTS.md`), created by `mise run setup`. Edit `AGENTS.md` directly.

## Project Overview

**Plain License** is an Astro 5 + Starlight documentation site that publishes plain-language rewrites of popular software licenses. Each license is independently versioned as a Bun workspace package and deployed to Cloudflare Pages.

## Development Commands

All tasks run through `mise`. The package manager is **bun**.

```bash
mise run dev          # Start Astro dev server (also syncs deps)
mise run build        # Astro build + post-build (exports, OG images, versions)
mise run lint         # All linters (Biome, shellcheck, Astro check)
mise run fmt          # All formatters (Biome, shfmt, markdownlint, tombi)
mise run test         # Vitest interactive watch mode
mise run test --unit  # Vitest run (single pass)
mise run test --e2e   # Playwright E2E tests
mise run test-cov     # Vitest with coverage (80% thresholds)
mise run setup        # Initial setup: bun install, hk hooks, symlinks
```

Run a single Vitest test file:

```bash
bunx vitest run tests/unit/your-file.test.ts
```

Run a single Playwright test:

```bash
bunx playwright test tests/e2e/your-test.spec.ts
```

Type-check Astro/TS:

```bash
bunx astro check
```

## Architecture

### Content Layer

Content lives in `content/` and is symlinked into `src/content/`:

- `content/licenses/{category}/{spdx-id}.md` — license pages with YAML frontmatter (schema in `src/content/config.ts`)
- `content/blog/` — blog posts
- `content/mappings/` — term mappings between original/plain license language

License categories: `permissive`, `copyleft`, `source-available`, `public-domain`.

**URL routing is auto-generated** at build time from the `content/licenses/` directory structure (`astro.config.mjs` → `getLicenseRedirects()`). Adding a `content/licenses/{category}/{spdx-id}.md` file automatically creates:

- `/licenses/{spdx-id}` → `/licenses/{category}/{spdx-id}`
- `/{spdx-id}` → `/licenses/{category}/{spdx-id}`

### Monorepo Packages

Each license has a workspace package at `packages/{spdx-id}/` with its own `package.json` for independent semantic versioning. The `main` field points to the content file. A `.license_package_template.json` template exists in `packages/` for creating new license packages.

### Build Pipeline

`mise run build` runs three steps after `astro build`:

1. `src/build/generate-exports.ts` — generates downloadable license files (MD, PDF, TXT) to `public/exports/`
2. `src/build/generate-og-images.ts` — generates social share images
3. `src/build/generate-versions.ts` — writes version metadata

### Frontend Components

- `src/components/overrides/` — Starlight layout overrides (Header, Footer, Sidebar)
- `src/components/reactive/` — Preact interactive components (DecisionTree.tsx, ComparisonTable.astro, FAQ.astro)
- `src/components/*.astro` — License-specific components (LicenseSummary, ComparisonModal, DownloadOptions, VersionHistory)

Preact is used for interactive components. JSX factory is `h` (configured in tsconfig). Path alias `~` maps to `./src`.

### Utils

`src/utils/` contains: `auth.ts`, `collections.ts`, `component-parser.ts`, `content.ts`, `errors.ts`, `hash.ts`, `reactive.ts`, `templates.ts`.

## Commit Format

Commits use a custom commitlint config with **mandatory** type and scope:

```
{type}({scope}): {description}
```

**Types:**

- `new` — new license, feature, or content
- `subs` — substantive edit to an existing license (license scope only)
- `admin` — administrative/minor license edit (license scope only)
- `fix` — bug fix
- `refactor` — code/org change without bug fix or feature
- `chore` — small tasks, minor content edits
- `bot` — automated commits
- `stable` — major stable release (very rare)

**Scopes for license commits:** SPDX ID in lowercase (e.g., `mit`, `gpl-3.0`) or `plain-{name}` for Plain License originals.

**Scopes for dev commits:** `content`, `ui`, `infra`, `deps`, `scripts`, `blog`.

Example: `new(apache-2.0): add Plain Apache 2.0 license`

Use `mise run commit "<message>"` to stage all, format, and commit.

## Adding a License

1. Create `content/licenses/{category}/{spdx-id}.md` using `LICENSE_TEMPLATE.md` as the template
2. Create `packages/{spdx-id}/package.json` by copying `packages/.license_package_template.json` and replacing `{{ SPDX_ID }}`
3. Add the package as a workspace dependency in the root `package.json`
4. See `ADDING_A_LICENSE.md` for complete step-by-step instructions

## Plain Language Standards (Constitution)

All license and content writing must follow the project constitution (`.specify/memory/constitution.md`):

- **Target 8th-grade reading level** — use Hemingway Editor or similar
- **Address readers as "you"**; use "we, the authors" for licensors
- **Preferred terminology**: "the work" (not "software/code"), "source materials" (not "source code"), "share" (not "distribute"), "change" (not "modify/amend"), "give" (not "grant/convey"), "use" (not "utilize/exploit"), "rules" or "terms" (not "conditions/limitations")
- **Shame words**: Complex legal terms are tracked and flagged during build. PRs adding new content must pass shame word checks.
- Headers should use empowering framing: "You are Free to..."
- Use "source materials" instead of "source code" to cover all creative works

## Tooling Notes

- **Biome** handles TS/JS/JSON/CSS linting and formatting (config: `biome.jsonc`)
- **mise** manages tool versions and task definitions (config: `mise.toml`)
- **hk** manages git hooks via mise
- **typos** checks spelling across source files
- `command cat` (not `cat`) when writing to files — `cat` is aliased to `bat` with ANSI colors which corrupts files

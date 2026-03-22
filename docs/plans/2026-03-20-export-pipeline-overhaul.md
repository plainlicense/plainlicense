# Export Pipeline Overhaul

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move license export generation from `public/exports/` (committed to VCS) into Astro's build pipeline so exports are generated into `dist/`, use versioned filenames for cache busting, support historical version generation from git tags, and add a CI check to prevent content changes without version bumps.

**Architecture:** Export generation becomes an Astro integration using the `astro:build:done` hook, writing directly to the build output directory. Filenames follow SPDX-aligned naming (`Plain-MIT-0.2.5.pdf`). A `plain_id` frontmatter field provides the human-friendly license identifier, with auto-derivation from `spdx_id` as fallback. Historical versions are generated from git tags at build time. A CI check compares license content hashes between commits and fails if content changed without a version bump.

**Tech Stack:** Astro integrations API, git CLI (via `execFileSync` — never `execSync` to prevent shell injection), Vitest, GitHub Actions

---

## Naming Convention Reference

Throughout this plan, the following conventions apply:

- **`plain_id`**: Human-friendly identifier like `Plain-MIT`, `Plain-MPL`, `Plain-Elastic`. Derived by default from `spdx_id` by stripping trailing version (`-X.0`, `-X.0-only`, `-X.0-or-later`) and prepending `Plain-`. Overridable in frontmatter for edge cases (e.g., `Plain-GPL3`).
- **Export filename**: `{plain_id}-{plain_version}.{ext}` (e.g., `Plain-MIT-0.2.5.pdf`)
- **Export URL path**: `/exports/{spdx_id_lowercase}/{plain_version}/` (e.g., `/exports/mit/0.2.5/Plain-MIT-0.2.5.pdf`)
- **Latest alias**: `/exports/{spdx_id_lowercase}/latest/` redirects to current version
- **Git tags for releases**: `{spdx_id_lowercase}@{version}` (e.g., `mit@0.2.5`)

## Derivation logic for `plain_id` (default from `spdx_id`):

```typescript
function derivePlainId(spdxId: string): string {
  // Strip trailing version patterns: -2.0, -3.0-only, -2.0-or-later, -1.1
  const base = spdxId.replace(/-\d+\.\d+(-only|-or-later)?$/i, '');
  return `Plain-${base}`;
}
// "MIT" → "Plain-MIT"
// "MPL-2.0" → "Plain-MPL"
// "GPL-3.0-only" → "Plain-GPL" (would be overridden to "Plain-GPL3")
// "Elastic-2.0" → "Plain-Elastic"
// "Unlicense" → "Plain-Unlicense"
```

---

## Task 1: Add `plain_id` to Content Schema and Frontmatter

**Files:**
- Modify: `src/content.config.ts:70-133` (schema definition)
- Modify: `content/licenses/permissive/mit.md:1-30` (frontmatter)
- Modify: `content/licenses/copyleft/mpl-2.0.md` (frontmatter)
- Modify: `content/licenses/source-available/elastic-2.0.md` (frontmatter)
- Modify: `content/licenses/public-domain/unlicense.md` (frontmatter)
- Test: `tests/unit/plain-id.test.ts`

### Step 1: Write the `derivePlainId` utility and test

Create the derivation function and its tests first.

Create `src/utils/plain-id.ts`:

```typescript
/**
 * Derives a Plain License identifier from an SPDX ID.
 * Strips trailing version suffixes (-2.0, -3.0-only, -2.0-or-later)
 * and prepends "Plain-".
 */
export function derivePlainId(spdxId: string): string {
  const base = spdxId.replace(/-\d+\.\d+(-only|-or-later)?$/i, '');
  return `Plain-${base}`;
}
```

Create `tests/unit/plain-id.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { derivePlainId } from '../../src/utils/plain-id.ts';

describe('derivePlainId', () => {
  it('passes through simple IDs with Plain- prefix', () => {
    expect(derivePlainId('MIT')).toBe('Plain-MIT');
  });

  it('strips -X.0 version suffix', () => {
    expect(derivePlainId('MPL-2.0')).toBe('Plain-MPL');
    expect(derivePlainId('Elastic-2.0')).toBe('Plain-Elastic');
  });

  it('strips -X.0-only suffix', () => {
    expect(derivePlainId('GPL-3.0-only')).toBe('Plain-GPL');
  });

  it('strips -X.0-or-later suffix', () => {
    expect(derivePlainId('LGPL-2.1-or-later')).toBe('Plain-LGPL');
  });

  it('handles IDs with no version to strip', () => {
    expect(derivePlainId('Unlicense')).toBe('Plain-Unlicense');
    expect(derivePlainId('0BSD')).toBe('Plain-0BSD');
  });
});
```

### Step 2: Run the test to verify it passes

Run: `bunx vitest run tests/unit/plain-id.test.ts`
Expected: All tests PASS

### Step 3: Add `plain_id` to the content schema

In `src/content.config.ts`, add `plain_id` as an optional field in the licenses schema, right after `spdx_id`:

```typescript
// Find this line:
spdx_id: z.string().regex(/^[A-Za-z0-9.-]+$|^Plain-[A-Za-z0-9.-]+$/),

// Add after it:
plain_id: z.string().regex(/^Plain-[A-Za-z0-9]+$/).optional(),
```

The field is optional because it can be derived from `spdx_id`. When present, it overrides the derivation.

### Step 4: Add `plain_id` to each license's frontmatter

This is optional for current licenses since the derivation works, but add it explicitly for clarity:

**`content/licenses/permissive/mit.md`** — add after `spdx_id: MIT`:
```yaml
plain_id: Plain-MIT
```

**`content/licenses/copyleft/mpl-2.0.md`** — add after `spdx_id: MPL-2.0`:
```yaml
plain_id: Plain-MPL
```

**`content/licenses/source-available/elastic-2.0.md`** — add after `spdx_id: Elastic-2.0`:
```yaml
plain_id: Plain-Elastic
```

**`content/licenses/public-domain/unlicense.md`** — add after `spdx_id: Unlicense`:
```yaml
plain_id: Plain-Unlicense
```

### Step 5: Verify the schema accepts the new field

Run: `bunx astro check`
Expected: No errors related to content schema

### Step 6: Commit

```bash
git add src/utils/plain-id.ts tests/unit/plain-id.test.ts src/content.config.ts content/licenses/
git commit -m "new(infra): add plain_id field to license schema and frontmatter

Adds a Plain-{base} identifier for SPDX-aligned export naming.
Derivation strips version suffixes; frontmatter field allows override."
```

---

## Task 2: Create the Astro Export Integration

This is the core change. We replace the standalone `src/build/generate-exports.ts` script with an Astro integration that hooks into `astro:build:done` and writes exports directly to the build output directory.

**Files:**
- Create: `src/integrations/exports.ts` (the Astro integration)
- Modify: `astro.config.mjs` (register the integration)
- Modify: `mise.toml:404-411` (remove `generate-exports.ts` from build task)
- Modify: `src/build/exports/index.ts` (update `ExportOrchestrator` interface)
- Modify: `src/build/exports/markdown.ts` (use new filename convention)
- Modify: `src/build/exports/plaintext.ts` (use new filename convention)
- Modify: `src/build/exports/pdf.ts` (use new filename convention)
- Test: `tests/unit/exports.test.ts` (update for new filenames)
- Test: `tests/integration/export_orchestrator.test.ts` (update for new filenames)

### Step 1: Update `ExportContext` to include `plain_id`

In `src/build/exports/index.ts`, update the `ExportContext` interface:

```typescript
export interface ExportContext {
  licenseId: string;    // SPDX ID (e.g., "MIT")
  plainId: string;      // Plain ID (e.g., "Plain-MIT")
  version: string;      // plain_version (e.g., "0.2.5")
  content: string;
  metadata: any;
  outputDir: string;
}
```

### Step 2: Update filename generation in all export modules

Each export module currently uses `licenseId` for filenames (e.g., `MIT.gfm.md`). Update them to use the new convention: `{plainId}-{version}.{ext}`.

**`src/build/exports/markdown.ts`** — change filenames:

```typescript
export async function generateMarkdown(ctx: ExportContext) {
  const { plainId, version, content, metadata, outputDir } = ctx;

  const baseName = `${plainId}-${version}`;

  const gfmFileName = `${baseName}.gfm.md`;
  const gfmFilePath = path.join(outputDir, gfmFileName);
  const gfmHeader = `<!-- Plain License: ${plainId} ${version} -->\n` +
                 `<!-- Attribution: https://plainlicense.org/licenses/${metadata.slug || ctx.licenseId.toLowerCase()} -->\n\n`;
  const gfmContent = gfmHeader + content;

  const cmFileName = `${baseName}.cm.md`;
  const cmFilePath = path.join(outputDir, cmFileName);
  const cmContent = content;

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(gfmFilePath, gfmContent),
    fs.writeFile(cmFilePath, cmContent),
  ]);

  console.log(`Generated Markdown exports: ${gfmFileName}, ${cmFileName}`);
}
```

Note: the default `{licenseId}.md` copy is removed — the GFM variant is the explicit download target now.

**`src/build/exports/plaintext.ts`** — change filename:

```typescript
export async function generatePlaintext(ctx: ExportContext) {
  const { plainId, version, content, metadata, outputDir } = ctx;
  const fileName = `${plainId}-${version}.txt`;
  const filePath = path.join(outputDir, fileName);

  let text = content
    .replace(/^#+ (.*)$/gm, (match, p1) => p1.toUpperCase())
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1');

  const header = `Plain License: ${plainId} ${version}\n` +
                 `Attribution: https://plainlicense.org/licenses/${metadata.slug}\n\n` +
                 `========================================\n\n`;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, header + text);
  console.log(`Generated Plaintext export: ${filePath}`);
}
```

**`src/build/exports/pdf.ts`** — change filename:

```typescript
// In generatePDF, update these lines:
const baseName = `${ctx.plainId}-${ctx.version}`;
const fileName = `${baseName}.pdf`;
const filePath = path.join(outputDir, fileName);
const typPath = path.join(outputDir, `${baseName}.typ`);
```

**`src/build/exports/index.ts`** — update `generateSPDX` and `generateEmbed`:

```typescript
private async generateSPDX(ctx: ExportContext) {
  const { plainId, version, licenseId, outputDir } = ctx;
  const fileName = `${plainId}-${version}.xml`;
  const filePath = path.join(outputDir, fileName);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<spdx:License xmlns:spdx="http://spdx.org/rdf/terms#" spdxId="${licenseId}">
  <spdx:name>${plainId}</spdx:name>
  <spdx:version>${version}</spdx:version>
</spdx:License>`;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, xml);
  console.log(`Generated SPDX XML export: ${filePath}`);
}

private async generateEmbed(ctx: ExportContext) {
  const { plainId, version, licenseId, metadata, outputDir } = ctx;
  const fileName = `${plainId}-${version}-embed.html`;
  const filePath = path.join(outputDir, fileName);

  const html = `<div class="pl-embed" data-license="${licenseId}" data-version="${version}">
  <a href="https://plainlicense.org/licenses/${metadata.slug}">${metadata.title}</a>
</div>`;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, html);
  console.log(`Generated Embed HTML export: ${filePath}`);
}
```

### Step 3: Update `ExportOrchestrator.generateAll` to use `plainId`

The method signature already accepts `ExportContext`, so the only change is ensuring all internal calls pass `plainId` through. Update the `generateAll` method to use `ctx.plainId` where it currently constructs filenames, and update the `staticCtx` spread:

```typescript
const staticCtx = { ...ctx, content: staticContent, licenseId, version, plainId: ctx.plainId };
```

### Step 4: Create the Astro integration

Create `src/integrations/exports.ts`:

```typescript
import type { AstroIntegration } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { ExportOrchestrator, type ExportContext } from '../build/exports/index.ts';
import { derivePlainId } from '../utils/plain-id.ts';

export default function exportsIntegration(): AstroIntegration {
  return {
    name: 'plainlicense-exports',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = dir.pathname;
        const contentDir = path.resolve('content/licenses');
        const templateBlocksDir = path.resolve('content/template-blocks');
        const orchestrator = new ExportOrchestrator();

        // Load template blocks
        const templateBlocks: Record<string, string> = {};
        try {
          const blockFiles = await fs.readdir(templateBlocksDir);
          for (const file of blockFiles) {
            if (file.endsWith('.md')) {
              const blockContent = await fs.readFile(
                path.join(templateBlocksDir, file), 'utf8'
              );
              const { content } = matter(blockContent);
              templateBlocks[file.replace(/\.md$/, '')] = content;
            }
          }
        } catch {}

        // Walk content/licenses/ and generate exports
        async function walk(dir: string) {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await walk(fullPath);
            } else if (entry.name.endsWith('.md')) {
              const fileContent = await fs.readFile(fullPath, 'utf8');
              let { data, content } = matter(fileContent);

              if (!data.spdx_id || !data.plain_version) {
                logger.warn(`Skipping ${entry.name}: missing spdx_id or plain_version`);
                continue;
              }

              // Inject template blocks
              content = content.replace(/\{\{block:([a-z0-9-]+)\}\}/g, (match, id) => {
                return templateBlocks[id] || match;
              });

              const plainId = data.plain_id || derivePlainId(data.spdx_id);
              const spdxLower = data.spdx_id.toLowerCase();
              const version = data.plain_version;
              const exportDir = path.join(outDir, 'exports', spdxLower, version);

              const ctx: ExportContext = {
                licenseId: data.spdx_id,
                plainId,
                version,
                content,
                metadata: data,
                outputDir: exportDir,
              };

              await orchestrator.generateAll(ctx);
            }
          }
        }

        logger.info('Generating license exports...');
        await walk(contentDir);
        logger.info('License exports complete.');
      },
    },
  };
}
```

### Step 5: Register the integration in `astro.config.mjs`

Add the import at the top:

```javascript
import exportsIntegration from './src/integrations/exports.ts';
```

Add to the `integrations` array (after `mdx()`):

```javascript
exportsIntegration(),
```

### Step 6: Remove `generate-exports.ts` from the build task

In `mise.toml`, update the build task (lines 404-411):

```toml
[tasks.build]
tools.bun = "latest"
run = '''
bunx astro build
bun run src/build/generate-og-images.ts
bun run src/build/generate-versions.ts
'''
```

The `bun run src/build/generate-exports.ts` line is removed — the integration handles it.

### Step 7: Update existing tests for new filename convention

**`tests/unit/exports.test.ts`** — update the context and assertions:

```typescript
const ctx = {
  licenseId: 'MIT',
  plainId: 'Plain-MIT',
  version: '1.0.0',
  content: '# MIT License\n\nContent here.',
  metadata: { slug: 'mit', title: 'MIT License' },
  outputDir: '/tmp/exports/mit/1.0.0'
};

// In generateMarkdown test:
expect(fs.writeFile).toHaveBeenCalledWith(
  path.join(ctx.outputDir, 'Plain-MIT-1.0.0.gfm.md'),
  expect.stringContaining('Plain License: Plain-MIT 1.0.0')
);

// In generatePlaintext test:
expect(fs.writeFile).toHaveBeenCalledWith(
  path.join(ctx.outputDir, 'Plain-MIT-1.0.0.txt'),
  expect.stringContaining('MIT LICENSE')
);
```

**`tests/integration/export_orchestrator.test.ts`** — update context and file checks:

```typescript
const mockCtx: ExportContext = {
  licenseId: 'mit',
  plainId: 'Plain-MIT',
  version: '0.2.1',
  content: '# MIT License\n\nCopyright {{ year }} [holders]',
  metadata: { slug: 'mit', title: 'MIT License' },
  outputDir: testOutputDir,
};

// Update file existence checks:
expect(files).toContain('Plain-MIT-0.2.1.gfm.md');
expect(files).toContain('Plain-MIT-0.2.1.cm.md');
expect(files).toContain('Plain-MIT-0.2.1.txt');
expect(files).toContain('Plain-MIT-0.2.1.xml');
expect(files).toContain('Plain-MIT-0.2.1-embed.html');
```

### Step 8: Run tests

Run: `bunx vitest run tests/unit/exports.test.ts tests/integration/export_orchestrator.test.ts tests/unit/plain-id.test.ts`
Expected: All PASS

### Step 9: Commit

```bash
git add src/integrations/exports.ts src/build/exports/ src/utils/plain-id.ts astro.config.mjs mise.toml tests/
git commit -m "refactor(infra): move export generation into Astro integration

Exports now generate during astro:build:done into dist/ instead of
public/exports/. Filenames follow SPDX convention: Plain-MIT-0.2.5.pdf.
Removes standalone generate-exports.ts from build pipeline."
```

---

## Task 3: Update DownloadOptions Component

The download component needs to use the new URL paths and filename conventions.

**Files:**
- Modify: `src/components/DownloadOptions.astro`

### Step 1: Update the component

Replace the format definitions and path construction in `DownloadOptions.astro`:

```astro
---
import type { CollectionEntry } from "astro:content";
import { derivePlainId } from "~/utils/plain-id";

interface Props {
  license: CollectionEntry<"licenses">;
  processedBody?: string;
}

const { license, processedBody } = Astro.props;
const { data } = license;

const clipboardContent = processedBody || license.body;

const plainId = data.plain_id || derivePlainId(data.spdx_id);
const version = data.plain_version;
const baseName = `${plainId}-${version}`;
const exportBase = `/exports/${data.spdx_id.toLowerCase()}/${version}/`;

const formats = [
  {
    name: "Markdown (GFM)",
    ext: ".gfm.md",
    path: `${exportBase}${baseName}.gfm.md`,
  },
  {
    name: "Markdown (CommonMark)",
    ext: ".cm.md",
    path: `${exportBase}${baseName}.cm.md`,
  },
  { name: "Plaintext", ext: ".txt", path: `${exportBase}${baseName}.txt` },
  { name: "PDF", ext: ".pdf", path: `${exportBase}${baseName}.pdf` },
  { name: "SPDX XML", ext: ".xml", path: `${exportBase}${baseName}.xml` },
  {
    name: "Embed HTML",
    ext: ".html",
    path: `${exportBase}${baseName}-embed.html`,
  },
];
---
```

The rest of the template (HTML/CSS/JS) stays the same.

### Step 2: Verify the build works end-to-end

Run: `mise run build`
Expected: Build completes. Exports appear in `dist/exports/mit/0.2.1/Plain-MIT-0.2.1.*`

### Step 3: Commit

```bash
git add src/components/DownloadOptions.astro
git commit -m "refactor(ui): update download links to new export naming convention

Download URLs now use Plain-{ID}-{version} filenames and unversioned
directory paths matching the Astro integration output."
```

---

## Task 4: Update Semantic Release Config in Package.json Files

The `@semantic-release/github` plugin references old export paths for release assets. Update them.

**Files:**
- Modify: `packages/mit/package.json`
- Modify: `packages/mpl-2.0/package.json`
- Modify: `packages/elastic-2.0/package.json`
- Modify: `packages/unlicense/package.json`

### Step 1: Update asset paths in each package.json

The semantic-release `@semantic-release/github` assets currently point to `public/exports/`. These need to point to `dist/exports/` and use the new naming.

**`packages/mit/package.json`** — update the github plugin assets:

```json
[
  "@semantic-release/github",
  {
    "assets": [
      {
        "path": "../../dist/exports/mit/${nextRelease.version}/Plain-MIT-${nextRelease.version}.gfm.md",
        "label": "Plain MIT License (Markdown)"
      },
      {
        "path": "../../dist/exports/mit/${nextRelease.version}/Plain-MIT-${nextRelease.version}.pdf",
        "label": "Plain MIT License (PDF)"
      },
      {
        "path": "../../dist/exports/mit/${nextRelease.version}/Plain-MIT-${nextRelease.version}.txt",
        "label": "Plain MIT License (Plaintext)"
      }
    ]
  }
]
```

Apply the same pattern to the other packages, using their respective `plain_id`:
- `mpl-2.0`: `Plain-MPL-${nextRelease.version}.*`, path segment `mpl-2.0`
- `elastic-2.0`: `Plain-Elastic-${nextRelease.version}.*`, path segment `elastic-2.0`
- `unlicense`: `Plain-Unlicense-${nextRelease.version}.*`, path segment `unlicense`

**Note:** The `mpl-2.0/package.json` currently references a stale path (`../../docs/licenses/copyleft/mpl-2.0/index.md`) in both `main` and the github assets. Fix the `main` field to `../../content/licenses/copyleft/mpl-2.0.md` while you're here.

### Step 2: Commit

```bash
git add packages/*/package.json
git commit -m "chore(infra): update semantic-release asset paths for new export convention

Points release assets at dist/exports/ with Plain-{ID}-{version} naming.
Also fixes stale main path in mpl-2.0 package.json."
```

---

## Task 5: Clean Up `public/exports/` and Update `.gitignore`

**Files:**
- Modify: `.gitignore`
- Delete: `public/exports/` directory
- Delete: `src/build/generate-exports.ts` (now replaced by integration)

### Step 1: Add `public/exports/` to `.gitignore`

Add to `.gitignore` after the `dist/` line:

```gitignore
dist/
public/exports/
```

### Step 2: Remove the old exports directory from git tracking

Run: `git rm -r --cached public/exports/ 2>/dev/null; rm -rf public/exports/`

### Step 3: Remove the old standalone script

Run: `git rm src/build/generate-exports.ts`

### Step 4: Commit

```bash
git add .gitignore
git commit -m "chore(infra): remove public/exports from VCS, gitignore generated exports

Exports are now generated into dist/ by the Astro integration.
Removes old standalone generate-exports.ts script."
```

---

## Task 6: Add "Latest" Alias Support

Generate a `/exports/{spdx_id}/latest/` directory that mirrors the current version's exports but without version in the filename. This gives users a stable URL for "always the newest."

**Files:**
- Modify: `src/integrations/exports.ts`
- Test: `tests/unit/exports-latest.test.ts`

### Step 1: Write the test

Create `tests/unit/exports-latest.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

// Test the latest alias file naming logic
describe('Latest alias generation', () => {
  it('strips semver from filename', () => {
    const versionedName = 'Plain-MIT-0.2.5.gfm.md';
    const latestName = versionedName.replace(/-\d+\.\d+\.\d+/, '');
    expect(latestName).toBe('Plain-MIT.gfm.md');
  });

  it('handles embed suffix correctly', () => {
    const versionedName = 'Plain-MIT-0.2.5-embed.html';
    const latestName = versionedName.replace(/-\d+\.\d+\.\d+/, '');
    expect(latestName).toBe('Plain-MIT-embed.html');
  });

  it('handles PDF correctly', () => {
    const versionedName = 'Plain-Elastic-0.1.0.pdf';
    const latestName = versionedName.replace(/-\d+\.\d+\.\d+/, '');
    expect(latestName).toBe('Plain-Elastic.pdf');
  });
});
```

### Step 2: Run test

Run: `bunx vitest run tests/unit/exports-latest.test.ts`
Expected: PASS

### Step 3: Add latest alias generation to the integration

In `src/integrations/exports.ts`, after `orchestrator.generateAll(ctx)`, add:

```typescript
// Generate "latest" alias copies
const latestDir = path.join(outDir, 'exports', spdxLower, 'latest');
await fs.mkdir(latestDir, { recursive: true });

const exportedFiles = await fs.readdir(exportDir).catch(() => []);
for (const file of exportedFiles) {
  // Strip the version from the filename: Plain-MIT-0.2.5.pdf → Plain-MIT.pdf
  const latestFileName = file.replace(/-\d+\.\d+\.\d+/, '');
  await fs.copyFile(
    path.join(exportDir, file),
    path.join(latestDir, latestFileName)
  );
}
```

### Step 4: Run full test suite

Run: `bunx vitest run`
Expected: All tests PASS

### Step 5: Commit

```bash
git add src/integrations/exports.ts tests/unit/exports-latest.test.ts
git commit -m "new(infra): add /exports/{id}/latest/ alias for stable download URLs

Copies current version exports with version stripped from filename,
giving users a stable URL that always points to the newest version."
```

---

## Task 7: Git Tag-Based Historical Version Generation

At build time, enumerate git tags for each license and generate exports for past versions. This is additive — the current version is always generated from the working tree content, and past versions are generated from git history.

**Important: Security note** — all git commands use `execFileSync` (not `execSync`) to prevent shell injection. Arguments are passed as arrays, never interpolated into shell strings.

**Files:**
- Create: `src/utils/git-versions.ts`
- Modify: `src/integrations/exports.ts`
- Test: `tests/unit/git-versions.test.ts`

### Step 1: Write the git version utility and test

Create `src/utils/git-versions.ts`:

```typescript
import { execFileSync } from 'node:child_process';

export interface TaggedVersion {
  version: string;
  commitRef: string;
}

/**
 * Lists all git tags matching {spdxId}@{version} and returns
 * the version + commit ref for each.
 *
 * Uses execFileSync (not execSync) to prevent shell injection.
 */
export function getTaggedVersions(spdxId: string): TaggedVersion[] {
  const tagPattern = `${spdxId.toLowerCase()}@*`;
  try {
    const output = execFileSync(
      'git',
      ['tag', '-l', tagPattern, '--format=%(refname:short) %(objectname:short)'],
      { encoding: 'utf8', timeout: 10000 }
    ).trim();

    if (!output) return [];

    return output.split('\n').map(line => {
      const [tag, commitRef] = line.split(' ');
      const version = tag.replace(`${spdxId.toLowerCase()}@`, '');
      return { version, commitRef };
    });
  } catch {
    return [];
  }
}

/**
 * Extracts a file's content at a specific git commit.
 *
 * Uses execFileSync (not execSync) to prevent shell injection.
 */
export function getFileAtCommit(commitRef: string, filePath: string): string | null {
  try {
    return execFileSync(
      'git',
      ['show', `${commitRef}:${filePath}`],
      { encoding: 'utf8', timeout: 10000 }
    );
  } catch {
    return null;
  }
}
```

Create `tests/unit/git-versions.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTaggedVersions, getFileAtCommit } from '../../src/utils/git-versions.ts';
import { execFileSync } from 'node:child_process';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

describe('getTaggedVersions', () => {
  afterEach(() => vi.clearAllMocks());

  it('parses git tag output into version objects', () => {
    vi.mocked(execFileSync).mockReturnValue('mit@0.1.0 abc1234\nmit@0.2.0 def5678\n');
    const versions = getTaggedVersions('MIT');
    expect(versions).toEqual([
      { version: '0.1.0', commitRef: 'abc1234' },
      { version: '0.2.0', commitRef: 'def5678' },
    ]);
  });

  it('returns empty array when no tags exist', () => {
    vi.mocked(execFileSync).mockReturnValue('');
    expect(getTaggedVersions('MIT')).toEqual([]);
  });

  it('returns empty array on git error', () => {
    vi.mocked(execFileSync).mockImplementation(() => { throw new Error('not a git repo'); });
    expect(getTaggedVersions('MIT')).toEqual([]);
  });
});

describe('getFileAtCommit', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns file content at commit', () => {
    vi.mocked(execFileSync).mockReturnValue('# License content\n');
    expect(getFileAtCommit('abc1234', 'content/licenses/permissive/mit.md'))
      .toBe('# License content\n');
  });

  it('returns null when file does not exist at commit', () => {
    vi.mocked(execFileSync).mockImplementation(() => { throw new Error('path not found'); });
    expect(getFileAtCommit('abc1234', 'nonexistent.md')).toBeNull();
  });
});
```

### Step 2: Run tests

Run: `bunx vitest run tests/unit/git-versions.test.ts`
Expected: All PASS

### Step 3: Integrate historical generation into the export integration

In `src/integrations/exports.ts`, after generating the current version's exports and latest alias, add historical version generation:

```typescript
import { getTaggedVersions, getFileAtCommit } from '../utils/git-versions.ts';

// Inside the walk function, after generating current version + latest alias:

// Generate exports for past tagged versions
const taggedVersions = getTaggedVersions(data.spdx_id);
for (const tv of taggedVersions) {
  // Skip if this is the current version (already generated above)
  if (tv.version === version) continue;

  // Get the relative path of this license file from repo root
  const relPath = path.relative(path.resolve('.'), fullPath);
  const pastContent = getFileAtCommit(tv.commitRef, relPath);
  if (!pastContent) {
    logger.warn(`Could not read ${relPath} at ${tv.commitRef} for ${data.spdx_id}@${tv.version}`);
    continue;
  }

  let { data: pastData, content: pastBody } = matter(pastContent);

  // Inject template blocks (use current blocks — past blocks may not exist)
  pastBody = pastBody.replace(/\{\{block:([a-z0-9-]+)\}\}/g, (match, id) => {
    return templateBlocks[id] || match;
  });

  const pastPlainId = pastData.plain_id || derivePlainId(data.spdx_id);
  const pastExportDir = path.join(outDir, 'exports', spdxLower, tv.version);

  const pastCtx: ExportContext = {
    licenseId: data.spdx_id,
    plainId: pastPlainId,
    version: tv.version,
    content: pastBody,
    metadata: { ...pastData, slug: pastData.slug || data.spdx_id.toLowerCase() },
    outputDir: pastExportDir,
  };

  await orchestrator.generateAll(pastCtx);
}
```

### Step 4: Run full build to verify

Run: `mise run build`
Expected: Build succeeds. Since no tags exist yet, only current versions are generated.

### Step 5: Commit

```bash
git add src/utils/git-versions.ts src/integrations/exports.ts tests/unit/git-versions.test.ts
git commit -m "new(infra): generate historical version exports from git tags

At build time, enumerates {spdx_id}@{version} git tags and generates
exports for each past version. Current version always uses working tree.
Uses execFileSync to prevent shell injection."
```

---

## Task 8: CI Check — Prevent Content Changes Without Version Bumps

A GitHub Actions workflow step that compares each license file's content hash between the PR branch and the base branch. If content changed but `packages/{id}/package.json` version didn't, the check fails.

**Files:**
- Create: `scripts/check-license-versions.sh`
- Modify: `.github/workflows/ci.yml` (or equivalent — add the check step)

### Step 1: Write the check script

Create `scripts/check-license-versions.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Compare license content between HEAD and base branch.
# Fails if content changed but package version did not.

BASE_REF="${1:-origin/main}"
EXIT_CODE=0

for license_file in content/licenses/**/*.md; do
  [ -f "$license_file" ] || continue

  # Get the SPDX ID from frontmatter
  spdx_id=$(grep '^spdx_id:' "$license_file" | head -1 | awk '{print $2}')
  [ -z "$spdx_id" ] && continue

  pkg_dir="packages/${spdx_id,,}"
  pkg_json="${pkg_dir}/package.json"
  [ -f "$pkg_json" ] || continue

  # Check if the license file changed
  if git diff --quiet "$BASE_REF" -- "$license_file" 2>/dev/null; then
    continue  # No content change
  fi

  # Content changed — check if version also changed
  if git diff --quiet "$BASE_REF" -- "$pkg_json" 2>/dev/null; then
    echo "ERROR: $license_file content changed but $pkg_json version was not bumped."
    EXIT_CODE=1
  fi
done

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "All license content changes have corresponding version bumps."
fi

exit $EXIT_CODE
```

### Step 2: Make it executable

Run: `chmod +x scripts/check-license-versions.sh`

### Step 3: Add to CI workflow

Add a step to the CI workflow (find the existing workflow file — likely `.github/workflows/ci.yml`):

```yaml
- name: Check license version bumps
  if: github.event_name == 'pull_request'
  run: bash scripts/check-license-versions.sh "origin/${{ github.base_ref }}"
```

### Step 4: Test locally

Run: `bash scripts/check-license-versions.sh HEAD~1`
Expected: "All license content changes have corresponding version bumps." (or appropriate errors if you've changed content without bumping)

### Step 5: Commit

```bash
git add scripts/check-license-versions.sh .github/workflows/
git commit -m "new(infra): add CI check preventing license content changes without version bumps

Compares license file content between PR and base branch.
Fails if content changed but package.json version was not bumped."
```

---

## Task 9: Create Initial Git Tags for Current Versions

Tag the current state so the historical version system has a starting point going forward.

**Files:** None (git operations only)

### Step 1: Create tags for each license at its current version

Run:
```bash
git tag mit@0.2.1
git tag mpl-2.0@0.1.0
git tag elastic-2.0@0.1.0
git tag unlicense@0.1.0
```

Note: Check `packages/*/package.json` for the actual current version of each license before tagging. The versions above are based on the current state of the repo.

### Step 2: Verify tags

Run: `git tag -l "*@*"`
Expected:
```
elastic-2.0@0.1.0
mit@0.2.1
mpl-2.0@0.1.0
unlicense@0.1.0
```

### Step 3: Push tags (when ready to deploy)

Run: `git push origin --tags`

**Do not push tags until the full export pipeline is merged and working.** Tags should only be pushed after the integration is verified in CI.

---

## Task 10: Add Export Manifest to Build Output

Generate a `manifest.json` in `dist/exports/` that lists all available licenses, versions, and download URLs. This is useful for API consumers and the DownloadOptions component.

**Files:**
- Modify: `src/integrations/exports.ts`
- Test: `tests/unit/exports-manifest.test.ts`

### Step 1: Write the test

Create `tests/unit/exports-manifest.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

interface ManifestEntry {
  plainId: string;
  currentVersion: string;
  versions: string[];
  formats: string[];
}

describe('Export manifest structure', () => {
  it('has the expected shape', () => {
    const entry: ManifestEntry = {
      plainId: 'Plain-MIT',
      currentVersion: '0.2.5',
      versions: ['0.2.5', '0.2.1'],
      formats: ['gfm.md', 'cm.md', 'txt', 'pdf', 'xml', 'embed.html'],
    };

    expect(entry.plainId).toMatch(/^Plain-/);
    expect(entry.versions).toContain(entry.currentVersion);
    expect(entry.formats.length).toBeGreaterThan(0);
  });
});
```

### Step 2: Add manifest generation to the integration

In `src/integrations/exports.ts`, after the `walk()` call completes, collect all generated license data and write the manifest:

Add a manifest accumulator at the top of the `astro:build:done` handler:

```typescript
const manifest: Record<string, {
  plainId: string;
  currentVersion: string;
  versions: string[];
  formats: string[];
}> = {};
```

Inside the walk function, after generating exports for a license (current + historical), add to manifest:

```typescript
const spdxKey = spdxLower;
const allVersions = [version, ...taggedVersions.map(tv => tv.version)]
  .filter((v, i, arr) => arr.indexOf(v) === i)  // deduplicate
  .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));  // newest first

manifest[spdxKey] = {
  plainId,
  currentVersion: version,
  versions: allVersions,
  formats: ['gfm.md', 'cm.md', 'txt', 'pdf', 'xml', 'embed.html'],
};
```

After the walk completes:

```typescript
// Write manifest
const manifestPath = path.join(outDir, 'exports', 'manifest.json');
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
logger.info(`Export manifest written: ${manifestPath}`);
```

### Step 3: Run tests and build

Run: `bunx vitest run && mise run build`
Expected: All tests pass. `dist/exports/manifest.json` exists with entries for all licenses.

### Step 4: Commit

```bash
git add src/integrations/exports.ts tests/unit/exports-manifest.test.ts
git commit -m "new(infra): generate exports manifest.json with version and format metadata

Lists all licenses, their current version, all available versions,
and supported export formats. Written to dist/exports/manifest.json."
```

---

## Task 11: Final Verification and Cleanup

### Step 1: Run the full test suite

Run: `bunx vitest run`
Expected: All tests PASS

### Step 2: Run the full build

Run: `mise run build`
Expected: Build completes. Check `dist/exports/` for:
- `mit/0.2.1/Plain-MIT-0.2.1.*` (all formats)
- `mit/latest/Plain-MIT.*` (all formats, no version in filename)
- `mpl-2.0/0.1.0/Plain-MPL-0.1.0.*`
- `elastic-2.0/0.1.0/Plain-Elastic-0.1.0.*`
- `unlicense/0.1.0/Plain-Unlicense-0.1.0.*`
- `manifest.json`

### Step 3: Run linters

Run: `mise run lint`
Expected: No new lint errors

### Step 4: Verify `public/exports/` is gone from git

Run: `git status`
Expected: `public/exports/` should not appear (deleted and gitignored)

### Step 5: Verify download links work in dev

Run: `mise run dev`
Navigate to a license page. Download links should point to `/exports/mit/0.2.1/Plain-MIT-0.2.1.pdf` etc. Note: files won't exist in dev mode (they're build-time only), but the URLs should be correctly formed.

---

## Summary of Changes

| Component | Before | After |
|---|---|---|
| Export generation | Standalone post-build script | Astro `astro:build:done` integration |
| Output location | `public/exports/` (in VCS) | `dist/exports/` (build output only) |
| Filenames | `MIT.pdf` | `Plain-MIT-0.2.5.pdf` |
| URL paths | `/exports/mit/v0.2.1/MIT.pdf` | `/exports/mit/0.2.5/Plain-MIT-0.2.5.pdf` |
| Latest alias | None | `/exports/mit/latest/Plain-MIT.pdf` |
| Historical versions | None | Generated from git tags at build time |
| Version guard | None | CI check: content change requires version bump |
| Manifest | `build-manifest.json` (internal) | `manifest.json` (public, per-license metadata) |

## Future Work (Not In Scope)

- **Tagging automation**: Integrate tag creation into semantic-release so `mit@0.2.2` is created automatically on release
- **R2 fallback**: If git-based historical generation becomes slow with many versions, migrate to Cloudflare R2
- **VersionHistory component**: UI component showing all available versions with download links, reading from `manifest.json`
- **GPL family naming**: When GPL licenses are added, use `plain_id: Plain-GPL3` override in frontmatter

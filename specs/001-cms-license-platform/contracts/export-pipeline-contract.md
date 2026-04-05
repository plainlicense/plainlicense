# Export Pipeline Contract

**Feature**: 001-cms-license-platform
**Component**: Build-Time Export Generation + GitHub Releases
**Last Updated**: 2026-01-30

## Overview

This contract defines how Plain License generates multi-format exports during the build process and stores them in GitHub Releases. Export generation happens at build-time (not runtime) and produces 6 formats for each license.

**Key Principle**: Build-time generation = FREE forever (GitHub Actions unlimited for public repos, GitHub Releases = free permanent storage)

## Export Formats

### Supported Formats (6 Total)

1. **Markdown (GitHub Flavored)** - `.md`
2. **Markdown (CommonMark)** - `.md`
3. **Plain Text** - `.txt`
4. **PDF** - `.pdf`
5. **SPDX XML** - `.xml`
6. **Embed HTML** - `.html`

### Format Specifications

#### 1. Markdown (GitHub Flavored) - GFM

**Purpose**: GitHub README compatibility, maximum markdown feature support

**Output**: `{license-id}-gfm.md`

**Features**:

- GitHub-specific extensions (tables, task lists, strikethrough)
- Autolinked URLs
- Emoji support
- Syntax highlighting in code blocks

**Frontmatter**: Preserved as YAML frontmatter block

**Example**:

```markdown
---
title: MIT License (Plain Language)
spdx_id: MIT
version: 0.2.1
---

# MIT License (Plain Language)

## Permissions

We give you permission to:

- **Use** it
- **Copy** it
- **Change** it
...
```

#### 2. Markdown (CommonMark) - Standard

**Purpose**: Maximum portability, strict CommonMark spec compliance

**Output**: `{license-id}-commonmark.md`

**Features**:

- Pure CommonMark syntax (no extensions)
- Portable across all markdown parsers
- Predictable rendering

**Frontmatter**: REMOVED (CommonMark doesn't specify frontmatter)

**Example**:

```markdown
# MIT License (Plain Language)

**Version**: 0.2.1
**SPDX ID**: MIT

## Permissions

We give you permission to:

- **Use** it
- **Copy** it
...
```

#### 3. Plain Text

**Purpose**: Maximum compatibility, no formatting

**Output**: `{license-id}.txt`

**Format**:

- All markdown stripped
- Plain text only
- UTF-8 encoding
- Newlines preserved for readability

**Example**:

```
MIT LICENSE (PLAIN LANGUAGE)
Version: 0.2.1
SPDX ID: MIT

PERMISSIONS

We give you permission to:
- Use it
- Copy it
- Change it
...
```

#### 4. PDF

**Purpose**: Print-ready, professional presentation

**Output**: `{license-id}.pdf`

**Generation Tool**: Typst (27x faster than LaTeX, 356ms per PDF)
**Fallback**: Playwright headless browser (if Typst unavailable)

**Features**:

- Professional typography
- Page headers/footers with metadata
- Table of contents (if >2 pages)
- Proper page breaks
- Embedded metadata (title, author, version)

**Template**: Custom Typst template matching Plain License brand

**Example Metadata**:

```
Title: MIT License (Plain Language)
Author: Plain License Team
Version: 0.2.1
Created: 2026-01-30
```

#### 5. SPDX XML

**Purpose**: License metadata in SPDX format for tooling integration

**Output**: `{license-id}-spdx.xml`

**Format**: SPDX License XML Schema
**Spec**: <https://spdx.org/rdf/terms/>

**Example**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<SPDXLicenseCollection xmlns="http://spdx.org/rdf/terms/">
  <license licenseId="MIT" name="MIT License" isOsiApproved="true">
    <crossRefs>
      <crossRef>https://plainlicense.org/licenses/mit</crossRef>
      <crossRef>https://opensource.org/licenses/MIT</crossRef>
    </crossRefs>
    <licenseText>
      <![CDATA[
        [Plain language license text here]
      ]]>
    </licenseText>
    <standardLicenseHeader>
      <![CDATA[
        MIT License (Plain Language) - Version 0.2.1
      ]]>
    </standardLicenseHeader>
  </license>
</SPDXLicenseCollection>
```

#### 6. Embed HTML

**Purpose**: Copy-paste embeddable snippet for websites

**Output**: `{license-id}-embed.html`

**Format**: Self-contained HTML with inline CSS, no external dependencies

**Features**:

- Scoped CSS (no global pollution)
- Dark mode support (prefers-color-scheme)
- Responsive design
- Accessible markup (ARIA labels, semantic HTML)
- Copy button (clipboard.js inline)

**Example**:

```html
<div class="plain-license-embed" data-license="MIT" data-version="0.2.1">
  <style scoped>
    .plain-license-embed { /* styles */ }
  </style>

  <header>
    <h2>MIT License (Plain Language)</h2>
    <span class="version">Version 0.2.1</span>
  </header>

  <section class="content">
    <!-- License content with styling -->
  </section>

  <footer>
    <a href="https://plainlicense.org/licenses/mit">View Full License</a>
    <button class="copy-button">Copy to Clipboard</button>
  </footer>

  <script>
    // Inline clipboard functionality
  </script>
</div>
```

## Build Pipeline Architecture

### Build Process Flow

```
Git Push to main/dev
    ↓
GitHub Actions Trigger
    ↓
Astro Build (Static Site)
    ↓
Export Generation (Parallel)
    ├─ Markdown Exports (GFM + CommonMark)
    ├─ Plain Text Export
    ├─ PDF Export (Typst)
    ├─ SPDX XML Export
    └─ Embed HTML Export
    ↓
Asset Collection
    ↓
GitHub Release Creation
    ├─ Tag: v{version} (e.g., v0.2.1)
    ├─ Attach: All 6 formats × N licenses
    └─ Release Notes: Changelog
    ↓
Cloudflare Pages Deployment (Static Site)
```

### GitHub Actions Workflow

**File**: `.github/workflows/build-and-deploy.yml`

```yaml
name: Build and Deploy

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  build-and-export:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install Dependencies
        run: bun install

      - name: Build Static Site
        run: bun run build
        # Astro builds to dist/

      - name: Generate Exports
        run: bun run exports:generate
        # Custom script generates all formats
        # Outputs to exports/ directory

      - name: Create GitHub Release (if main branch)
        if: github.ref == 'refs/heads/main'
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ env.VERSION }}
          files: exports/**/*
          body_path: CHANGELOG.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: plainlicense
          directory: dist
```

### Export Generation Script

**File**: `scripts/generate-exports.ts`

```typescript
import { getCollection } from 'astro:content';
import { generateMarkdown } from './exporters/markdown';
import { generatePlainText } from './exporters/plaintext';
import { generatePDF } from './exporters/pdf';
import { generateSPDX } from './exporters/spdx';
import { generateEmbed } from './exporters/embed';

interface ExportOptions {
  license: LicenseEntry;
  outputDir: string;
}

async function generateExports() {
  const licenses = await getCollection('licenses');
  const outputDir = './exports';

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  // Generate exports for each license (parallel)
  await Promise.all(
    licenses.map(async (license) => {
      const opts: ExportOptions = { license, outputDir };

      // Run all format generators in parallel
      await Promise.all([
        generateMarkdown(opts, 'gfm'),
        generateMarkdown(opts, 'commonmark'),
        generatePlainText(opts),
        generatePDF(opts),
        generateSPDX(opts),
        generateEmbed(opts),
      ]);

      console.log(`✓ Generated exports for ${license.data.spdx_id}`);
    })
  );

  console.log(`\n✓ Generated ${licenses.length * 6} export files`);
}

generateExports().catch(console.error);
```

## Export Generation Implementations

### Markdown Exporter

```typescript
// scripts/exporters/markdown.ts
import { marked } from 'marked';
import yaml from 'js-yaml';

export async function generateMarkdown(
  opts: ExportOptions,
  flavor: 'gfm' | 'commonmark'
): Promise<void> {
  const { license, outputDir } = opts;
  const { Content } = await license.render();

  // Render content to HTML, then convert to markdown
  const html = await renderToString(Content);

  if (flavor === 'gfm') {
    // Include frontmatter
    const frontmatter = yaml.dump(license.data);
    const markdown = `---\n${frontmatter}---\n\n${html}`;

    const filename = `${license.slug}-gfm.md`;
    await fs.writeFile(`${outputDir}/${filename}`, markdown);

  } else {
    // CommonMark: no frontmatter, metadata in header
    const header = `# ${license.data.title}\n\n**Version**: ${license.data.version}  \n**SPDX ID**: ${license.data.spdx_id}\n\n`;
    const markdown = header + html;

    const filename = `${license.slug}-commonmark.md`;
    await fs.writeFile(`${outputDir}/${filename}`, markdown);
  }
}
```

### Plain Text Exporter

```typescript
// scripts/exporters/plaintext.ts
import { convert } from 'html-to-text';

export async function generatePlainText(opts: ExportOptions): Promise<void> {
  const { license, outputDir } = opts;
  const { Content } = await license.render();

  // Render to HTML
  const html = await renderToString(Content);

  // Convert HTML to plain text
  const text = convert(html, {
    wordwrap: 80,
    preserveNewlines: true,
    uppercaseHeadings: true,
  });

  // Add header
  const header = `${license.data.title.toUpperCase()}\nVersion: ${license.data.version}\nSPDX ID: ${license.data.spdx_id}\n\n`;
  const output = header + text;

  const filename = `${license.slug}.txt`;
  await fs.writeFile(`${outputDir}/${filename}`, output, 'utf-8');
}
```

### PDF Exporter (Typst)

```typescript
// scripts/exporters/pdf.ts
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function generatePDF(opts: ExportOptions): Promise<void> {
  const { license, outputDir } = opts;
  const { Content } = await license.render();

  // Render to Typst format
  const typstContent = await convertToTypst(license);

  // Write temporary .typ file
  const typFile = `${outputDir}/${license.slug}.typ`;
  await fs.writeFile(typFile, typstContent);

  // Generate PDF with Typst (safe: no shell injection)
  try {
    await execFileAsync('typst', [
      'compile',
      typFile,
      `${outputDir}/${license.slug}.pdf`
    ]);

    // Clean up .typ file
    await fs.unlink(typFile);

  } catch (error) {
    console.warn(`Typst failed, falling back to Playwright for ${license.slug}`);
    await generatePDFWithPlaywright(opts);
  }
}

async function convertToTypst(license: LicenseEntry): Promise<string> {
  return `
#set document(
  title: "${license.data.title}",
  author: "Plain License Team",
)
#set page(
  paper: "us-letter",
  margin: (x: 1in, y: 1in),
  header: [${license.data.title} - v${license.data.version}],
  numbering: "1",
)

#align(center)[
  #text(24pt, weight: "bold")[${license.data.title}]

  Version ${license.data.version}

  SPDX ID: ${license.data.spdx_id}
]

${await renderToTypst(license)}
`;
}

async function generatePDFWithPlaywright(opts: ExportOptions): Promise<void> {
  // Fallback using Playwright headless browser
  const { license, outputDir } = opts;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Render HTML
  const html = await renderToHTMLPage(license);
  await page.setContent(html);

  // Generate PDF
  await page.pdf({
    path: `${outputDir}/${license.slug}.pdf`,
    format: 'Letter',
    printBackground: true,
    margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
  });

  await browser.close();
}
```

### SPDX XML Exporter

```typescript
// scripts/exporters/spdx.ts
import { create } from 'xmlbuilder2';

export async function generateSPDX(opts: ExportOptions): Promise<void> {
  const { license, outputDir } = opts;
  const { Content } = await license.render();

  // Render content to plain text
  const text = await renderToPlainText(Content);

  // Build SPDX XML
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('SPDXLicenseCollection', {
      xmlns: 'http://spdx.org/rdf/terms/'
    })
      .ele('license', {
        licenseId: license.data.spdx_id,
        name: license.data.title,
        isOsiApproved: license.data.is_osi_approved,
      })
        .ele('crossRefs')
          .ele('crossRef').txt(`https://plainlicense.org/licenses/${license.slug}`).up()
          .ele('crossRef').txt(license.data.canonical_url || '').up()
        .up()
        .ele('licenseText').dat(text).up()
        .ele('standardLicenseHeader').dat(
          `${license.data.title} - Version ${license.data.version}`
        ).up()
      .up()
    .end({ prettyPrint: true });

  const filename = `${license.slug}-spdx.xml`;
  await fs.writeFile(`${outputDir}/${filename}`, doc);
}
```

### Embed HTML Exporter

```typescript
// scripts/exporters/embed.ts
export async function generateEmbed(opts: ExportOptions): Promise<void> {
  const { license, outputDir } = opts;
  const { Content } = await license.render();

  // Render content
  const html = await renderToString(Content);

  // Generate self-contained HTML
  const embed = `
<div class="plain-license-embed" data-license="${license.data.spdx_id}" data-version="${license.data.version}">
  <style scoped>
    .plain-license-embed {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 2rem auto;
      padding: 2rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fff;
    }
    .plain-license-embed header {
      border-bottom: 2px solid #000;
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
    }
    .plain-license-embed h2 {
      margin: 0;
      font-size: 1.5rem;
    }
    .plain-license-embed .version {
      color: #666;
      font-size: 0.875rem;
    }
    @media (prefers-color-scheme: dark) {
      .plain-license-embed {
        background: #1a1a1a;
        border-color: #333;
        color: #e0e0e0;
      }
      .plain-license-embed header {
        border-bottom-color: #fff;
      }
    }
  </style>

  <header>
    <h2>${license.data.title}</h2>
    <span class="version">Version ${license.data.version}</span>
  </header>

  <section class="content">
    ${html}
  </section>

  <footer>
    <a href="https://plainlicense.org/licenses/${license.slug}">View Full License</a>
    <button class="copy-button" onclick="copyLicense()">Copy to Clipboard</button>
  </footer>

  <script>
    function copyLicense() {
      const content = document.querySelector('.plain-license-embed .content').innerText;
      navigator.clipboard.writeText(content).then(() => {
        alert('License copied to clipboard!');
      });
    }
  </script>
</div>
`;

  const filename = `${license.slug}-embed.html`;
  await fs.writeFile(`${outputDir}/${filename}`, embed);
}
```

## GitHub Releases Storage

### Release Structure

**Tag**: `v{version}` (e.g., `v0.2.1`)

**Assets** (6 formats × N licenses):

```
mit-gfm.md
mit-commonmark.md
mit.txt
mit.pdf
mit-spdx.xml
mit-embed.html
mpl-2-0-gfm.md
mpl-2-0-commonmark.md
...
```

**Release Notes**: Auto-generated from CHANGELOG.md

### Download URLs

Permanent URLs for releases:

```
https://github.com/plainlicense/plainlicense/releases/download/v0.2.1/mit-gfm.md
https://github.com/plainlicense/plainlicense/releases/download/v0.2.1/mit.pdf
https://github.com/plainlicense/plainlicense/releases/download/v0.2.1/mit-spdx.xml
```

### Website Integration

Display download links on license pages:

```astro
---
const version = license.data.version;
const releaseUrl = `https://github.com/plainlicense/plainlicense/releases/download/v${version}`;
---

<section class="downloads">
  <h3>Download</h3>
  <ul>
    <li><a href="{releaseUrl}/{license.slug}-gfm.md">Markdown (GFM)</a></li>
    <li><a href="{releaseUrl}/{license.slug}-commonmark.md">Markdown (CommonMark)</a></li>
    <li><a href="{releaseUrl}/{license.slug}.txt">Plain Text</a></li>
    <li><a href="{releaseUrl}/{license.slug}.pdf">PDF</a></li>
    <li><a href="{releaseUrl}/{license.slug}-spdx.xml">SPDX XML</a></li>
    <li><a href="{releaseUrl}/{license.slug}-embed.html">Embed HTML</a></li>
  </ul>
</section>
```

## Performance Benchmarks

### Build Time Estimates

**Per License** (6 formats):

- Markdown (GFM): ~50ms
- Markdown (CommonMark): ~50ms
- Plain Text: ~100ms
- PDF (Typst): ~356ms
- SPDX XML: ~75ms
- Embed HTML: ~100ms

**Total per license**: ~731ms

**10 Licenses**: ~7.3 seconds
**20 Licenses**: ~14.6 seconds
**50 Licenses**: ~36.5 seconds

**Parallelization**: Running 4 licenses in parallel reduces to ~9 seconds for 20 licenses

### GitHub Actions Limits

- **Build Minutes**: Unlimited for public repos ✅
- **Storage**: 500MB per file (exports are KB-scale) ✅
- **Bandwidth**: Unlimited downloads from GitHub Releases ✅
- **Cost**: $0.00/month forever ✅

## Error Handling

### Export Generation Failures

**Typst Not Installed**:

```
Warning: Typst not found, falling back to Playwright for PDF generation
License: MIT
Fallback: Using headless browser (slower but works)
```

**Invalid License Content**:

```
Error: Failed to generate export for license: MIT
Format: PDF
Reason: Markdown parsing error at line 45
Action: Fix content in content/licenses/mit.md
```

### GitHub Release Failures

**Tag Already Exists**:

```
Error: Release tag v0.2.1 already exists
Action: Increment version or delete existing release
```

**Upload Failure**:

```
Error: Failed to upload assets to GitHub Release
Reason: Network timeout
Action: GitHub Actions will retry automatically (3 attempts)
```

## Success Criteria

### Performance ✅

- **Build Time**: <1 minute for full site + exports (20 licenses)
- **Per-Format**: Each format generates in <500ms per license
- **Parallel**: 4+ licenses processed simultaneously

### Quality ✅

- **Format Validity**: All exports validate against format specs
- **Content Accuracy**: Exports match source license content 100%
- **Accessibility**: PDF and HTML exports meet accessibility standards

### Cost ✅

- **Infrastructure**: $0.00/month (GitHub Actions + Releases = free)
- **Bandwidth**: Unlimited downloads from GitHub Releases
- **Storage**: Free permanent storage in releases

## Related Contracts

- **CMS Content Contract** (`cms-content-contract.md`): Source content for exports
- **Astro Content Contract** (`astro-content-contract.md`): How Astro provides content
- **Mapping Data Contract** (`mapping-data-contract.md`): Mapping data not exported (yet)

## References

- Typst: <https://typst.app/>
- GitHub Actions: <https://docs.github.com/en/actions>
- GitHub Releases: <https://docs.github.com/en/repositories/releasing-projects-on-github>
- SPDX XML: <https://spdx.org/rdf/terms/>
- CommonMark Spec: <https://commonmark.org/>
- GitHub Flavored Markdown: <https://github.github.com/gfm/>

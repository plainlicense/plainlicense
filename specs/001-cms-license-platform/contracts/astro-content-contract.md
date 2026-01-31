# Astro Content Contract

**Feature**: 001-cms-license-platform
**Component**: Git Repository → Astro Static Site Generator
**Last Updated**: 2026-01-30

## Overview

This contract defines how Astro consumes content from the Git repository, validates schemas, generates routes, and renders pages. Astro uses Content Collections with Zod schema validation to ensure type safety.

**Key Principle**: Astro reads markdown files from `content/` directory, validates frontmatter against Zod schemas, and generates static pages.

## Content Collections Definition

### File Structure

```
src/content/
├── config.ts              # Content collection schemas
├── licenses/              # Symlink or copy from content/licenses/
│   ├── mit.md
│   └── ...
├── blog/                  # Symlink or copy from content/blog/
│   └── ...
└── mappings/              # Symlink or copy from content/mappings/
    └── ...
```

**Build Strategy**: Symlink `content/` → `src/content/` for development, copy for production build.

### Collection Configuration (src/content/config.ts)

```typescript
import { defineCollection, z } from 'astro:content';

// License collection schema
const licensesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // === Required Fields ===
    title: z.string().min(1).max(100),
    spdx_id: z.string().regex(/^[A-Z0-9.-]+$|^custom-[a-z0-9-]+$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    original_version: z.string(),
    description: z.string().min(1).max(300),
    license_type: z.enum(['permissive', 'copyleft', 'source-available']),
    is_osi_approved: z.boolean(),
    is_fsf_approved: z.boolean(),

    // === Optional Fields ===
    fair_code: z.boolean().optional().default(false),
    summary: z.string().optional(),
    use_cases: z.array(z.string()).optional(),
    restrictions: z.object({
      commercial_use: z.boolean().optional(),
      attribution_required: z.boolean().optional(),
      share_alike: z.boolean().optional(),
    }).optional(),
    canonical_url: z.string().url().optional(),
    created_date: z.string().optional(),
    last_modified: z.string().optional(),
    author: z.string().optional(),
    meta_description: z.string().optional(),
    og_image: z.string().optional(),
    has_mapping: z.boolean().optional().default(false),
    mapping_version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
    show_original_comparison: z.boolean().optional().default(true),
    show_shame_counter: z.boolean().optional().default(true),
    featured: z.boolean().optional().default(false),
  }).refine(
    (data) => {
      // If fair_code is true, license_type must be source-available
      if (data.fair_code && data.license_type !== 'source-available') {
        return false;
      }
      return true;
    },
    {
      message: "fair_code licenses must have license_type 'source-available'",
    }
  ),
});

// Blog collection schema
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    author: z.string(),
    description: z.string().min(1).max(300),
    tags: z.array(z.string()).optional(),
    category: z.enum(['announcements', 'tutorials', 'updates']).optional(),
    featured: z.boolean().optional().default(false),
    og_image: z.string().optional(),
  }),
});

// Export collections
export const collections = {
  'licenses': licensesCollection,
  'blog': blogCollection,
};
```

## Type Safety

### Generated Types

Astro automatically generates TypeScript types from collection schemas:

```typescript
// Auto-generated in .astro/types.d.ts
type CollectionEntry<'licenses'> = {
  id: string;
  slug: string;
  body: string;
  collection: 'licenses';
  data: {
    title: string;
    spdx_id: string;
    version: string;
    // ... all schema fields
  };
};
```

### Using Types in Pages

```typescript
// src/pages/licenses/[...slug].astro
import { getCollection, type CollectionEntry } from 'astro:content';

type LicenseEntry = CollectionEntry<'licenses'>;

export async function getStaticPaths() {
  const licenses = await getCollection('licenses');

  return licenses.map((license: LicenseEntry) => ({
    params: { slug: license.slug },
    props: { license },
  }));
}

const { license } = Astro.props as { license: LicenseEntry };
const { Content } = await license.render();

// Type-safe access to frontmatter
const title = license.data.title;           // string
const version = license.data.version;       // string (validated semver)
const featured = license.data.featured;     // boolean (defaults to false)
```

## Routing Strategy

### License Pages

**Source**: `content/licenses/mit.md`
**URL**: `/licenses/mit/`
**Route**: `src/pages/licenses/[...slug].astro`

**Slug Generation**:
1. Filename without extension becomes slug
2. `mit.md` → slug: `mit`
3. `mpl-2-0.md` → slug: `mpl-2-0`
4. URL: `/licenses/{slug}/`

### Blog Posts

**Source**: `content/blog/2026-01-30-introducing-plain-license.md`
**URL**: `/blog/introducing-plain-license/` or `/blog/2026-01-30-introducing-plain-license/`
**Route**: `src/pages/blog/[...slug].astro`

**Slug Generation Options**:
1. **Date + Slug**: Keep date in URL (SEO, uniqueness)
2. **Slug Only**: Remove date from URL (cleaner, requires unique titles)

**Recommendation**: Date + Slug for uniqueness and chronological SEO.

### Index Pages

**Licenses Index**: `/licenses/` → `src/pages/licenses/index.astro`
**Blog Index**: `/blog/` → `src/pages/blog/index.astro`

## Data Fetching

### Get All Licenses

```typescript
import { getCollection } from 'astro:content';

// Get all licenses
const allLicenses = await getCollection('licenses');

// Filter featured licenses
const featuredLicenses = await getCollection('licenses', ({ data }) => {
  return data.featured === true;
});

// Filter by license type
const permissiveLicenses = await getCollection('licenses', ({ data }) => {
  return data.license_type === 'permissive';
});

// Sort by version (descending)
const sortedLicenses = allLicenses.sort((a, b) => {
  return b.data.version.localeCompare(a.data.version, undefined, { numeric: true });
});
```

### Get Single License

```typescript
import { getEntry } from 'astro:content';

// Get by slug (filename without extension)
const mitLicense = await getEntry('licenses', 'mit');

if (mitLicense) {
  const { data, render } = mitLicense;
  const { Content } = await render();

  // Use data (frontmatter)
  console.log(data.title);  // "MIT License (Plain Language)"

  // Render content (markdown body)
  <Content />
}
```

## Mapping Data Integration

### Loading Mapping JSON

```typescript
// src/utils/mappings.ts
import type { MappingData } from '../types/mappings';

export async function loadMapping(licenseId: string): Promise<MappingData | null> {
  try {
    // Dynamic import of JSON (Vite handles this)
    const mapping = await import(`../content/mappings/${licenseId}-mapping.json`);
    return mapping.default as MappingData;
  } catch (error) {
    console.warn(`Mapping not found for license: ${licenseId}`);
    return null;
  }
}

// Usage in page
const license = await getEntry('licenses', 'mit');
const mapping = license.data.has_mapping
  ? await loadMapping(license.data.spdx_id)
  : null;
```

### Mapping TypeScript Interface

```typescript
// src/types/mappings.ts
export interface MappingData {
  license_id: string;
  version: string;
  mapping_philosophy: string;
  generation_method?: string;
  ai_model?: string;
  human_reviewed?: boolean;
  semantic_tags?: Record<string, string[]>;
  mappings: Mapping[];
  validation?: {
    tags_with_changes?: string[];
    mappings_needing_review?: string[];
    last_content_hash_check?: string;
    validation_status?: 'valid' | 'needs_review' | 'invalid';
  };
  metadata?: {
    total_mappings?: number;
    mapping_types?: Record<string, number>;
    average_confidence?: number;
  };
}

export interface Mapping {
  id: string;
  type: 'one-to-one' | 'one-to-one-expanded' | 'one-to-many' | 'many-to-one' | 'many-to-many' | 'unmapped-plain' | 'unmapped-original';
  plain_clause?: Clause | Clause[] | null;
  original_clause?: Clause | Clause[] | null;
  confidence?: number | null;
  expansion_type?: string;
  semantic_tag?: string;
  notes?: string;
}

export interface Clause {
  id: string;
  semantic_tag?: string;
  hash: string;
  content: string;
  context?: string;
  line_start?: number;
  line_end?: number;
  section_heading?: string;
}
```

## Rendering License Pages

### Page Structure (src/pages/licenses/[...slug].astro)

```astro
---
import { getCollection, getEntry } from 'astro:content';
import Layout from '../../layouts/Layout.astro';
import { loadMapping } from '../../utils/mappings';

export async function getStaticPaths() {
  const licenses = await getCollection('licenses');
  return licenses.map(license => ({
    params: { slug: license.slug },
    props: { license },
  }));
}

const { license } = Astro.props;
const { Content } = await license.render();

// Load mapping if available
const mapping = license.data.has_mapping
  ? await loadMapping(license.data.spdx_id)
  : null;

// Load original license text
const originalUrl = `/original-licenses/${license.data.spdx_id}.txt`;

// SEO metadata
const title = license.data.title;
const description = license.data.meta_description || license.data.description;
const ogImage = license.data.og_image || `/og/licenses/${license.slug}.png`;
---

<Layout title={title} description={description} ogImage={ogImage}>
  <!-- License Header -->
  <header>
    <h1>{license.data.title}</h1>
    <p class="version">Version {license.data.version}</p>
    <p class="description">{license.data.description}</p>
  </header>

  <!-- Plain Language Content -->
  <article class="license-content">
    <Content />
  </article>

  <!-- Comparison View (if enabled) -->
  {license.data.show_original_comparison && mapping && (
    <section class="comparison">
      <h2>Compare Plain vs Original</h2>
      <div id="mapping-viewer" data-mapping={JSON.stringify(mapping)}></div>
    </section>
  )}

  <!-- Metadata Footer -->
  <footer class="license-metadata">
    <dl>
      <dt>SPDX ID:</dt>
      <dd>{license.data.spdx_id}</dd>

      <dt>License Type:</dt>
      <dd>{license.data.license_type}</dd>

      {license.data.is_osi_approved && (
        <>
          <dt>OSI Approved:</dt>
          <dd>Yes</dd>
        </>
      )}

      {license.data.canonical_url && (
        <>
          <dt>Official Version:</dt>
          <dd><a href={license.data.canonical_url}>View Original</a></dd>
        </>
      )}
    </dl>
  </footer>
</Layout>

<script>
  // Client-side mapping UI hydration
  import { initMappingViewer } from '../../components/MappingViewer';

  const viewer = document.getElementById('mapping-viewer');
  if (viewer) {
    const mappingData = JSON.parse(viewer.dataset.mapping || '{}');
    initMappingViewer(viewer, mappingData);
  }
</script>
```

## Build Process

### Build Pipeline

```
Git Repository (content/)
    ↓
Content Collections Validation (Zod)
    ↓
Static Page Generation (Astro)
    ↓
Asset Optimization (Vite)
    ↓
Static Site Output (dist/)
    ↓
Deployment (Cloudflare Pages)
```

### Build Commands

```bash
# Development (with hot reload)
npm run dev
# → Astro reads content/, validates schemas, serves on localhost

# Production Build
npm run build
# → Validates all content
# → Generates static pages
# → Optimizes assets
# → Outputs to dist/

# Preview Production Build
npm run preview
```

### Build-Time Validation

**Schema Validation** (Zod):
- Invalid frontmatter → Build fails with error
- Missing required fields → Build fails with error
- Type mismatches → Build fails with error

**Content Validation**:
- Broken internal links → Warning (configurable to block)
- Missing images → Warning (configurable to block)
- Invalid markdown → Build fails with parse error

**Cross-Reference Validation**:
- `has_mapping: true` but no mapping file → Warning
- Mapping file but `has_mapping: false` → Warning
- Invalid mapping JSON → Error (imported as module)

## Performance Optimization

### Static Generation Benefits

1. **All pages pre-rendered**: No server-side processing at runtime
2. **Asset optimization**: Images, CSS, JS optimized by Vite
3. **CDN deployment**: Static files served from Cloudflare edge
4. **Zero-JS by default**: HTML/CSS only, JS for interactive features only

### Content Caching

```typescript
// Cache collection queries during build
import { getCollection } from 'astro:content';

// This is cached during build - only runs once
const allLicenses = await getCollection('licenses');

// Reuse cached data throughout build
export const licenseCount = allLicenses.length;
export const featuredLicenses = allLicenses.filter(l => l.data.featured);
```

### Partial Hydration

```astro
<!-- Mapping viewer: Client-side JS only for interactive component -->
<div id="mapping-viewer" data-mapping={JSON.stringify(mapping)}>
  <!-- Server-rendered fallback content -->
  <noscript>
    <p>Enable JavaScript to view interactive mapping comparison.</p>
  </noscript>
</div>

<script>
  // Only loads/hydrates on client
  import { initMappingViewer } from '../../components/MappingViewer';
  initMappingViewer(/* ... */);
</script>
```

## Error Handling

### Build Errors

**Invalid Schema**:
```
[ERROR] [content] Invalid frontmatter in content/licenses/mit.md
  version: Expected string matching /^\d+\.\d+\.\d+$/, received "1.0"
```

**Missing Collection**:
```
[ERROR] [astro] Collection 'licenses' not found
  Did you forget to export it from src/content/config.ts?
```

**Invalid Reference**:
```
[WARN] [astro] License 'MIT' has has_mapping: true but mapping file not found
  Expected: content/mappings/MIT-mapping.json
```

### Runtime Errors (Dev Only)

Development server shows helpful errors:
- Schema validation failures
- Missing files
- Broken imports
- Invalid JSON

Production build fails fast on any error.

## Success Criteria

### Type Safety ✅
- Frontmatter fields fully typed via Zod
- TypeScript errors for invalid access
- Autocomplete for all frontmatter fields

### Build Performance ✅
- Full site rebuild: <30 seconds (20-25 licenses)
- Incremental builds: <5 seconds (single file change)
- Dev server hot reload: <1 second

### Content Validation ✅
- Invalid content blocks build (fail-fast)
- Clear error messages with file/line references
- Pre-commit validation via Git hooks

## Related Contracts

- **CMS Content Contract** (`cms-content-contract.md`): How content is authored
- **Mapping Data Contract** (`mapping-data-contract.md`): Mapping JSON schema
- **Export Pipeline Contract** (`export-pipeline-contract.md`): Export generation

## References

- Astro Content Collections: https://docs.astro.build/en/guides/content-collections/
- Zod Schema Validation: https://zod.dev/
- Astro Routing: https://docs.astro.build/en/core-concepts/routing/
- Vite Build Optimization: https://vitejs.dev/guide/build.html

# Template Block Reference Contract

**Component**: Template Block System
**Purpose**: Define how licenses reference and validate template blocks (boilerplate text)
**Priority**: MEDIUM - Content integrity requirement
**Related**: FR-003 (Template Library), FR-052 (Content Validation), T026-T032 (Template implementation)

---

## Overview

Template blocks provide centralized, reusable boilerplate text (warranty disclaimers, permission lists, condition statements) that can be inserted into license content. This contract defines the reference format, validation rules, and migration strategy to prevent broken references.

---

## Template Block Structure

### File System Organization

```text
content/template-blocks/
├── warranty/
│   ├── as-is.md              # "We offer the work as-is with no warranties"
│   ├── no-liability.md       # Standard liability disclaimer
│   └── merchantability.md    # Merchantability disclaimer
├── permission/
│   ├── use-copy-modify.md    # "You are free to use, copy, and modify"
│   ├── distribute.md         # Distribution permission
│   └── sell.md               # Commercial use permission
├── condition/
│   ├── attribution.md        # Attribution requirement
│   ├── share-alike.md        # Share-alike condition
│   └── notice-preservation.md # License notice preservation
└── limitation/
    ├── trademark.md          # Trademark limitation
    ├── patent-termination.md # Patent termination clause
    └── no-endorsement.md     # Endorsement limitation
```

### Template Block File Format

**File**: `content/template-blocks/warranty/as-is.md`

```yaml
---
id: as-is
category: warranty
title: "As-Is Warranty Disclaimer"
description: "Standard disclaimer that work is provided without warranties"
voice_tags: ["plain", "friendly", "transparent"]
usage_count: 0  # Auto-incremented by build system
created_date: 2026-01-30
last_modified: 2026-01-30
---

We offer the work "as is" with no warranties. We are not responsible for any damages or issues that arise from using it. Use it at your own risk.
```

**Zod Schema** (in `src/content/config.ts`):
```typescript
const templateBlockSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),  // kebab-case only
  category: z.enum(['warranty', 'permission', 'condition', 'limitation']),
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(500),
  voice_tags: z.array(z.string()),
  usage_count: z.number().int().nonnegative().default(0),
  created_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  last_modified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
```

---

## Reference Format

### In License Frontmatter

**File**: `content/licenses/permissive/mit.md`

```yaml
---
license_id: MIT
title: "MIT License"
category: permissive
# ... other frontmatter fields ...

template_blocks:
  - warranty.as-is           # References: content/template-blocks/warranty/as-is.md
  - permission.use-copy-modify
  - limitation.trademark
---

# MIT License

You are free to use, copy, modify, and distribute this work...

## Warranty

{{template:warranty.as-is}}  # Insertion point in content
```

### Reference Syntax

**Format**: `{category}.{id}`

**Examples**:
```yaml
Valid References:
  - warranty.as-is
  - permission.use-copy-modify
  - condition.attribution
  - limitation.no-endorsement

Invalid References:
  - warranty/as-is           # Wrong separator (use dot, not slash)
  - as-is                    # Missing category
  - warranty.AsIs            # Wrong case (must be kebab-case)
  - warranty.as_is           # Wrong separator in ID (use hyphen, not underscore)
```

### Insertion Syntax (in Markdown Content)

**Format**: `{{template:{category}.{id}}}`

**Examples**:
```markdown
## Warranty

{{template:warranty.as-is}}

This will be replaced during build with the template block content:
"We offer the work "as is" with no warranties..."
```

---

## Validation Rules

### 1. Reference Existence Validation

**When**: CMS save (client-side) + Build time (server-side)

**Rule**: Referenced template MUST exist in `content/template-blocks/{category}/{id}.md`

**Implementation**:
```typescript
async function validateTemplateReferences(license: LicenseContent): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  for (const ref of license.frontmatter.template_blocks) {
    const [category, id] = ref.split('.');

    if (!category || !id) {
      errors.push({
        field: 'template_blocks',
        message: `Invalid reference format: "${ref}". Use "{category}.{id}"`,
        severity: 'error'
      });
      continue;
    }

    const templatePath = `content/template-blocks/${category}/${id}.md`;
    const templateExists = await fileExists(templatePath);

    if (!templateExists) {
      errors.push({
        field: 'template_blocks',
        message: `Template not found: "${ref}" (expected at ${templatePath})`,
        severity: 'error'
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### 2. Category Validation

**Rule**: Category MUST be one of: `warranty`, `permission`, `condition`, `limitation`

**CMS Configuration** (`public/admin/config.yml`):
```yaml
collections:
  - name: licenses
    fields:
      - name: template_blocks
        label: "Template Blocks"
        widget: relation
        collection: template_blocks
        search_fields: ["id", "title", "category"]
        value_field: "{{category}}.{{id}}"
        display_fields: ["title", "category"]
```

### 3. Insertion Point Validation

**Rule**: Insertion markers `{{template:{ref}}}` in content MUST match frontmatter references

**Validation**:
```typescript
function validateInsertionPoints(license: LicenseContent): ValidationResult {
  const frontmatterRefs = new Set(license.frontmatter.template_blocks);
  const contentRefs = extractTemplateMarkers(license.content); // Parse {{template:...}}

  const errors: ValidationError[] = [];

  for (const ref of contentRefs) {
    if (!frontmatterRefs.has(ref)) {
      errors.push({
        field: 'content',
        message: `Template "${ref}" used in content but not declared in frontmatter`,
        severity: 'warning'  // Warning, not error (auto-add to frontmatter)
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## Build-Time Processing

### Template Injection

**Step 1**: Load template blocks during Astro build
```typescript
// src/utils/template-loader.ts
export async function loadTemplateBlock(ref: string): Promise<string> {
  const [category, id] = ref.split('.');
  const filePath = `content/template-blocks/${category}/${id}.md`;

  const template = await getEntry('template-blocks', `${category}/${id}`);
  if (!template) {
    throw new Error(`Template not found: ${ref}`);
  }

  return template.body; // Markdown content without frontmatter
}
```

**Step 2**: Replace insertion markers in license content
```typescript
// src/build/template-injector.ts
export async function injectTemplates(licenseContent: string, refs: string[]): Promise<string> {
  let processedContent = licenseContent;

  for (const ref of refs) {
    const marker = `{{template:${ref}}}`;
    const templateText = await loadTemplateBlock(ref);

    processedContent = processedContent.replace(
      new RegExp(escapeRegex(marker), 'g'),
      templateText
    );
  }

  return processedContent;
}
```

**Step 3**: Increment usage counter
```typescript
async function incrementUsageCount(ref: string): Promise<void> {
  const [category, id] = ref.split('.');
  const filePath = `content/template-blocks/${category}/${id}.md`;

  // Read frontmatter, increment usage_count, write back
  const template = await readFrontmatter(filePath);
  template.usage_count = (template.usage_count || 0) + 1;
  template.last_modified = new Date().toISOString().split('T')[0];

  await writeFrontmatter(filePath, template);
}
```

---

## Error Handling

### CMS Validation (Client-Side)

**Missing Template Warning**:
```yaml
Severity: ERROR (block save)
Message: "Template 'warranty.as-is' not found. Please create it or remove the reference."
Action: Prevent save until resolved
```

**Invalid Format Warning**:
```yaml
Severity: ERROR (block save)
Message: "Invalid template reference format: 'as-is'. Use '{category}.{id}' format."
Action: Prevent save until resolved
```

### Build-Time Validation (Server-Side)

**Missing Template Error**:
```bash
Error: Template injection failed for license 'MIT'
  Template 'warranty.as-is' not found at content/template-blocks/warranty/as-is.md

  Referenced in: content/licenses/permissive/mit.md
  Line: {{template:warranty.as-is}}

Build failed. Fix template references before deploying.
```

**Graceful Degradation** (Optional, for preview environments):
```typescript
// In preview mode only, replace missing templates with placeholder
if (process.env.PREVIEW_MODE === 'true') {
  const placeholder = `[Template: ${ref} - Not Found]`;
  processedContent = processedContent.replace(marker, placeholder);
} else {
  throw new Error(`Template not found: ${ref}`);
}
```

---

## Migration Strategy

### Scenario 1: Rename Template ID

**Before**:
```
File: content/template-blocks/warranty/as-is.md
ID: as-is
Used by: 12 licenses
```

**After**:
```
File: content/template-blocks/warranty/no-warranty.md
ID: no-warranty
```

**Migration Process**:

1. **Create migration manifest** (`migrations/rename-template.json`):
```json
{
  "migration_id": "001-rename-as-is-to-no-warranty",
  "date": "2026-02-15",
  "type": "template_rename",
  "changes": [
    {
      "old_ref": "warranty.as-is",
      "new_ref": "warranty.no-warranty",
      "affected_licenses": ["MIT", "Apache-2.0", "BSD-2-Clause", "..."]
    }
  ]
}
```

2. **Run migration script**:
```bash
bun run migrate:template-rename --manifest migrations/rename-template.json
```

**Script behavior**:
- Find all licenses referencing `warranty.as-is`
- Update frontmatter: `warranty.as-is` → `warranty.no-warranty`
- Update content markers: `{{template:warranty.as-is}}` → `{{template:warranty.no-warranty}}`
- Create Git commit with all changes
- Generate migration report

3. **Validate migration**:
```bash
bun run validate:templates
# Checks: All template references valid, no broken links
```

### Scenario 2: Merge Templates

**Before**:
```
warranty.as-is        (8 licenses)
warranty.no-warranty  (4 licenses)
```

**After**:
```
warranty.as-is        (12 licenses, merged content)
```

**Migration**:
```json
{
  "migration_id": "002-merge-warranty-templates",
  "type": "template_merge",
  "changes": [
    {
      "keep": "warranty.as-is",
      "deprecate": "warranty.no-warranty",
      "affected_licenses": ["MIT", "BSD-3-Clause"]
    }
  ]
}
```

### Scenario 3: Split Template

**Before**:
```
permission.use-distribute  (covers both use and distribution)
```

**After**:
```
permission.use
permission.distribute
```

**Migration**: Manual (requires editorial review of affected licenses)

---

## Testing Requirements

### Unit Tests

```typescript
describe('Template Reference Validation', () => {
  it('validates correct reference format', () => {
    expect(isValidReference('warranty.as-is')).toBe(true);
    expect(isValidReference('as-is')).toBe(false);
    expect(isValidReference('warranty/as-is')).toBe(false);
  });

  it('detects missing templates', async () => {
    const license = {
      frontmatter: { template_blocks: ['warranty.nonexistent'] },
      content: '...'
    };

    const result = await validateTemplateReferences(license);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('Template not found');
  });

  it('injects templates correctly', async () => {
    const content = 'Warranty: {{template:warranty.as-is}}';
    const refs = ['warranty.as-is'];

    const result = await injectTemplates(content, refs);
    expect(result).toContain('We offer the work "as is"');
    expect(result).not.toContain('{{template:');
  });
});
```

### Integration Tests

```typescript
describe('Template System End-to-End', () => {
  it('builds license with template injection', async () => {
    // Create test license with template reference
    await createLicense({
      id: 'test-license',
      template_blocks: ['warranty.as-is'],
      content: '## Warranty\n\n{{template:warranty.as-is}}'
    });

    // Build site
    await runAstroBuild();

    // Verify template was injected
    const builtContent = await readBuiltPage('licenses/test-license');
    expect(builtContent).toContain('We offer the work "as is"');
  });

  it('fails build on missing template', async () => {
    await createLicense({
      id: 'broken-license',
      template_blocks: ['warranty.nonexistent'],
      content: '{{template:warranty.nonexistent}}'
    });

    await expect(runAstroBuild()).rejects.toThrow('Template not found');
  });
});
```

---

## CMS Configuration

### Sveltia CMS Collection

**File**: `public/admin/config.yml`

```yaml
collections:
  - name: template_blocks
    label: "Template Blocks"
    folder: "content/template-blocks"
    create: true
    nested:
      depth: 2  # category/id structure
    fields:
      - { name: id, label: "ID", widget: string, pattern: ['^[a-z0-9-]+$', 'Use kebab-case'] }
      - { name: category, label: "Category", widget: select, options: ["warranty", "permission", "condition", "limitation"] }
      - { name: title, label: "Title", widget: string }
      - { name: description, label: "Description", widget: text }
      - { name: voice_tags, label: "Voice Tags", widget: list }
      - { name: body, label: "Content", widget: markdown }

  - name: licenses
    fields:
      - name: template_blocks
        label: "Template Blocks"
        widget: relation
        collection: template_blocks
        search_fields: ["title", "category", "id"]
        value_field: "{{category}}.{{id}}"
        display_fields: ["title", "({{category}})"]
        multiple: true
```

---

## Monitoring & Analytics

### Usage Tracking

**Metrics to track**:
1. Template block usage count (in frontmatter)
2. Most/least used templates
3. Orphaned templates (usage_count = 0)
4. Template reference errors during build

**Dashboard Query**:
```sql
-- Most used templates
SELECT id, category, title, usage_count
FROM template_blocks
ORDER BY usage_count DESC
LIMIT 10;

-- Orphaned templates (candidates for deprecation)
SELECT id, category, title
FROM template_blocks
WHERE usage_count = 0
  AND created_date < NOW() - INTERVAL '90 days';
```

---

## Related Contracts

- **astro-content-contract.md**: Content Collections schema definitions
- **cms-content-contract.md**: Sveltia CMS configuration
- **FR-003**: Template library requirement
- **FR-052**: Content validation requirement
- **T026-T032**: Template block implementation tasks

---

## Version History

- **v1.0** (2026-01-30): Initial template reference contract based on expert panel recommendations
